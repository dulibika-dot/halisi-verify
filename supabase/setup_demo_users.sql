-- =====================================================================
-- Link login accounts to their role.
--
-- 1. In Supabase: Authentication → Users → "Add user" → "Create new user"
--    create these two users (tick "Auto Confirm User"):
--        manufacturer@xyz.demo   (manufacturer for XYZ Ltd)
--        admin@halisi.demo       (administrator)
--    Choose your own strong passwords. You can use your own email
--    addresses instead — just change them below too.
-- 2. Run this file in the SQL Editor.
--
-- To add another manufacturer later: create the user, then copy the first
-- insert and change the email, name and manufacturer_id.
-- =====================================================================

insert into profiles (id, name, email, phone, role, manufacturer_id, title)
select id, 'Grace Wanjiku', email, '+254 712 000 101', 'manufacturer', 'm1', 'Quality Assurance Lead, XYZ Ltd'
from auth.users where email = 'manufacturer@xyz.demo'
on conflict (id) do update set
  name = excluded.name, role = excluded.role, manufacturer_id = excluded.manufacturer_id, title = excluded.title;

insert into profiles (id, name, email, phone, role, manufacturer_id, title)
select id, 'Daniel Kamau', email, '+254 700 000 900', 'admin', null, 'System Administrator'
from auth.users where email = 'admin@halisi.demo'
on conflict (id) do update set
  name = excluded.name, role = excluded.role, manufacturer_id = excluded.manufacturer_id, title = excluded.title;

-- Check: both rows should appear
select email, role, manufacturer_id from profiles;
