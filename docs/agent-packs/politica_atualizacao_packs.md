# Política de Atualização de Agent Packs

Os agentes não são estáticos; os modelos LLM evoluem, prompts são refinados e novas Skills são adicionadas. Para gerenciar essas atualizações na base de clientes (Tenants) que já possuem cópias rodando em produção, estabelecemos a seguinte política vinculada ao Versionamento Semântico (SemVer - ADR-019).

## 1. Atualizações Menores (PATCH e MINOR)
*   **Definição:** Correções de bugs (`PATCH` - ex: ajuste de fallback no prompt) ou adição de funcionalidades retrocompatíveis (`MINOR` - ex: nova tool opcional adicionada ao agente de Vendas).
*   **Estratégia de Aplicação: Automática (Opt-out)**
*   **Fluxo:**
    1.  Nova versão `1.2.0` publicada no Catálogo Oficial.
    2.  O sistema roda um Job assíncrono para todos os Tenants que possuem a versão `1.1.x`.
    3.  A versão é "pushed" (empurrada) suavemente, sem interromper execuções em andamento.
    4.  O Tenant recebe uma notificação na UI do Dashboard (Changelog: "Seu SDR Agent agora sabe gerar gráficos de radar").

## 2. Breaking Changes (MAJOR)
*   **Definição:** Mudanças na estrutura de dados que fariam o sistema do cliente quebrar. Exemplo: A ferramenta "Criar Lead" passa a exigir o campo `CNPJ` como obrigatório (`MAJOR`).
*   **Estratégia de Aplicação: Manual (Opt-in) via Fluxo de Migração**
*   **Fluxo:**
    1.  Nova versão `2.0.0` publicada.
    2.  Os Tenants na v1.x são marcados com flag `update_available: true`.
    3.  No Dashboard, o Admin visualiza um banner amarelo: "Nova geração do Agente Disponível".
    4.  O Admin inicia um "Update Wizard" que guia o usuário no remapeamento do campo novo (`CNPJ`).
    5.  O agente v2 é testado lado a lado ("Shadow Mode" opcional) antes de substituir o v1.

## 3. Comunicação e Sunset
*   **Antecedência:** Para desativar uma versão MAJOR (forçando a quebra da v1 para a v2), um aviso de 60 dias (Sunset Notice) deve ser disparado por e-mail aos proprietários do Tenant.
*   **Congelamento:** 15 dias antes do Sunset, o Agent v1 entrará em modo "Read-only" ou exibirá alertas severos na interface caso o usuário o acesse.
