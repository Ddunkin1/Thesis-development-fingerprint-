-- 001_init: core schema for Chaq Gym Attendance.
-- All "day" logic uses Asia/Manila; timestamps are TIMESTAMPTZ (UTC) and dates are DATE (Manila calendar day).

CREATE TABLE users (
  id                   BIGSERIAL PRIMARY KEY,
  full_name            TEXT        NOT NULL,
  username             TEXT        NOT NULL UNIQUE,          -- stored lowercase
  password_hash        TEXT        NOT NULL,                 -- bcrypt, never plain text
  role                 TEXT        NOT NULL CHECK (role IN ('admin','member')),
  must_change_password BOOLEAN     NOT NULL DEFAULT FALSE,
  consent_given        BOOLEAN     NOT NULL DEFAULT FALSE,   -- RA 10173 data privacy consent
  leaderboard_opt_out  BOOLEAN     NOT NULL DEFAULT FALSE,   -- member may hide from the leaderboard
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates only (never fingerprint images).
CREATE TABLE fingerprints (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finger_index SMALLINT NOT NULL DEFAULT 0,                  -- 0 = primary, 1 = backup
  template     BYTEA    NOT NULL,
  UNIQUE (user_id, finger_index)
);

CREATE TABLE memberships (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT   NOT NULL DEFAULT 'monthly',
  start_date  DATE   NOT NULL,
  expiry_date DATE   NOT NULL,
  status      TEXT   NOT NULL DEFAULT 'active'               -- cached label; real status is derived from expiry_date
);
CREATE INDEX memberships_user_idx ON memberships(user_id);

CREATE TABLE attendance (
  id        BIGSERIAL PRIMARY KEY,
  user_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in  TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ NULL
);
CREATE INDEX attendance_check_in_idx ON attendance(check_in);
-- Database-level guard: at most one check-in per member per Manila calendar day.
CREATE UNIQUE INDEX attendance_one_per_day
  ON attendance (user_id, ((check_in AT TIME ZONE 'Asia/Manila')::date));

CREATE TABLE walkin_sessions (
  id                BIGSERIAL PRIMARY KEY,
  full_name         TEXT          NOT NULL,
  session_date      DATE          NOT NULL,
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  converted_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX walkin_date_idx ON walkin_sessions(session_date);

CREATE TABLE payments (
  id        BIGSERIAL PRIMARY KEY,
  user_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  walkin_id BIGINT NULL REFERENCES walkin_sessions(id) ON DELETE SET NULL,
  type      TEXT   NOT NULL CHECK (type IN ('monthly','walkin')),
  amount    NUMERIC(10,2) NOT NULL,
  paid_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX payments_paid_at_idx ON payments(paid_at);

CREATE TABLE streaks (
  user_id               BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak        INT     NOT NULL DEFAULT 0,
  longest_streak        INT     NOT NULL DEFAULT 0,
  last_attendance_date  DATE    NULL,
  freeze_used_this_week BOOLEAN NOT NULL DEFAULT FALSE,
  freeze_week_start     DATE    NULL                         -- Monday of the week the freeze flag refers to
);

CREATE TABLE badges (
  id        BIGSERIAL PRIMARY KEY,
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT   NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);

CREATE TABLE scan_log (
  id              BIGSERIAL PRIMARY KEY,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  success         BOOLEAN     NOT NULL,
  matched_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX scan_log_scanned_at_idx ON scan_log(scanned_at);
