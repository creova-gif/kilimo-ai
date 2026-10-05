-- KILIMO AI — KYC / business & personal verification requests.
--
-- Backs the submit-verification edge function. A user submits their documents
-- (TIN, registration number, national ID, etc.); the request is stored for
-- manual/automated review and their agro_profiles.verification_status flips to
-- 'pending'. Reviewers (service role / admin) later set it to verified/rejected.

create table if not exists public.verification_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  verification_type  text not null check (verification_type in ('personal', 'business')),
  payload            jsonb not null default '{}'::jsonb,   -- submitted fields (tin, reg no, etc.)
  status             text not null default 'pending'
                       check (status in ('pending', 'verified', 'rejected')),
  reviewer_note      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists verification_requests_user_idx
  on public.verification_requests (user_id, created_at desc);

alter table public.verification_requests enable row level security;

-- A user may read their own requests. Inserts are performed by the
-- submit-verification function using the service role (bypasses RLS), so no
-- client insert/update policy is granted — clients can never self-approve.
create policy "own requests: select" on public.verification_requests
  for select using (auth.uid() = user_id);
