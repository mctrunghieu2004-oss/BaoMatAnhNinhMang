CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(50)  UNIQUE NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  role            VARCHAR(10)  NOT NULL CHECK (role IN ('STUDENT','LECTURER','ADMIN')),
  password_hash   TEXT         NOT NULL,
  mfa_secret      TEXT,
  mfa_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
  last_otp        VARCHAR(10),
  last_otp_at     TIMESTAMPTZ,
  failed_attempts INT          NOT NULL DEFAULT 0,
  mfa_failed      INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  lecturer_id INT NOT NULL REFERENCES users(id)
);

CREATE TABLE enrollments (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id),
  student_id INT NOT NULL REFERENCES users(id),
  UNIQUE (course_id, student_id)
);

CREATE TABLE grades (
  enrollment_id INT PRIMARY KEY REFERENCES enrollments(id),
  score         NUMERIC(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  updated_by    INT NOT NULL REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INT  NOT NULL REFERENCES users(id),
  fingerprint   CHAR(64) NOT NULL,
  mfa_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  revoke_reason TEXT
);

-- detail la TEXT chu khong phai JSONB: JSONB sap xep lai key lam hong hash-chain
CREATE TABLE audit_log (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL,
  actor_id  INT,
  action    VARCHAR(40) NOT NULL,
  target    VARCHAR(100),
  detail    TEXT,
  ip        VARCHAR(64),
  severity  VARCHAR(10) NOT NULL DEFAULT 'INFO',
  prev_hash CHAR(64) NOT NULL,
  hash      CHAR(64) NOT NULL
);
CREATE INDEX idx_audit_action_ts ON audit_log(action, ts);
CREATE INDEX idx_audit_target ON audit_log(target);
