-- Local setup: create the database, then load the schema.
-- Run from the project root:  psql -U postgres -f setup.sql
-- (The server also creates the tables automatically on startup.)
CREATE DATABASE ticketboss;
\c ticketboss
\i src/db/schema.sql
\dt
