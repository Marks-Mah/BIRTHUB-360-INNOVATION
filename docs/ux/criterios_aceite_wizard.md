# Critérios de Aceite para o Wizard de Instalação de Agent Packs

Para que o desenvolvimento front-end do "Wizard" seja dado como concluído (`Done`), ele deve satisfazer as seguintes métricas e comportamentos, com foco em remover fricção de Setup e maximizar o Time-to-Value (TTV) do cliente.

## 1. Métricas Alvo (KPIs de UX)

*   **Taxa de Completude (Completion Rate):** > 80%. (De cada 10 administradores que clicam em "Instalar Agente", 8 devem chegar à tela de "Deploy" sem abandonar a página).
*   **Time-to-Value:** O fluxo inteiro (excluindo o tempo de criar chaves em sistemas de terceiros) deve demorar **menos de 3 minutos**.
*   **Taxa de Ticket de Suporte (Drop-off Rate):** Menos de 5% das instalações concluídas devem gerar tickets do tipo "Meu agente não funciona/não conecta".

## 2. Requisitos de Qualidade (Acceptance Criteria)

### A. Validação Obrigatória (Fail-Fast)
O Wizard **NÃO PODE** permitir que o usuário avance do Passo 2 (Integrações) se:
*   A API Key inserida for inválida (rejeitada pelo provedor externo via mock ping).
*   O token OAuth for negado por falta de escopo.

### B. Gestão de Estado
O Wizard deve salvar "Rascunhos" (Drafts) no LocalStorage ou via API a cada passo. Se o usuário fechar a aba para buscar a senha do LinkedIn e voltar 1 hora depois, ele deve continuar do exato ponto em que parou.

### C. Tratamento de Erros e Documentação Contextual
Ao lado de cada campo técnico (Ex: `Insira sua chave de Webhook do Stripe`), deve haver:
1.  Um *tooltip* (ícone de `?`).
2.  Um link "Onde encontro isso?" que abra um modal com o screenshot do painel do Stripe apontando onde clicar.

### D. Modo "Test-Drive"
A tela final do Wizard deve oferecer um input simulado para provar que a instalação foi bem sucedida antes de o agente ser ligado à fila de Webhooks reais de produção da empresa.
