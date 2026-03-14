# SLA de Suporte e Manutenção da Versão Zero (v0/Legacy)

## 1. Escopo (O Fim de Vida da v0)
A Plataforma BirthHub360, em sua transição oficial para o "General Availability" (GA) - Versão 1.0 (v1), estabelece um Acordo de Nível de Serviço (SLA) temporário, de descontinuação controlada, para a versão original de testes e *early adopters* denominada **Versão 0 (v0) ou Legacy API**.
Esta política define por quanto tempo a versão `v0` permanecerá funcional, quais tipos de atualizações ela receberá (Feature Freeze) e quando ela será permanentemente desligada (Sunsetting).

## 2. Prazos do Fim de Vida (The Deprecation Timeline)
Para minimizar interrupções nos fluxos de negócios de Tenants Pro e Enterprise que adotaram a plataforma precocemente, o BirthHub360 compromete-se com a seguinte linha do tempo após o lançamento oficial da `v1`:

### 2.1. Fase 1: Coexistência Ativa (Meses 0 a 3)
*   **Status:** A API `v0` (`/api/v0/`) e a API `v1` operam paralelamente com 100% de disponibilidade.
*   **Novas Contas:** Novos Tenants cadastrados não podem gerar chaves de API para a `v0`.
*   **Funcionalidades:** `Feature Freeze` absoluto. Nenhuma nova *tool*, modelo de LLM ou melhoria de UI/UX será adicionada à `v0`. As novidades existem apenas na `v1`.

### 2.2. Fase 2: Manutenção de Segurança Exclusiva (Meses 4 a 6)
*   **Status:** A API `v0` continua funcional, mas entra em modo "Deprecated". O painel do Tenant exibe um banner vermelho irremovível: "A Versão 0 será desligada em X dias. Migre para a Versão 1 imediatamente."
*   **Patches (SLA):** Durante este período (até o 180º dia), a equipe de engenharia do BirthHub360 **garante o lançamento de patches exclusivos para vulnerabilidades de segurança críticas (CVSS 8.0+) e correções de bugs de infraestrutura (P0 - Downtime)** que afetem a estabilidade do cluster legado.
*   **Limitação de Suporte (CS):** A equipe de Customer Success deixará de prestar consultoria ou ajudar a "consertar prompts/agentes" criados no formato `v0`. O suporte foca 100% em "Como migrar da v0 para a v1".

### 2.3. Fase 3: Desligamento Permanente (Sunset - Dia 181)
*   **Status:** A API `v0` e o motor de execução legado são fisicamente desligados dos servidores AWS.
*   **Impacto (Hard Break):** Qualquer requisição HTTP para `api.birthhub360.com/v0/...` retornará um erro **410 Gone**. Qualquer Agente Orquestrador rodando um *manifest.yaml* no formato `v0` que tentar iniciar uma sessão falhará imediatamente.
*   **Zero Rollback:** Não haverá possibilidade técnica ou comercial de religar a `v0` para um cliente atrasado, mesmo mediante pagamento adicional, devido aos riscos de manter código não seguro e não mantido (Dívida Técnica).

## 3. Matriz de Suporte Técnico (v0)

| Tipo de Incidente / Requisição na v0                  | Cobertura do SLA de Suporte (Meses 0-6) | Tempo de Resposta (TTR) |
| :---------------------------------------------------- | :-------------------------------------- | :---------------------- |
| **Vazamento de Dados (Security Breach)**              | Sim (Correção Crítica Imediata)         | < 1 Hora                |
| **Plataforma Totalmente Fora do Ar (Downtime)**       | Sim (Restabelecimento do Serviço)       | < 4 Horas               |
| **Integração Externa Parou de Funcionar (ex: Slack)** | Não (O cliente deve migrar para a v1)   | N/A                     |
| **Erro de LLM (Alucinação/Timeout na API OpenAI)**    | Não (Não atualizaremos a engine v0)     | N/A                     |
| **Dúvida: "Como escrever um prompt melhor na v0?"**   | Não (O suporte focará apenas na v1)     | N/A                     |

## 4. O Compromisso do BirthHub360
Este SLA rigoroso garante que não sofreremos com a Síndrome do Legado (Sustentar código obsoleto por anos por medo do *churn*), permitindo que 100% da energia de engenharia e segurança da plataforma seja direcionada para a inovação, escalabilidade e conformidade da versão `v1` e futuras.
A comunicação proativa (com no mínimo 3, 2 e 1 mês de antecedência) via e-mail direto aos Administradores (`Tenant_Owner` e `Tenant_Billing_Admin`) é obrigatória por parte do time de Operações para assegurar que nenhum cliente seja pego de surpresa no Dia 181.
