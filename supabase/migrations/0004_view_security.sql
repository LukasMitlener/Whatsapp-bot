-- WhatsApp AI Outreach — Imperium Finance
-- Fix: views default to the owner's privileges and BYPASS RLS on underlying
-- tables (classic "security definer view" issue). Combined with Postgres/
-- Supabase default grants to anon/authenticated on new public objects, this
-- would let the anon key read aggregate contact data through stats_overview
-- even though RLS blocks direct access to contacts/conversations/messages.
--
-- Fix: force the view to run with the *querying* role's privileges (so it is
-- subject to RLS like everything else), and revoke the default anon/
-- authenticated grants so access is service_role-only, matching the RLS
-- policy comment in 0002_rls.sql.

alter view stats_overview set (security_invoker = true);

revoke all on contacts, conversations, messages, stats_overview
  from anon, authenticated;
