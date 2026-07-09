-- WhatsApp AI Outreach — Imperium Finance
-- RLS: enable on all tables, no anon/public policies → access only via service_role
-- (service_role bypasses RLS entirely; anon/public keys therefore cannot reach PII/consent data)

alter table contacts      enable row level security;
alter table conversations enable row level security;
alter table messages      enable row level security;
