-- 004: one front-desk admin account (no staff accounts) and a 4-digit PIN for important actions.
ALTER TABLE users ADD COLUMN admin_pin_hash TEXT NULL;   -- bcrypt hash, never the PIN itself

-- Back to two roles. This stops with an error (changing nothing) if a staff account still exists.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','member'));
