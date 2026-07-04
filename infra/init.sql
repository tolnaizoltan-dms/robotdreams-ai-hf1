-- Read-only user for the agent runSql tool (NFR1: csak SELECT)
CREATE USER plantbase_ro WITH PASSWORD 'plantbase_ro';
GRANT CONNECT ON DATABASE plantbase TO plantbase_ro;
GRANT USAGE ON SCHEMA public TO plantbase_ro;

-- Meglévő táblákra (biztonság kedvéért, bár a migráció előtt fut)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO plantbase_ro;

-- Jövőbeli táblákra (Prisma migrate által létrehozottak)
ALTER DEFAULT PRIVILEGES FOR ROLE plantbase IN SCHEMA public
  GRANT SELECT ON TABLES TO plantbase_ro;
