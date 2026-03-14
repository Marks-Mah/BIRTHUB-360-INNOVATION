# Análise de UX: Agent Studio (Fluxo No-Code)

A adoção do BirthHub360 depende de permitir que gestores de negócios (não-técnicos) consigam configurar e ativar agentes de IA sem precisarem escrever código Python ou JSON. O "Agent Studio" é o painel de controle onde essa mágica acontece.

Esta análise de UX detalha a jornada ideal de um Gestor de Negócios (ex: Gerente de Suporte) desde o primeiro login até a primeira execução bem-sucedida de um agente, identificando gargalos e oportunidades de design.

## 1. O Perfil do Usuário Alvo (Persona)

*   **Persona:** "Gestor Operacional" (Não-Técnico).
*   **Conhecimento:** Entende profundamente as regras de negócio de sua área, processos de aprovação e métricas. Não sabe o que é JSON, API, YAML ou Prompt Engineering avançado.
*   **Motivação:** Quer automatizar a triagem de tickets de suporte que está sobrecarregando a equipe.

## 2. A Jornada: Do Zero à Primeira Execução

### Fase 1: Descoberta e Seleção (Marketplace)
*   **O que acontece:** O gestor entra no Agent Studio e vê o "Agent Catalog" (ou Marketplace interno). Ele procura por soluções prontas.
*   **Fricção Potencial:** Uma tela cheia de jargões técnicos (ex: "Agente LangGraph de 3 nós com Vector RAG").
*   **Design Ideal (UX):**
    *   Navegação baseada em Casos de Uso/Departamentos (Vendas, Suporte, Financeiro) e não na arquitetura do agente.
    *   O usuário seleciona um "Template" (ex: "Assistente de Triagem N1"). O template encapsula o `manifest.yaml` (ADR-013) por baixo dos panos.

### Fase 2: Configuração Declarativa (O "Wizard")
*   **O que acontece:** O usuário escolhe o "Assistente de Triagem N1" e clica em "Configurar".
*   **Fricção Potencial:** Pedir que o usuário digite prompts de sistema (`system_prompt`) do zero ou configure variáveis de ambiente (`ZENDESK_API_KEY`) sem contexto.
*   **Design Ideal (UX):**
    *   **Configuração Guiada (Wizard):** Passos passo-a-passo.
    *   **Editor Visual de Prompts:** Em vez de um campo de texto livre, o sistema usa formulários. Ex: *"Qual o tom de voz do agente?"* (Select: Profissional, Amigável). *"Quais tópicos ele deve encaminhar para um humano?"* (Input tags). O backend compila isso no `system_prompt` final.
    *   **Integrações (Tools) via OAuth:** Para conectar ao Zendesk, em vez de pedir "API Key", a UI deve ter um botão "Connect Zendesk" que faz o fluxo OAuth seguro e salva as credenciais no Vault invisivelmente para o usuário.

### Fase 3: Concessão de Privilégios (Policy Engine UI)
*   **O que acontece:** O agente precisa de permissão (ex: `write` para fechar tickets) no Policy Engine (ADR-018).
*   **Fricção Potencial:** Telas complexas de IAM (Identity and Access Management) com checkboxes técnicos.
*   **Design Ideal (UX):**
    *   O UI traduz as Capacidades em inglês claro: *"O agente pediu permissão para: Ler tickets, Fechar tickets"*.
    *   Um botão toggle simples: `[x] Permitir`.

### Fase 4: O "Playground" (Test Drive Antes de Produção)
*   **O que acontece:** O gestor terminou de configurar e quer saber se funciona antes de ligar para os clientes de verdade.
*   **Fricção Potencial:** O único jeito de testar é colocar em produção e esperar um ticket real chegar.
*   **Design Ideal (UX):**
    *   Um chat embutido no lado direito da tela: **"Simulador"**.
    *   O usuário digita um e-mail de cliente falso. O agente responde na hora, mostrando os passos que tomou (ex: "1. Li o ticket. 2. A intenção é 'Devolução'. 3. Resposta gerada.").
    *   O gestor ganha confiança (Trust).

### Fase 5: Ativação (Go-Live)
*   **O que acontece:** O agente passa do estado "Rascunho/Draft" para "Ativo".
*   **Design Ideal (UX):**
    *   Um botão claro: "Publicar Agente".
    *   Feedback imediato de sucesso com um link para o painel de métricas (Logs/Observabilidade) para que o gestor saiba onde acompanhar o trabalho do agente.

## 3. Conclusão e Métricas de Sucesso

O sucesso do Agent Studio não é medido por quantas "features técnicas" ele expõe, mas por quão rápido o usuário consegue passar da Fase 1 à Fase 5.

*   **Métrica Chave (TTV - Time to Value):** Tempo médio desde o clique em "Criar Agente" até a primeira execução bem-sucedida no Simulador. O alvo (SLO de UX) é que este processo leve **menos de 5 minutos** para templates padrão.
