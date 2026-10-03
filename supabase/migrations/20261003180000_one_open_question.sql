-- ask_seller is idempotent: at most one open question per (property, field).
create unique index if not exists questions_one_open_per_field
  on public.questions (property_id, field_key)
  where status = 'open';
