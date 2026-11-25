-- 003: staff accounts, consent records, manual check-in, replay protection for signed scans, activity log.
-- Everything here only ADDS (no existing data is removed).

-- Staff accounts: a third role with fewer permissions than the admin.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','staff','member'));

-- Consent record (RA 10173): when it was given, which wording, and when it was withdrawn.
ALTER TABLE users ADD COLUMN consent_at           TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN consent_version      TEXT        NULL;
ALTER TABLE users ADD COLUMN consent_withdrawn_at TIMESTAMPTZ NULL;
-- Members registered before this column existed ticked the (required) consent box when they registered.
UPDATE users SET consent_at = created_at, consent_version = 'before-records'
 WHERE role = 'member' AND consent_given = true;

-- How a visit was recorded. 'manual' = typed in by staff because the finger could not be read.
ALTER TABLE attendance ADD COLUMN method        TEXT   NOT NULL DEFAULT 'fingerprint' CHECK (method IN ('fingerprint','manual'));
ALTER TABLE attendance ADD COLUMN manual_reason TEXT   NULL;
ALTER TABLE attendance ADD COLUMN recorded_by   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

-- Each signed scan result from the bridge carries a random number; it may be used only once.
ALTER TABLE scan_log ADD COLUMN nonce TEXT NULL;
CREATE UNIQUE INDEX scan_log_nonce_unique ON scan_log(nonce);

-- Who did what. The name is copied so the record stays readable if the account is removed.
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT   NOT NULL,
  action     TEXT   NOT NULL,
  target     TEXT   NULL,
  detail     TEXT   NULL
);
CREATE INDEX audit_log_at_idx ON audit_log(at DESC);
