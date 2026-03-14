# Template Padrão: Relatório de Auditoria para Requisição de Titular de Dados (DSAR)

**Data Subject Access Request (DSAR) Audit Report**
Documento Oficial - Classificação: Confidencial
Emissão: `[Data da Extração]`
Tenant/Organização: `[Nome da Organização] (ID: [Tenant UUID])`

Este documento foi gerado automaticamente pelo sistema de Auditoria do BirthHub360, com base na trilha de log imutável, em atendimento à solicitação do Titular dos Dados conforme a Lei Geral de Proteção de Dados (LGPD - Art. 18).

---
## 1. Dados do Titular (Sujeito da Pesquisa)
*   **Nome Identificado no Sistema:** `[Nome Mascarado ou PII Oculto dependendo da requisição]`
*   **Identificador Único (User ID / E-mail):** `[UUID ou E-mail Parcial]`
*   **Período Abrangido no Relatório:** `[Data Inicial]` a `[Data Final]`

---
## 2. Resumo das Operações de Tratamento
A plataforma registra interações com o Perfil do Titular ou ações tomadas pelo Titular. Abaixo o sumário estatístico do período:
*   **Total de Acessos Autorizados (Logins):** `[Quantidade]`
*   **Total de Modificações no Perfil (Updates):** `[Quantidade]`
*   **Total de Operações de Compartilhamento/Exportação Envolvendo o Titular:** `[Quantidade]`
*   **Data do Primeiro Registro:** `[Data/Hora]`
*   **Data do Último Registro:** `[Data/Hora]`

---
## 3. Trilha de Acesso Detalhada (Histórico de Eventos)

Os registros abaixo atestam "Quem" (Ator), "Quando" (Timestamp), e "O Quê" (Operação) acessou ou processou os dados pertinentes a este titular. (Atenção: Os dados brutos processados não são exibidos por segurança; apenas a prova irrefutável de acesso e operação).

| Data/Hora (UTC) | Identificador do Evento (Log ID) | Operador/Ator (Actor) | Tipo de Operação (Action) | Sistema Origem (IP / Agent) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `2023-10-25 14:30:21` | `evt_1abc2def` | `Admin XYZ (ID: ...)` | `user.profile.viewed` | `192.168.1.1` / API | Sucesso |
| `2023-10-26 09:15:00` | `evt_3ghi4jkl` | `Sistema (Automático)` | `billing.invoice.generated` | Internal Worker | Sucesso |
| `2023-11-01 18:45:10` | `evt_5mno6pqr` | `[Titular Solicitante]` | `user.password.changed` | `203.0.113.50` / Web | Sucesso |
| `2023-11-02 10:00:00` | `evt_7stu8vwx` | `Support Agent 12` | `user.support.impersonate` | Internal CRM | **Aviso** |

---
## 4. Termo de Veracidade Criptográfica
Declaramos para os devidos fins legais que todos os eventos listados neste relatório são extraídos diretamente do banco de dados auditável do BirthHub360.
*   **Status de Integridade da Cadeia:** `[Verificado VÁLIDO / Incorreto]`
*   A sequência dos eventos é validada por Hashing Encadeado (Chained Hash SHA-256), atestando a não adulteração e não exclusão de eventos intermediários durante o período especificado.
*   Acesso restrito ao Responsável de Proteção de Dados (DPO) do Tenant solicitante.

**Gerado por:** `BirthHub360 Automated Audit Engine`
**Assinatura Digital do Documento:** `[Hash do Relatório Inteiro para Autenticação Posterior]`