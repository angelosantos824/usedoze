insert into admin_profiles (id, name, email, role, status)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', 'Administrador DOZEDEV'),
  u.email,
  'super_admin',
  'active'
from auth.users u
where lower(u.email) = 'admin@dozedev.pt'
on conflict (email) do update
set
  id = excluded.id,
  name = coalesce(admin_profiles.name, excluded.name),
  email = excluded.email,
  role = 'super_admin',
  status = 'active',
  updated_at = now();
