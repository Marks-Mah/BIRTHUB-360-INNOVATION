# Runbook — Backup, Restore e Retenção de Logs

## Backup

```bash
DATABASE_URL=postgres://... BACKUP_DIR=./backups ./packages/db/scripts/backup.sh
```

Política sugerida:
- Backup full diário.
- Retenção de 30 dias local + replicação para storage externo.
- Teste de restore semanal em ambiente de staging.

## Restore

```bash
DATABASE_URL=postgres://... ./packages/db/scripts/restore.sh ./backups/birthub_YYYYMMDD_HHMMSS.dump
```

## Retenção e arquivamento de AgentLog

A migration `20260223090000_sprint3_operational_data` cria a função `archive_agent_logs(retention_days)` e a tabela `AgentLogArchive`.

Execução manual:

```bash
psql "$DATABASE_URL" -v retention_days=45 -f packages/db/scripts/archive-agent-logs.sql
```

Execução agendada recomendada: diária, com retenção de 30 dias em `AgentLog` e histórico completo em `AgentLogArchive`.
