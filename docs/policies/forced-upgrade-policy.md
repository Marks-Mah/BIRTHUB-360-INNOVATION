# Política de Degradação de Serviço e Upgrade Forçado (Forced Upgrade Policy)

Este documento define os procedimentos adotados pelo BirthHub360 quando uma organização (Tenant) atinge ou excede as cotas (Quotas) estipuladas pelo seu plano de assinatura (ex: Membros, Armazenamento S3, Requisições de API, ou uso de Workflows/Agentes).

A estratégia principal não é desligar o cliente abruptamente (Hard Stop), mas sim aplicar uma **Degradação Graciosa (Graceful Degradation)** combinada com um **Fluxo de Upgrade Forçado (Forced Upgrade)**, garantindo a continuidade do negócio do cliente enquanto protegemos a infraestrutura e a receita da plataforma.

## 1. Princípios da Degradação Graciosa

Quando um limite "Soft" (ex: número de execuções de um agente no mês) é atingido, o sistema deve priorizar a manutenção das operações de leitura e a integridade dos dados históricos, enquanto restringe novas operações de escrita que consumam recursos adicionais.

*   **Regra 1 (Nunca Perder Dados Acidentalmente):** Se o limite de armazenamento (Storage S3) for atingido em 100%, novos uploads de arquivos (ex: anexos de pacientes, PDFs) falharão imediatamente com HTTP 413 (Payload Too Large) ou HTTP 402 (Payment Required). No entanto, o cliente continuará podendo visualizar e fazer download dos arquivos antigos.
*   **Regra 2 (Leitura Garantida):** Atingir a cota de uso mensal (ex: 1.000 requisições de relatórios) não deve impedir o cliente de fazer login no dashboard e visualizar os relatórios já gerados ou exportar seus dados essenciais. As telas devem exibir o aviso de cota excedida, bloqueando apenas o botão "Gerar Novo Relatório".

## 2. Padrões de Bloqueio por Recurso (Enforcement)

### 2.1. Limite de Membros (Seats)
Se o tenant atingiu 100% dos assentos contratados (ex: 10/10 no plano Starter).
*   **Comportamento da UI/API:** O botão "Convidar Usuário" fica desabilitado (cinza). A API de convites (`POST /api/invites`) passa a retornar `HTTP 402 Payment Required`.
*   **Upgrade Forçado (Add-on/Upsell):** Ao clicar em "Convidar", o administrador é redirecionado para um modal do Stripe informando: *"Você atingiu o limite de membros. Deseja adicionar 1 assento extra por R$ 50,00/mês?"*. A compra adiciona o assento instantaneamente e libera o convite na mesma transação.

### 2.2. Limite Mensal de Execução de Agentes/Workflows (Usage-Based)
Se o tenant atingiu a cota de execuções (ex: 10.000/mês no plano Pro).
*   **Comportamento da UI/API:** Novos acionamentos manuais ou via webhook (ex: Webhook Receiver) são rejeitados. O sistema deve registrar a tentativa falha no banco de dados (Status: `QUOTA_EXCEEDED`) para que o cliente saiba que perdeu um evento importante.
*   **Aviso Prévio (80% e 90%):** O sistema deve disparar alertas proativos (E-mail e In-App Notification) para os *Owners* quando o consumo atingir 80% e 90% da cota mensal, instruindo-os a ativar o faturamento automático excedente (Overage Billing).
*   **Degradação de Fila:** Clientes que esgotaram a cota e têm faturamento atrasado perdem a prioridade nas filas assíncronas (Jobs vão para a fila `low-priority` ou `dead-letter` até o pagamento ser processado).

### 2.3. Limite de Rate Limit (API Abusiva)
Se uma integração externa ou script do cliente disparar milhares de requisições por minuto, violando o contrato do plano.
*   **Comportamento:** O API Gateway (Nginx/Cloudflare) ou o Middleware da Aplicação aciona o bloqueio de IP ou Token. O cliente passa a receber `HTTP 429 Too Many Requests`.
*   **Degradação Temporária:** O bloqueio dura uma janela (ex: 5 minutos). Se persistir ao longo do dia, o Token de API pode ser revogado (Status: `SUSPENDED`) automaticamente por suspeita de DDoS, forçando o cliente a entrar em contato com o suporte ou fazer upgrade para o plano Enterprise (onde limites são afrouxados).

## 3. O Fluxo de Upgrade Forçado (Hard Stop Temporário)

Em casos onde a cota excedida compromete o funcionamento de regras de negócio estritas (ex: O cliente realizou um downgrade de plano e ficou com mais membros do que o novo plano permite - ver Política de Membros).

1.  **Banner Restritivo (Hard Banner):** Ao fazer login, o Administrador (Owner) é recebido por uma tela bloqueante (Modal não-fechável) que exige uma ação imediata. Ele não consegue navegar para o Dashboard até resolver a pendência.
2.  **Ações Disponíveis na Tela de Bloqueio:**
    *   **Opção A:** Pagar a diferença (Pró-rata) ou fazer o Upgrade para o plano superior que comporta seu uso atual.
    *   **Opção B:** Gerenciar recursos ativamente (ex: Selecionar e desativar membros excedentes, apagar relatórios antigos para liberar espaço).
3.  **Liberação Imediata:** Assim que a condição `(Uso Atual <= Cota do Plano)` for satisfeita, o bloqueio deve ser retirado automaticamente, reabilitando a navegação. Nenhuma intervenção do suporte do BirthHub360 é necessária (Self-Healing via webhook de pagamento ou limpeza via API).