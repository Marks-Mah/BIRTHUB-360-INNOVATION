# Deprecação e cutover

## Serviços em sunset
- `apps/dashboard`
- `packages/db`
- rotas/auth naming `nextauth` (renomeado para `session`)

## Política
- manter por janela de transição;
- bloquear novos usos via CI (doctor);
- remover após zero consumers.
