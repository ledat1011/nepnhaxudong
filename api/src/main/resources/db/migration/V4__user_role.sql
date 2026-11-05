-- Roles of the family accounts. OWNER ("Chủ") manages the accounts; MEMBER ("Người nhà") edits
-- content only. must_setup_totp is set when an owner switches off the two-factor login of someone
-- (for example after a lost phone): that person must set it up again after the next sign-in.
alter table app_user add column role text not null default 'MEMBER';
alter table app_user add constraint app_user_role_check check (role in ('OWNER', 'MEMBER'));
alter table app_user add column must_setup_totp boolean not null default false;

-- The first account is the admin created at bootstrap: it becomes the owner.
update app_user set role = 'OWNER' where id = (select min(id) from app_user);

-- At least one enabled owner must exist. When the first account is disabled, the oldest enabled
-- account becomes an owner too.
update app_user set role = 'OWNER'
 where id = (select min(id) from app_user where enabled)
   and not exists (select 1 from app_user where role = 'OWNER' and enabled);
