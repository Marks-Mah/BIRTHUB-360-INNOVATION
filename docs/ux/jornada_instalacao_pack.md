# Jornada de Instalação de Agent Pack (Wizard UX)

Este documento mapeia o fluxo passo a passo que um usuário Admin (sem alto contexto técnico) percorrerá desde a descoberta no Catálogo Oficial até colocar o Agente em produção no seu Tenant.

## Fase 1: Descoberta e Seleção (Marketplace)
1.  **Exploração:** O usuário entra em "Catálogo de Agentes" e filtra pela tag `domain:sales`.
2.  **Detalhes do Pack:** Clica no card do "SDR Corporativo". Vê o *Manifesto Traduzido* para a interface: Nome, Descrição, Nível de Custo (Ex: $0.05/lead), Ferramentas utilizadas (LinkedIn, HubSpot) e Exemplos de Conversa.
3.  **Ação:** Clica em "Instalar Agente".

## Fase 2: O Wizard de Configuração (Setup)

### Passo 2.1: Identidade e Prompt
*   **Ação:** O sistema pede para o usuário personalizar o nome e o tom de voz do SDR (Ex: "João da Acme", "Formal, mas amigável").
*   **Backend:** O sistema clona o Agent Pack gerando um ID exclusivo para o Tenant (`tenantId_sdr_agent_01`) e interpola o Custom Prompt no System Prompt base.

### Passo 2.2: Conexão de Ferramentas (OAuth & Secrets)
*   **Ação:** A interface exibe os Conectores exigidos pelo Pack (ex: HubSpot CRM).
*   **Se já conectado:** Mostra um check verde ("HubSpot já conectado na conta").
*   **Se faltar conexão:** Mostra um botão "Conectar HubSpot" que abre um popup OAuth.
*   **Se for API Key Externa:** Abre um modal seguro para colar a chave (ex: OpenAI API Key) e injeta diretamente no Secret Manager.

### Passo 3: Mapeamento de Entradas (Variáveis e Triggers)
*   **Ação:** O usuário define *quando* o agente deve agir (Trigger). Ex: "Toda vez que um Lead mudar para status = Novo no HubSpot".
*   **Ação (Opcional):** Mapeamento de colunas caso o cliente use campos customizados no CRM (`custom_field_x` -> `company_size`).

### Passo 4: Governança e Limites (Guardrails)
*   **Ação:** O usuário aceita ou configura os limites: "Gastar até R$ 200/mês" e "Pedir aprovação manual para enviar e-mails". (Por padrão, a política `HITL` do manifesto dita o setup inicial).

## Fase 3: Ativação (Deploy)
*   **Ação:** O usuário clica em "Ativar Agente".
*   **Feedback Visual (Primeiro Uso):** O sistema oferece o botão "Testar Agora". O usuário insere um lead real e vê a tela de "Execução ao Vivo" do LangGraph (Logs de Raciocínio, Tool Calls, e Output Final) em uma UI simplificada tipo chat.
