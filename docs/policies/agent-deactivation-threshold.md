# Política de Desativação Automática de Agentes

## Objetivo
Proteger a reputação da marca do nosso cliente B2B e evitar consumo inútil de recursos. Se um Agente configurado pelo Gestor estiver "alucinando" severamente ou ofendendo usuários finais, o BirthHub atua preventivamente.

## O Threshold de Risco (Gatilho)
- **Condição:** Um Agente que acumula **NPS médio < 2.0** (numa escala de 1 a 5) ou **taxa de "👎" superior a 50%** em um volume mínimo de 15 conversas únicas durante uma janela de **7 dias corridos**.
- **Ação do Sistema:** O Agente entra no status `Under Review` (Pausado preventivamente). O widget no site do cliente passará a exibir "Atendimento Temporariamente Indisponível".

## Fluxo Pós-Gatilho
1. Um alerta P1 é gerado para a fila de Customer Success (CS) do BirthHub.
2. O Gestor (Tenant) recebe um e-mail imediato: *"Pausamos seu Agente temporariamente para proteger seus clientes. Detectamos uma alta taxa de insatisfação nas respostas recentes. Clique aqui para revisar os logs e ajustar o comportamento."*
3. O Gestor pode reativar o Agente manualmente com 1 clique (Override), mas é forçado a passar por uma tela de "Dicas de Melhoria de Prompt".
