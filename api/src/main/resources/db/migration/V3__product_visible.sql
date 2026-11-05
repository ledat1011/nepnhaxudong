-- The "Hiện trên web" switch of a product (decision 0010, item 2).
-- The products that exist now are on the website, so they get true. After that the default is
-- false: a new product stays hidden until someone in the family turns the switch on.
alter table product add column visible boolean not null default true;
alter table product alter column visible set default false;
