# Guia de Customização de Templates de Agentes - BirthHub 360

## Objetivo
Orientar novos usuários (Gestores e Sales Ops) a selecionarem um template ("Pack") do Marketplace e adaptá-lo ao processo único da sua empresa em **menos de 30 minutos**, entregando o "Time to First Value" (TTFV).

## Filosofia: Comece Simples
1. **Não altere o Prompt Base (Core System Prompt).** Ele já foi testado com milhares de execuções.
2. **Foque nos Filtros (Onde agir).**
3. **Foque nos Inputs de Negócio (O que a IA precisa saber sobre sua empresa).**
4. **Altere os Outputs apenas na fase final (Como a IA deve falar/escrever).**

## Passo a Passo (Tempo Estimado: 25 min)

### Passo 1: Selecione o Template e Revise os Filtros de CRM (5 min)
*   Exemplo: Se escolheu "SDR Outbound", o agente precisa de uma lista de empresas. Em vez de pedir para ele escanear todo o seu CRM, defina uma "View" ou "Filtro" específico.
*   *Ação no BirthHub 360:* Conecte seu HubSpot e, no campo `Lista Alvo` da configuração do template, cole a URL de uma lista salva existente contendo apenas leads (ex: `SQLs Tech São Paulo`).
*   **Atenção:** Se não tiver listas criadas, este é o momento em que a customização falha.

### Passo 2: Configure a "Business Knowledge Base" (BKB) (10 min)
*   Templates genéricos precisam de "Contexto de Produto". Esta é a customização de maior impacto.
*   *Ação:* Na aba "Base de Conhecimento" (Knowledge) do agente, insira 3 documentos cruciais (ou URLs) no máximo:
    *   Um PDF de apresentação do seu produto principal.
    *   Um resumo de 1 página do seu Perfil de Cliente Ideal (ICP).
    *   Um FAQ ou tabela comparativa de preços.

### Passo 3: Ajuste a Persona (Tom e Voz) (5 min)
*   *Ação:* Na tela principal de configuração (Settings), defina como seu agente deve se comunicar externamente.
*   Exemplos recomendados para B2B Enterprise: "Tom profissional, direto, focado em retorno financeiro, sem jargões de startups, e nunca use emojis."
*   Exemplos recomendados para PLG (Product Led Growth): "Amigável, casual, encorajador, responda focando na facilidade de uso do software."

### Passo 4: O "Run Seco" (Modo Simulação) (5 min)
*   Nunca ligue a chave "Auto-Pilot" em um template recém-baixado.
*   *Ação:* Acione o botão `Testar Agente em Modo Simulação (Dry-Run)`. Selecione manualmente um lead conhecido do CRM e observe como o agente redige a resposta no console.
*   Se o resultado estiver 80% bom, aprove a automação. Os 20% restantes devem ser corrigidos gradualmente ajustando os documentos da BKB (Passo 2), não reescrevendo o prompt.
