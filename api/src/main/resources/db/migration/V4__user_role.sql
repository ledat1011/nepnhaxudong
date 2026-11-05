-- Roles of the family accounts. OWNER ("Chủ") manages the accounts; MEMBER ("Người nhà") edits
-- content only. must_setup_totp is set when an owner switches off the two-factor login of someone
-- (for example after a lost phone): that person must set it up again after the next sign-in.
alter table app_user add column role text not null default 'MEMBER';
alter table app_user add constraint app_user_role_check check (role in ('OWNER', 'MEMBER'));
alter table app_user add column must_setup_totp boolean not null default false;
-- Set together with must_setup_totp: after an owner switched off someone's two-factor login, only an
-- owner may switch it off again (the user cannot drop it with a code).
alter table app_user add column totp_required boolean not null default false;
-- The last TOTP time step used to sign in. A code of that step or an earlier one is refused (no replay).
alter table app_user add column totp_last_step bigint;

-- The first account is the admin created at bootstrap: it becomes the owner.
update app_user set role = 'OWNER' where id = (select min(id) from app_user);

-- At least one enabled owner must exist. When the first account is disabled, the oldest enabled
-- account becomes an owner too. When every account is disabled, no row matches and no enabled owner
-- exists: nobody can sign in anyway, and an operator must enable an account and set role = 'OWNER'
-- in SQL.
update app_user set role = 'OWNER'
 where id = (select min(id) from app_user where enabled)
   and not exists (select 1 from app_user where role = 'OWNER' and enabled);
