#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE app_user LOGIN PASSWORD '${APP_DB_PASSWORD}';
  REVOKE ALL ON DATABASE securegrade FROM PUBLIC;
  GRANT CONNECT ON DATABASE securegrade TO app_user;
  REVOKE ALL ON SCHEMA public FROM PUBLIC;
  GRANT USAGE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE ON users, sessions, grades TO app_user;
  GRANT SELECT ON courses, enrollments TO app_user;
  GRANT SELECT, INSERT ON audit_log TO app_user;
  GRANT USAGE ON SEQUENCE audit_log_id_seq TO app_user;
EOSQL
