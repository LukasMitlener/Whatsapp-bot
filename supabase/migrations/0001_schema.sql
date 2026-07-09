-- WhatsApp AI Outreach — Imperium Finance
-- Core schema: contacts, conversations, messages

create table contacts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text not null unique,          -- E.164, např. +420608092412
  segment      text,                          -- retail | affluent | existing_client
  language     text not null default 'cs',    -- cs | en
  status       text not null default 'pending',
  opted_out_at timestamptz,
  created_at   timestamptz not null default now()
);
-- status: pending | contacted | replied | interested | opted_out | error

create table conversations (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references contacts(id),
  state          text not null default 'new',
  last_inbound_at timestamptz,                 -- klíč pro 24h okno
  outcome        text,                         -- interested | not_interested | opted_out | error
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- state: new | awaiting_reply | active | interested | handed_off | opted_out | closed

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id),
  contact_id      uuid not null references contacts(id),
  direction       text not null,               -- inbound | outbound
  wa_message_id   text unique,                    -- idempotence (dedup webhooků)
  type            text not null,               -- template | text
  template_name   text,
  body            text,
  status          text,                          -- queued|sent|delivered|read|failed|received
  error_code      text,
  error_detail    text,
  input_tokens    int,                           -- cost tracking (bonus)
  output_tokens   int,
  created_at      timestamptz not null default now()
);
