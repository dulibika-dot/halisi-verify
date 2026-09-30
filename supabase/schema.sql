-- =====================================================================
-- Halisi Verify — Supabase database schema
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Then run seed.sql (demo data) and setup_demo_users.sql (logins).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists manufacturers (
  id               text primary key default gen_random_uuid()::text,
  name             text not null,
  registration_no  text not null default '',
  contact_person   text not null default '',
  email            text not null default '',
  phone            text not null default '',
  county           text not null default '',
  address          text not null default '',
  industry         text not null default '',
  status           text not null default 'pending' check (status in ('active', 'pending', 'suspended')),
  joined_at        timestamptz not null default now()
);

-- One row per login. Linked to Supabase Auth users.
create table if not exists profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  name             text not null,
  email            text not null,
  phone            text,
  role             text not null check (role in ('manufacturer', 'admin')),
  manufacturer_id  text references manufacturers (id),
  title            text
);

create table if not exists products (
  id               text primary key default gen_random_uuid()::text,
  manufacturer_id  text not null references manufacturers (id),
  name             text not null,
  category         text not null,
  description      text not null default '',
  sku              text not null default '',
  status           text not null default 'active' check (status in ('active', 'discontinued')),
  created_at       timestamptz not null default now()
);

create table if not exists batches (
  id                  text primary key default gen_random_uuid()::text,
  product_id          text not null references products (id),
  manufacturer_id     text not null references manufacturers (id),
  batch_number        text not null,
  quantity            integer not null check (quantity > 0),
  manufacturing_date  timestamptz not null,
  expiry_date         timestamptz not null,
  codes_generated     integer not null default 0,
  code_status         text not null default 'generated' check (code_status in ('generated', 'generating', 'failed')),
  code_first          text,
  code_last           text,
  status              text not null default 'active' check (status in ('active', 'pending', 'recalled', 'expired')),
  created_at          timestamptz not null default now()
);
create unique index if not exists batches_unique_number on batches (manufacturer_id, lower(batch_number));

create table if not exists verification_codes (
  code                text primary key check (code ~ '^[0-9]{9}$'),
  batch_id            text not null references batches (id),
  product_id          text not null references products (id),
  manufacturer_id     text not null references manufacturers (id),
  status              text not null default 'active' check (status in ('active', 'deactivated')),
  -- admin decision on a suspicious code (null = decided automatically by the count)
  review_status       text check (review_status in ('investigating', 'blocked', 'normal')),
  verification_count  integer not null default 0,
  created_at          timestamptz not null default now(),
  last_verified_at    timestamptz
);
create index if not exists codes_by_manufacturer on verification_codes (manufacturer_id);
create index if not exists codes_by_count on verification_codes (verification_count);

