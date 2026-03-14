# Comunicação de Migração para Clientes (v0 para v1)

## 1. Propósito do E-mail Oficial
Quando a Plataforma BirthHub360 decreta o início do período de *Sunsetting* de uma versão principal (ex: API `v0` ou formato de manifesto de Agentes), uma cadência rigorosa de comunicação proativa com os Administradores de TI/Segurança de cada Tenant (Cliente) deve ser executada. O objetivo não é apenas notificar, mas **provocar a ação técnica imediata (Migração)** antes que seus fluxos críticos falhem no dia do desligamento.

Este documento contém o modelo padrão de comunicação de **Aviso Prévio (90 dias)** para envio em massa via CRM de Customer Success.

---

## 2. Modelo de E-mail: Alerta Crítico de Migração (T-90 Dias)

**De:** Equipe de Engenharia BirthHub360 <engineering-alerts@birthhub360.com>
**Para:** [E-mail do Administrador do Tenant e Billing]
**Assunto:** ⚠️ [Ação Necessária] Desligamento da API Versão 0 (Legacy) em 90 dias - Agende sua migração para a v1.

Prezado(a) [Nome do Administrador],

Esperamos que seus Agentes Autônomos estejam impulsionando a produtividade da sua equipe.
Para continuarmos oferecendo os mais altos níveis de segurança, velocidade e acesso aos modelos de Inteligência Artificial mais recentes do mercado, o BirthHub360 concluirá a transição de nossa infraestrutura legada (Versão 0 / `v0`) para o nosso motor de execução de nova geração (Versão 1.0 / `v1`).

De acordo com nossa Política de Ciclo de Vida (ADR-030), a API `v0` e o suporte aos Manifestos de Agentes antigos **serão permanentemente desligados em [DATA DE DESLIGAMENTO - DIA 181]**.

**O que isso significa para o seu ambiente?**
A partir desta data, qualquer chamada de API apontando para `/api/v0/` ou qualquer Agente configurado com o formato antigo falhará imediatamente (Erro 410 Gone). As automações corporativas da sua empresa que ainda não foram atualizadas serão interrompidas.

**O Impacto no seu Tenant:**
Nossos sistemas detectaram que sua conta ainda realizou **[Número de Requisições]** chamadas para a API `v0` nos últimos 7 dias, ou possui **[Número de Agentes]** Agentes Customizados rodando a versão antiga. A migração é mandatória.

### O Cronograma de Ação e Suporte (O Que Esperar)

1.  **Hoje até [Data - 30 Dias]:** A API `v0` continua 100% operacional. Recomendamos que você reserve tempo neste sprint de desenvolvimento para atualizar seus scripts, *webhooks* ou integrações (Zapier/Make) para apontar para a `/api/v1/`.
2.  **A partir de [Data - 30 Dias] até [Data do Desligamento]:** A API `v0` entrará em "Brownout" (janelas curtas de 10 minutos de instabilidade simulada semanal) para ajudar você a identificar rapidamente quais integrações "esquecidas" na sua rede ainda dependem da versão antiga.
3.  **[DATA DE DESLIGAMENTO DEFINITIVO]:** A API `v0` será desligada. Não há possibilidade técnica de religamento ou extensão de prazo. Apenas a API `v1` existirá.

### Como Iniciar a Migração Imediatamente

Migrar da `v0` para a `v1` exige **ajustes mínimos de código**. Os principais *endpoints* foram otimizados e as respostas JSON padronizadas.
Siga os 3 passos abaixo:
1.  **Acesse o Guia de Migração Completo:** Desenvolvemos um guia técnico passo a passo (`docs.birthhub360.com/migration-v0-v1`) detalhando exatamente como atualizar seus pacotes (`manifest.yaml`) e suas chamadas REST.
2.  **Leia as Breaking Changes:** Veja a lista exata dos campos JSON que foram renomeados ou removidos na documentação técnica.
3.  **Gere os Novos Tokens (v1):** A `v1` utiliza um sistema de permissões mais granulado (JWT). Suas chaves antigas da `v0` continuarão funcionando temporariamente na `v1` (Modo Híbrido), mas recomendamos a geração de novos tokens de acesso pelo painel de Segurança.

**Precisa de Apoio da Nossa Engenharia?**
Sabemos que migrações técnicas demandam tempo. Nossa equipe de Customer Success (CS) está dedicada a tornar esse processo invisível para os seus usuários finais.
*   **Se você é um cliente Pro/Enterprise:** Responda diretamente a este e-mail (ou clique no botão abaixo) para agendar uma reunião de 30 minutos com um Engenheiro de Soluções do BirthHub360. Nós revisaremos o seu código de integração gratuitamente.
*   **[Botão: Agendar Reunião de Migração Técnica]**

Agradecemos profundamente por ter confiado no BirthHub360 desde o início (v0). Estamos empolgados para que sua equipe experimente o ganho de 40% em velocidade de inferência (Latência) e as novas ferramentas de *Memory* da Versão 1.0!

Atenciosamente,
A Equipe de Engenharia do BirthHub360
[Link para o Dashboard de Status e Sunset]
