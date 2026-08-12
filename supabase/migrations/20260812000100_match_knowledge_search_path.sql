-- KILIMO AI — pin match_knowledge's search_path.
--
-- A mutable search_path on a SECURITY-relevant function lets a caller who can
-- create objects in a schema earlier in their session's search_path shadow
-- the unqualified table reference and hijack the function's behavior. This
-- function only ever queries public.knowledge_base (already schema-qualified
-- in the function body), so pinning search_path is a safe, no-behavior-change
-- hardening step.
alter function public.match_knowledge(vector, float, int) set search_path = public;