-- Every check a customer makes (including codes that don't exist, so no foreign key on code)
create table if not exists verifications (
  id               bigint generated always as identity primary key,
  code             text not null,
  product_id       text references products (id),
  batch_id         text references batches (id),
  manufacturer_id  text references manufacturers (id),
  phone            text not null,          -- stored masked, e.g. 0712 *** 678
  location         text not null default 'Unknown',
  created_at       timestamptz not null default now(),
  result           text not null check (result in ('verified', 'suspicious', 'invalid')),
  count_at_time    integer not null default 1,
  channel          text not null default 'sms' check (channel in ('sms', 'simulator'))
);
create index if not exists verifications_by_time on verifications (created_at desc);
create index if not exists verifications_by_code on verifications (code);
create index if not exists verifications_by_manufacturer on verifications (manufacturer_id);

create sequence if not exists report_ref_seq start 2641;

create table if not exists reports (
  id               text primary key default gen_random_uuid()::text,
  reference        text not null unique default ('CR-' || lpad(nextval('report_ref_seq')::text, 5, '0')),
  code             text not null,
  product_id       text references products (id),
  product_name     text not null default 'Unknown product',
  manufacturer_id  text references manufacturers (id),
  reason           text not null default 'Other',
  description      text not null default '',
  location         text not null default 'Unknown',
  reporter_phone   text not null default '',
  created_at       timestamptz not null default now(),
  status           text not null default 'pending' check (status in ('pending', 'investigating', 'confirmed', 'resolved')),
  notes            text[] not null default '{}'
);

-- Exactly one settings row (id = 1)
create table if not exists settings (
  id                     integer primary key default 1 check (id = 1),
  suspicious_threshold   integer not null default 3,
  high_risk_threshold    integer not null default 20,
  sms_shortcode          text not null default '22384',
  verify_keyword         text not null default 'VERIFY',
  report_keyword         text not null default 'REPORT',
  auto_flag_suspicious   boolean not null default true,
  notify_manufacturers   boolean not null default true,
  email_alerts           boolean not null default false,
  data_retention_days    integer not null default 365
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Helpers used by the security rules
-- ---------------------------------------------------------------------

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function my_manufacturer_id() returns text
language sql stable security definer set search_path = public as $$
  select manufacturer_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Row Level Security: manufacturers only see their own rows, admins see everything.
-- Customers (not logged in) can read nothing except the public settings.
-- ---------------------------------------------------------------------

alter table manufacturers      enable row level security;
alter table profiles           enable row level security;
alter table products           enable row level security;
alter table batches            enable row level security;
alter table verification_codes enable row level security;
alter table verifications      enable row level security;
alter table reports            enable row level security;
alter table settings           enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select to authenticated using (id = auth.uid() or is_admin());

drop policy if exists "read manufacturers" on manufacturers;
create policy "read manufacturers" on manufacturers for select to authenticated
  using (is_admin() or id = my_manufacturer_id());
drop policy if exists "update manufacturers" on manufacturers;
create policy "update manufacturers" on manufacturers for update to authenticated
  using (is_admin() or id = my_manufacturer_id()) with check (is_admin() or id = my_manufacturer_id());

drop policy if exists "read products" on products;
create policy "read products" on products for select to authenticated
  using (is_admin() or manufacturer_id = my_manufacturer_id());

drop policy if exists "read batches" on batches;
create policy "read batches" on batches for select to authenticated
  using (is_admin() or manufacturer_id = my_manufacturer_id());

drop policy if exists "read codes" on verification_codes;
create policy "read codes" on verification_codes for select to authenticated
  using (is_admin() or manufacturer_id = my_manufacturer_id());
drop policy if exists "update codes" on verification_codes;
create policy "update codes" on verification_codes for update to authenticated
  using (is_admin() or manufacturer_id = my_manufacturer_id()) with check (is_admin() or manufacturer_id = my_manufacturer_id());

drop policy if exists "read verifications" on verifications;
create policy "read verifications" on verifications for select to authenticated
  using (is_admin() or manufacturer_id = my_manufacturer_id());

drop policy if exists "read reports" on reports;
create policy "read reports" on reports for select to authenticated
  using (is_admin() or manufacturer_id = my_manufacturer_id());
drop policy if exists "admin updates reports" on reports;
create policy "admin updates reports" on reports for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "read settings" on settings;
create policy "read settings" on settings for select to anon, authenticated using (true);
drop policy if exists "admin updates settings" on settings;
create policy "admin updates settings" on settings for update to authenticated using (is_admin()) with check (is_admin());

-- Manufacturers may edit their profile but not their approval status
create or replace function guard_manufacturer_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and (new.status is distinct from old.status or new.registration_no is distinct from old.registration_no) then
    raise exception 'Only an administrator can change status or registration number';
  end if;
  return new;
end $$;
drop trigger if exists guard_manufacturer_update on manufacturers;
create trigger guard_manufacturer_update before update on manufacturers
  for each row when (auth.uid() is not null) execute function guard_manufacturer_update();

-- Manufacturers may only activate/deactivate their codes; counts and admin reviews are protected
create or replace function guard_code_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- process_sms() sets this flag so SMS checks can update the count
  if current_setting('halisi.internal', true) = 'on' then
    return new;
  end if;
  if not is_admin() and (
       new.review_status is distinct from old.review_status
    or new.verification_count is distinct from old.verification_count
    or new.batch_id is distinct from old.batch_id
    or new.manufacturer_id is distinct from old.manufacturer_id) then
    raise exception 'Manufacturers can only activate or deactivate their codes';
  end if;
  return new;
end $$;
drop trigger if exists guard_code_update on verification_codes;
create trigger guard_code_update before update on verification_codes
  for each row when (auth.uid() is not null) execute function guard_code_update();

-- ---------------------------------------------------------------------
-- Code generation
-- ---------------------------------------------------------------------

-- Cryptographically random 9-digit code (never starts with 0)
create or replace function generate_code() returns text
language sql volatile set search_path = public, extensions as $$
  select (100000000 + (('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 900000000))::text;
$$;

-- Called by the Manufacturer App's "Create Product Batch" form
create or replace function create_product_batch(
  p_product_name       text,
  p_category           text,
  p_description        text,
  p_batch_number       text,
  p_quantity           integer,
  p_manufacturing_date date,
  p_expiry_date        date
) returns batches
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_mid     text := my_manufacturer_id();
  v_status  text;
  v_product products;
  v_batch   batches;
  v_made    integer := 0;
  v_rows    integer;
begin
  if v_mid is null then
    raise exception 'Only manufacturer accounts can create batches';
  end if;
  select status into v_status from manufacturers where id = v_mid;
  if v_status <> 'active' then
    raise exception 'Your manufacturer account is %; an administrator must activate it first', v_status;
  end if;
  if coalesce(length(trim(p_product_name)), 0) < 3 then raise exception 'Enter a product name'; end if;
  if p_quantity < 1 or p_quantity > 10000 then
    raise exception 'Quantity must be between 1 and 10,000 units in this prototype';
  end if;
  if p_expiry_date <= p_manufacturing_date then raise exception 'Expiry date must be after the manufacturing date'; end if;
  if exists (select 1 from batches where manufacturer_id = v_mid and lower(batch_number) = lower(trim(p_batch_number))) then
    raise exception 'Batch number % already exists.', upper(trim(p_batch_number));
  end if;

  -- Re-use the product if it already exists, otherwise register it
  select * into v_product from products
   where manufacturer_id = v_mid and lower(name) = lower(trim(p_product_name)) limit 1;
  if not found then
    insert into products (manufacturer_id, name, category, description, sku)
    values (v_mid, trim(p_product_name), p_category, trim(coalesce(p_description, '')),
            left(regexp_replace(upper(trim(p_product_name)), '[^A-Z0-9]+', '-', 'g'), 14))
    returning * into v_product;
  end if;

  insert into batches (product_id, manufacturer_id, batch_number, quantity, manufacturing_date, expiry_date, codes_generated, code_status)
  values (v_product.id, v_mid, upper(trim(p_batch_number)), p_quantity, p_manufacturing_date, p_expiry_date, p_quantity, 'generated')
  returning * into v_batch;

  -- One unique code per unit (retry the rare duplicates)
  while v_made < p_quantity loop
    insert into verification_codes (code, batch_id, product_id, manufacturer_id)
    select distinct generate_code(), v_batch.id, v_product.id, v_mid
      from generate_series(1, p_quantity - v_made)
    on conflict (code) do nothing;
    get diagnostics v_rows = row_count;
    v_made := v_made + v_rows;
  end loop;

  update batches
     set code_first = (select min(code) from verification_codes where batch_id = v_batch.id),
         code_last  = (select max(code) from verification_codes where batch_id = v_batch.id)
   where id = v_batch.id
  returning * into v_batch;
  return v_batch;
end $$;

revoke all on function create_product_batch(text, text, text, text, integer, date, date) from public, anon;
grant execute on function create_product_batch(text, text, text, text, integer, date, date) to authenticated;

-- ---------------------------------------------------------------------
-- THE SMS LOGIC — one function used by BOTH the real SMS gateway
-- (Edge Function "sms-incoming") and the SMS simulator page.
--   "VERIFY 839274615"            → verify a code
--   "VERIFY 839274615 Mombasa"    → verify and record the town
--   "839274615"                   → same as VERIFY
--   "REPORT 839274615 <reason>"   → report a counterfeit
-- Returns JSON: { kind: 'verification' | 'report' | 'help', ... }
-- ---------------------------------------------------------------------

create or replace function mask_phone(p text) returns text
language sql immutable as $$
  select case
    when p like '%*%' then p
    when length(regexp_replace(p, '\D', '', 'g')) < 7 then p
    else (
      with d as (select regexp_replace(regexp_replace(p, '\D', '', 'g'), '^254', '0') as n)
      select left(n, 4) || ' *** ' || right(n, 3) from d
    )
  end;
$$;

create or replace function process_sms(
  p_message  text,
  p_phone    text,
  p_location text default null,
  p_channel  text default 'simulator'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s          settings;
  v_text     text := upper(regexp_replace(trim(coalesce(p_message, '')), '\s+', ' ', 'g'));
  v_phone    text := mask_phone(coalesce(p_phone, 'unknown'));
  -- only the Edge Function (service role) may log a check as a real SMS
  v_channel  text := case when p_channel = 'sms' and coalesce(auth.role(), '') = 'service_role' then 'sms' else 'simulator' end;
  m          text[];
  v_code     text;
  v_location text;
  v_count    integer;
  v_result   text;
  c          verification_codes;
  v_product  products;
  v_mfr      text;
  v_batch    batches;
  v_details  jsonb;
  v_report   reports;
begin
  select * into s from settings where id = 1;
  perform set_config('halisi.internal', 'on', true);  -- allows the count update (see guard_code_update)

  -- Basic abuse protection
  if (select count(*) from verifications where phone = v_phone and created_at > now() - interval '1 minute') >= 10
     or (v_channel = 'simulator' and (select count(*) from verifications where channel = 'simulator' and created_at > now() - interval '1 minute') >= 120) then
    return jsonb_build_object('kind', 'help', 'replyText', 'Halisi: Too many requests. Please wait a minute and try again.');
  end if;

  -- ---------- VERIFY ----------
  m := regexp_match(v_text, '^(?:' || s.verify_keyword || ' )?([0-9]{6,12})(?: (.+))?$');
  if m is not null then
    v_code := m[1];
    v_location := coalesce(nullif(trim(p_location), ''), initcap(lower(m[2])), 'Unknown');

    select * into c from verification_codes where code = v_code for update;

    -- 1. Code does not exist → INVALID
    if not found then
      select count(*) + 1 into v_count from verifications where code = v_code;
      insert into verifications (code, phone, location, result, count_at_time, channel)
      values (v_code, v_phone, v_location, 'invalid', v_count, v_channel);
      return jsonb_build_object('kind', 'verification', 'data', jsonb_build_object(
        'result', 'invalid', 'code', v_code, 'verificationCount', v_count,
        'location', v_location, 'timestamp', now(),
        'replyText', format('Halisi: INVALID. Code %s is not registered. This product may be FAKE. Do not use it. Send %s %s <reason> to report.',
                            v_code, s.report_keyword, v_code)));
    end if;

    select * into v_product from products where id = c.product_id;
    select name into v_mfr from manufacturers where id = c.manufacturer_id;
    select * into v_batch from batches where id = c.batch_id;
    v_details := jsonb_build_object(
      'product', jsonb_build_object('name', v_product.name, 'category', v_product.category),
      'manufacturer', v_mfr, 'batchNumber', v_batch.batch_number, 'expiryDate', v_batch.expiry_date);

    -- 2. Deactivated (recalled or blocked) → warn
    if c.status = 'deactivated' then
      insert into verifications (code, product_id, batch_id, manufacturer_id, phone, location, result, count_at_time, channel)
      values (v_code, c.product_id, c.batch_id, c.manufacturer_id, v_phone, v_location, 'invalid', c.verification_count + 1, v_channel);
      return jsonb_build_object('kind', 'verification', 'data', v_details || jsonb_build_object(
        'result', 'deactivated', 'code', v_code, 'verificationCount', c.verification_count,
        'location', v_location, 'timestamp', now(),
        'replyText', format('Halisi: WARNING. Code %s (%s) has been DEACTIVATED by the manufacturer or regulator. Do not use this product.',
                            v_code, v_product.name)));
    end if;

    -- 3. Genuine code → count it; too many checks = suspicious (probably copied)
    update verification_codes
       set verification_count = verification_count + 1, last_verified_at = now()
     where code = v_code
    returning verification_count into v_count;
    v_result := case when v_count > s.suspicious_threshold then 'suspicious' else 'verified' end;

    insert into verifications (code, product_id, batch_id, manufacturer_id, phone, location, result, count_at_time, channel)
    values (v_code, c.product_id, c.batch_id, c.manufacturer_id, v_phone, v_location, v_result, v_count, v_channel);

    return jsonb_build_object('kind', 'verification', 'data', v_details || jsonb_build_object(
      'result', v_result, 'code', v_code, 'verificationCount', v_count,
      'location', v_location, 'timestamp', now(),
      'replyText', case when v_result = 'suspicious'
        then format('Halisi: CAUTION. Code %s for %s has been checked %s times. This may be a COPIED code on a counterfeit product. Send %s %s <reason> to report.',
                    v_code, v_product.name, v_count, s.report_keyword, v_code)
        else format('Halisi: GENUINE. %s, Batch %s, by %s. Expiry %s. Thank you for verifying.',
                    v_product.name, v_batch.batch_number, v_mfr, to_char(v_batch.expiry_date, 'DD Mon YYYY'))
      end));
  end if;

  -- ---------- REPORT ----------
  m := regexp_match(trim(coalesce(p_message, '')), '^' || s.report_keyword || '\s+([0-9]{6,12})\s*(.*)$', 'i');
  if m is not null then
    v_code := m[1];
    select * into c from verification_codes where code = v_code;
    select * into v_product from products where id = c.product_id;
    insert into reports (code, product_id, product_name, manufacturer_id, reason, description, location, reporter_phone)
    values (v_code, v_product.id, coalesce(v_product.name, 'Unknown product'), v_product.manufacturer_id,
            coalesce(nullif(initcap(left(trim(m[2]), 60)), ''), 'Other'),
            coalesce(nullif(trim(m[2]), ''), 'Reported via SMS without details.'),
            coalesce(nullif(trim(p_location), ''), 'Unknown'), v_phone)
    returning * into v_report;
    return jsonb_build_object('kind', 'report', 'data', jsonb_build_object(
      'reference', v_report.reference,
      'replyText', format('Halisi: Thank you. Your report %s for code %s has been received and will be investigated.', v_report.reference, v_code)));
  end if;

  -- ---------- anything else ----------
  return jsonb_build_object('kind', 'help', 'replyText',
    format('Halisi: Message not understood. To check a product send %s <code>. To report a fake send %s <code> <reason>.',
           s.verify_keyword, s.report_keyword));
end $$;

-- The simulator page (anyone with the link) and the Edge Function may call it
revoke all on function process_sms(text, text, text, text) from public;
grant execute on function process_sms(text, text, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Hardening (from the Supabase security advisor)
-- ---------------------------------------------------------------------
alter function mask_phone(text) set search_path = public;
-- trigger functions never need to be called directly
revoke execute on function guard_code_update() from public, anon, authenticated;
revoke execute on function guard_manufacturer_update() from public, anon, authenticated;
-- used by the security rules for signed-in users only
revoke execute on function is_admin() from public, anon;
revoke execute on function my_manufacturer_id() from public, anon;
revoke execute on function generate_code() from public, anon, authenticated;
