-- KILIMO AI — reconcile agro_profiles with what the client expects, and stop
-- minting everyone as "verified".
--
-- (a) verification_status defaulted to 'verified' and the mint-agro-id function
--     inserted 'verified' — i.e. every account was labelled verified the moment
--     an id was minted, with no KYC. The schema's own comments say reviewers
--     later flip status to verified/rejected, and submit-verification flips it
--     to 'pending'. A "verified" flag nobody verified is fabricated data, so:
--       * default becomes 'unverified' (the client's AgroID type already has it)
--       * constrain to known states
--       * downgrade existing rows that were auto-'verified' without an approved
--         verification_requests row.
alter table public.agro_profiles
  alter column verification_status set default 'unverified';

update public.agro_profiles ap
   set verification_status = 'unverified'
 where ap.verification_status = 'verified'
   and not exists (
     select 1 from public.verification_requests vr
      where vr.user_id = ap.user_id and vr.status = 'verified'
   );

alter table public.agro_profiles
  add constraint agro_profiles_verification_status_check
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

-- (b) hooks/useAgroAuth.ts does `from('agro_profiles').select('*')` and casts
--     the row to the rich camelCase `AgroID` type, but the table only has
--     (user_id, agro_id, verification_status, created_at) — so agroId.id, name,
--     role, location, joinDate... all came back undefined. This RPC returns the
--     AgroID-shaped object built ONLY from data the backend really holds; it
--     omits `tier`, `mpesaLinked`, `biometricEnabled`, `nationalId`,
--     `tinNumber`, `certifications` because no server-side source exists for
--     them (client must default those locally). Returns NULL if the caller has
--     no minted Agro-ID yet.
create or replace function public.get_my_agro_id()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'id',                 ap.agro_id,
    'name',               fp.name,
    'role',               fp.role,
    'location',           fp.region,
    'joinDate',           ap.created_at,
    'phoneNumber',        nullif(u.phone, ''),
    'verificationStatus', case ap.verification_status
                            when 'rejected' then 'unverified'
                            else ap.verification_status
                          end
  )
  from public.agro_profiles ap
  join auth.users u on u.id = ap.user_id
  left join public.farmer_profiles fp on fp.user_id = ap.user_id
  where ap.user_id = auth.uid();
$$;

revoke all on function public.get_my_agro_id() from public, anon, authenticated;
grant execute on function public.get_my_agro_id() to authenticated, service_role;
