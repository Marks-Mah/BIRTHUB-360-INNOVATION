# Exemplos de Uso Concreto de Skill Templates (Por Domínio)

Este documento ilustra como as Skills fundamentais, construídas como "nós" modulares no LangGraph, se aplicam a contextos reais de negócios, reforçando a taxonomia e as necessidades de curadoria já discutidas.

## 1. Skill Template: `analyze_communication` (Análise de Comunicação)

*   **Descrição:** Lê transcrições, e-mails ou mensagens para extrair sentimentos, intenções e pain points.

**Exemplos por Domínio:**
*   **Domínio Sales (BDR/SDR):** Lendo a resposta de um e-mail frio para identificar se a objeção foi de "preço", "timing" ou "concorrência", extraindo informações e atualizando o lead score no CRM.
*   **Domínio CS (Pós-Venda):** Analisando o ticket aberto no Zendesk para classificar a urgência, prever churn risk baseado no sentimento e preparar o contexto para o Atendente (L1).
*   **Domínio Marketing:** Minerando comentários em postagens (Social Agent) para extrair dores recorrentes para campanhas futuras.

## 2. Skill Template: `draft_contract_or_proposal` (Geração de Contratos/Propostas)

*   **Descrição:** Utiliza templates corporativos aprovados e variáveis do sistema para redigir documentos customizados e envia-los para revisão (HITL).

**Exemplos por Domínio:**
*   **Domínio Sales (Closer/AE):** Elaborando uma proposta comercial final com base nos itens negociados (ex: descontos, prazos, aditivos) validados na skill anterior e enviando para o comitê de vendas e para o cliente (via DocuSign).
*   **Domínio Legal (Jurídico):** Revisando automaticamente cláusulas adicionadas por clientes a NDAs ou contratos padrão, sugerindo redlines ou aprovando.
*   **Domínio Ops (Parcerias):** Criando contratos de parceiros baseados nos níveis do programa (Silver, Gold) definidos na plataforma PRM.

## 3. Skill Template: `orchestrate_data_enrichment` (Enriquecimento de Dados)

*   **Descrição:** Interage com APIs externas (LinkedIn, Clearbit, bases públicas) para complementar dados básicos e estruturar perfis consolidados.

**Exemplos por Domínio:**
*   **Domínio Ops (Data/RevOps):** Auditando a base de dados do CRM e atualizando cargos, empresas e contatos faltantes, garantindo "CRM Hygiene".
*   **Domínio Sales (SDR):** Pré-reunião (Discovery): Busca dados sobre o prospect antes de um call e consolida um "Briefing de Reunião" de 1 página para o Executivo.
*   **Domínio Financeiro:** Coletando dados em APIs de bureaus de crédito ou bases governamentais (ex: Sintegra, Receita Federal) para automatizar a aprovação de limite de crédito para novos parceiros B2B.
