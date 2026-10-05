-- Per-user spend guards for openai-proxy / rag-chat and sms-send.
--
-- The edge functions claim a slot through these RPCs before calling OpenAI
-- or Africa's Talking. Limits are passed in by the function (see
-- supabase/functions/_shared/aiPolicy.ts and smsPolicy.ts):
--   ai:    allow while already-used < limit  (aiCallAllowed)
--   sms:   allow while sent-in-window < limit (smsSendAllowed)
--
-- Both functions are security definer and executable by service_role only.
-- A signed-in user must not be able to increment another user's counters.

create table if not exists public.ai_usage_daily (
  user_id     uuid not null references auth.users (id) on delete cascade,
  usage_date  date not null,
  action      text not null check (action in ('chat', 'vision', 'transcribe', 'rag')),
  call_count  integer not null default 0 check (call_count >= 0),
  primary key (user_id, usage_date, action)
);

create table if not exists public.sms_dispatches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists sms_dispatches_user_created_idx
  on public.sms_dispatches (user_id, created_at desc);

alter table public.ai_usage_daily enable row level security;
alter table public.sms_dispatches enable row level security;

revoke all on table public.ai_usage_daily from anon, authenticated;
revoke all on table public.sms_dispatches from anon, authenticated;
grant all on table public.ai_usage_daily to service_role;
grant all on table public.sms_dispatches to service_role;

create or replace function public.claim_ai_call(
  p_user_id uuid,
  p_action text,
  p_max integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if p_user_id is null or p_max < 1 then
    return false;
  end if;
  if p_action not in ('chat', 'vision', 'transcribe', 'rag') then
    return false;
  end if;

  with upsert as (
    insert into public.ai_usage_daily as u (user_id, usage_date, action, call_count)
    values (p_user_id, (timezone('utc', now()))::date, p_action, 1)
    on conflict (user_id, usage_date, action)
    do update set call_count = u.call_count + 1
    where u.call_count < p_max
    returning call_count
  )
  select call_count into n from upsert;

  return n is not null;
end;
$$;

create or replace function public.claim_sms_send(
  p_user_id uuid,
  p_window_seconds integer,
  p_max integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if p_user_id is null or p_max < 1 or p_window_seconds < 1 then
    return false;
  end if;

  -- Serialize claims for this user so two overlapping requests can't both pass.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select count(*)::integer into n
  from public.sms_dispatches
  where user_id = p_user_id
    and created_at > now() - make_interval(secs => p_window_seconds);

  if n >= p_max then
    return false;
  end if;

  insert into public.sms_dispatches (user_id) values (p_user_id);
  return true;
end;
$$;

revoke all on function public.claim_ai_call(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.claim_sms_send(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_call(uuid, text, integer) to service_role;
grant execute on function public.claim_sms_send(uuid, integer, integer) to service_role;
