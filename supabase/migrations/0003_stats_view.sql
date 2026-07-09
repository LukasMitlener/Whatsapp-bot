-- WhatsApp AI Outreach — Imperium Finance
-- Read-only stats view for scripts/stats.ts

create view stats_overview as
select
  count(*)                                          as osloveno,
  count(*) filter (where status = 'replied'
                    or status = 'interested')          as odpovedelo,
  count(*) filter (where status = 'interested')        as zajem,
  count(*) filter (where status = 'opted_out')         as odhlaseno,
  count(*) filter (where status = 'error')             as chyby
from contacts
where status <> 'pending';
