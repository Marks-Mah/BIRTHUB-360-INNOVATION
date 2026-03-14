# Teste de Usabilidade do Wizard de Instalação (Simulação)

Este documento sumariza os resultados de testes simulados de usabilidade do fluxo desenhado para o Wizard de Instalação de Agent Packs, focando em personas de negócios (Admins de Vendas/Marketing) sem formação em desenvolvimento ou IA.

## Perfil do Usuário Testado
*   **Cargo:** Gerente de Operações de Vendas (Sales Ops).
*   **Nível Técnico:** Avançado em processos e uso de CRM (HubSpot), mas sem conhecimento de "APIs", "JSON", ou "LLM System Prompts".

## Cenário de Teste
Instalar o **SDR Agent Pack** para qualificar leads vindos de formulários do site.

## Observações de Atrito (Friction Points)

1.  **Atrito de Nomenclatura (System Prompt):**
    *   *Problema:* No Passo 2.1, pedir ao usuário para editar o "System Prompt" causou paralisação. O termo é excessivamente técnico.
    *   *Solução UX:* Renomear a etapa para "Personalidade e Instruções". Usar campos de texto guiados (ex: "Qual o objetivo principal deste agente?", "Quais regras de negócio ele não pode quebrar?"). O backend concatena isso num System Prompt válido.
2.  **Atrito de Credenciais (Tokens):**
    *   *Problema:* Quando o Conector exige um Token OAuth (ex: LinkedIn), o usuário muitas vezes não é o Super Admin global para autorizar o escopo do app. O processo trava.
    *   *Solução UX:* Implementar o botão "Solicitar Acesso à TI", gerando um link de consentimento OAuth que o Sales Ops pode enviar por Slack para o administrador de TI aprovar a conexão. O Wizard fica salvo como "Rascunho".
3.  **Atrito de Mapeamento (Data Mapping):**
    *   *Problema:* O agente pede `lead_id` e `company_size`. O usuário não sabe qual coluna do seu CSV / CRM bate com isso.
    *   *Solução UX:* Ferramenta de "Auto-match" baseada em similaridade semântica (ex: `Tamanho da Empresa` -> `company_size`), e visualização lado a lado de 1 lead real como exemplo.

## Conclusão e Viabilidade
O fluxo básico é percorrível sozinho em 3 a 5 minutos por um Admin, *desde que* jargões de LangChain/GenAI sejam completamente abstraídos da interface. Taxa de completude (estimada na simulação): **75% completam sem abrir ticket de suporte**.
