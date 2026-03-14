# ADR-030: Política de Breaking Changes (Mudanças Quebráveis) e Ciclo de Vida

## Status
Aceito

## Contexto
O BirthHub360 é uma plataforma de Inteligência Artificial em rápida evolução (APIs, Modelos LLM subjacentes, Estrutura de Manifestos de Agentes e SDKs de Tools).
À medida que a plataforma cresce e novas capacidades são introduzidas (ex: mudança do formato de requisição do gateway, ou depreciação de uma versão antiga de um LLM), inevitavelmente ocorrerão atualizações que podem quebrar o código customizado (Packs Nível 2) ou os fluxos de trabalho (Workflows) existentes dos Tenants.

Se a plataforma não possuir uma política estrita sobre como, quando e com qual antecedência uma *Breaking Change* (Mudança Quebrável) é introduzida, a estabilidade das operações dos clientes Enterprise será severamente comprometida, gerando incidentes de produção massivos e perda de confiança (Churn).

## Decisão
Estabelecemos um **Contrato de Estabilidade e Depreciação (Deprecation Contract)** rigoroso para todas as APIs públicas, formatos de `manifest.yaml` e bibliotecas base do BirthHub360.

1.  **Definição do que é uma "Breaking Change":**
    *   Remover um endpoint de API, alterar seu verbo HTTP ou URL base.
    *   Renomear, remover ou tornar obrigatório um campo que antes era opcional no JSON de *request* ou *response* da API do Orquestrador.
    *   Alterar a assinatura de funções ou módulos core no SDK Python/Node usado para construir Tools.
    *   Forçar a atualização do modelo LLM subjacente (ex: desligar o `gpt-3.5-turbo` e forçar todos para o `gpt-4o`) se isso sabidamente mudar a estrutura de resposta que um *parser* do cliente espera.
    *   Mudar o esquema obrigatório do `manifest.yaml` de um Pack sem retrocompatibilidade de versão.

2.  **O que NÃO é uma Breaking Change (Safe Additions):**
    *   Adicionar novos *endpoints* à API.
    *   Adicionar novos campos opcionais a um *response* JSON existente (o *parser* do cliente deve ignorar o que não conhece).
    *   Melhorias de performance, correção de bugs de segurança (Patch) ou atualizações de dependências internas que não alteram a interface visível ao Tenant.

3.  **Processo de Comunicação e SLA de Depreciação (Sunset Period):**
    *   O BirthHub360 adotará Versionamento Semântico Rigoroso nas APIs (ex: `/api/v1/`, `/api/v2/`).
    *   **Aviso Prévio Mínimo (SLA):** Uma API ou funcionalidade core só poderá ser desligada (Sunsetting) após um aviso formal documentado (E-mail Técnico, Changelog e Banner no Painel do Tenant) de **no mínimo 6 meses (180 dias)** de antecedência para clientes Enterprise e Pro.
    *   **Janela de Coexistência:** Durante esse período, a versão antiga (v1) e a nova versão com breaking changes (v2) coexistirão e funcionarão perfeitamente em produção.

## Consequências

### Positivas
*   **Previsibilidade para o Cliente:** Tenants corporativos terão tempo hábil para planejar Sprints de engenharia, refatorar seus scripts de integração e atualizar seus Agentes Customizados (Packs) sem *downtime* forçado de surpresa.
*   **Estabilidade do Ecossistema:** Garante que automações críticas de negócio (ex: faturamento automático via agente) não quebrem da noite para o dia porque o BirthHub360 renomeou um campo no JSON.
*   **Confiança B2B:** Um SLA de suporte de 180 dias para versões descontinuadas é o padrão ouro para adoção Enterprise em SaaS.

### Negativas / Riscos Assumidos
*   **Aumento de Dívida Técnica Interna (Temporária):** A equipe de engenharia do BirthHub360 terá que manter, monitorar e pagar pela infraestrutura de múltiplas versões de uma mesma API ou serviço por até 6 meses simultaneamente.
*   **Velocidade de Iteração (Slight Hit):** Limita a capacidade de "limpar código legado" instantaneamente. Se desenharmos uma arquitetura ruim na `v1`, seremos obrigados a sustentá-la e corrigir suas falhas de segurança por um semestre inteiro enquanto os clientes migram para a `v2`.
*   **Complexidade no Código:** Exige o uso de *feature flags*, roteamento inteligente de API e múltiplos testes de regressão automatizados para garantir que a `v2` não quebre acidentalmente quem ainda usa a `v1`.
