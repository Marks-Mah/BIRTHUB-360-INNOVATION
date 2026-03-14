-- Usage:
-- psql "$DATABASE_URL" -v retention_days=45 -f packages/db/scripts/archive-agent-logs.sql
SELECT archive_agent_logs(COALESCE(:'retention_days'::int, 30));
