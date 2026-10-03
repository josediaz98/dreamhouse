-- DREAMHOUSE schema. Mirrors TABLES in src/lib/contract.ts.
-- Public read: properties, spec_fields. Everything else: service role only (server routes).

create extension if not exists pgcrypto;

create table public.properties (
  id           uuid primary key default gen_random_uuid(),
  apn          text,
  address      text not null,
  source_url   text not null unique,
  price_usd    numeric,
  acres        numeric,
  snapshot_at  timestamptz not null,
  is_fixture   boolean not null default false
);

create table public.spec_fields (
  property_id  uuid not null references public.properties (id) on delete cascade,
  key          text not null,
  value        jsonb,
  status       text not null check (status in ('known', 'unknown', 'conflict')),
  source_type  text check (source_type in ('listing', 'gis', 'manual', 'seller')),
  source_url   text,
  source_page  integer,
  source_label text,
  confidence   numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  note         text,
  extracted_at timestamptz not null default now(),
  primary key (property_id, key),
  -- an unknown field never carries a value
  check (status <> 'unknown' or value is null or value = 'null'::jsonb)
);

create table public.rules (
  id           text primary key,
  jurisdiction text not null,
  key          text not null,
  operator     text not null check (operator in ('<=', '>=', '==')),
  value        numeric not null,
  unit         text not null check (unit in ('ft', 'pct', 'sqft', 'none')),
  condition    text,
  source_doc   text not null,
  source_url   text,
  page         integer not null,
  source_label text not null
);

create table public.questions (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties (id) on delete cascade,
  field_key    text not null,
  text         text not null,
  status       text not null default 'open' check (status in ('open', 'answered')),
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index questions_property_idx on public.questions (property_id);

create table public.calls (
  id           uuid primary key default gen_random_uuid(),
  agent_id     text not null,
  tool         text not null,
  amount_usd   numeric not null default 0,
  payment_ref  text,
  ts           timestamptz not null default now()
);
create index calls_ts_idx on public.calls (ts desc);

-- RLS: anon can read properties and spec_fields; nothing else. Writes use the service role (bypasses RLS).
alter table public.properties  enable row level security;
alter table public.spec_fields enable row level security;
alter table public.rules       enable row level security;
alter table public.questions   enable row level security;
alter table public.calls       enable row level security;

create policy properties_public_read  on public.properties  for select to anon, authenticated using (true);
create policy spec_fields_public_read on public.spec_fields for select to anon, authenticated using (true);
-- Realtime applies RLS to postgres_changes, so the Front's anon subscription on questions needs a read policy.
create policy questions_public_read   on public.questions   for select to anon, authenticated using (true);

-- Realtime
alter publication supabase_realtime add table public.spec_fields;
alter publication supabase_realtime add table public.questions;

-- Seller answer: update the question and the matching spec_field in one transaction,
-- so a single Realtime commit refreshes the verdict.
create or replace function public.answer_question(p_question_id uuid, p_answer text, p_value jsonb, p_known boolean)
returns public.questions
language plpgsql
security invoker
as $$
declare
  q public.questions;
begin
  update public.questions
     set status = 'answered', answer = p_answer, answered_at = now()
   where id = p_question_id and status = 'open'
   returning * into q;
  if not found then
    raise exception 'question % not found or already answered', p_question_id using errcode = 'P0002';
  end if;

  insert into public.spec_fields (property_id, key, value, status, source_type, source_label, confidence, note, extracted_at)
  values (q.property_id, q.field_key, case when p_known then p_value else null end,
          case when p_known then 'known' else 'unknown' end, 'seller', 'Seller answer', null, p_answer, now())
  on conflict (property_id, key) do update
    set value = excluded.value, status = excluded.status, source_type = 'seller', source_url = null,
        source_page = null, source_label = excluded.source_label, confidence = null,
        note = excluded.note, extracted_at = now();
  return q;
end;
$$;
revoke all on function public.answer_question(uuid, text, jsonb, boolean) from public, anon, authenticated;
