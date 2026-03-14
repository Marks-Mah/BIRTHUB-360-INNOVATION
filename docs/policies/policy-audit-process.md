# Processo de Auditoria e Manutenção de Políticas (Policy Engine)

As políticas de segurança que regem o BirthHub360 (ADR-018) não são estáticas. À medida que o SaaS evolui, novas ferramentas são criadas, novos planos de assinatura são oferecidos e novas vulnerabilidades de modelos de linguagem (LLMs) são descobertas.

Para manter a integridade do **Policy Engine** e evitar regressões de segurança ("Drift de Configuração"), este documento estabelece o processo obrigatório de auditoria, frequência de revisão e o controle estrito de quem possui privilégios para modificar as regras fundamentais da plataforma.

## 1. Escopo da Auditoria

A auditoria abrange exclusivamente as **Políticas de Plataforma (Global Policies)**, que ditam as capacidades default dos planos Free, Pro e Enterprise (ver `docs/policies/default-plan-policies.md`), bem como as regras de negação explícita (Deny-Lists globais de infraestrutura).

*As políticas de Custom RBAC (Role-Based Access Control) que um administrador de Tenant configura para seus próprios usuários não são escopo desta auditoria ativa do Agent Core, embora os metadados de acesso sejam registrados em log.*

## 2. Controle de Privilégios (Quem pode alterar?)

As políticas do Policy Engine são declaradas como código (Policy-as-Code - PaC) e armazenadas em um repositório Git isolado (ou diretório específico do monorepo).

1.  **Imutabilidade em Runtime:** **Nenhum** desenvolvedor, SRE ou ferramenta de CI/CD tem permissão para modificar as políticas ativas do Policy Engine diretamente via API em produção (exceto via procedimento *Break-Glass*). Toda alteração deve ocorrer via pipeline de Deploy contínuo.
2.  **Princípio dos Quatro Olhos (Four-Eyes Principle):** Qualquer modificação em uma Política Global exige um Pull Request (PR) com a aprovação obrigatória de, no mínimo:
    *   Um membro da equipe de Arquitetura de Plataforma (Agent Core).
    *   Um membro da equipe de Segurança da Informação (AppSec).
3.  **Owner Restrito (Code Owners):** O diretório que armazena as definições de política possui um `CODEOWNERS` que impõe automaticamente a revisão do grupo `@birthhub360/security-leads`.

## 3. Frequência de Revisão e Auditoria Proativa

A revisão das políticas ativas ocorrerá sob duas cadências:

### A. Revisão Contínua (Orientada a Evento)
Sempre que uma destas condições for atingida:
1.  **Lançamento de Nova Ferramenta Core:** Se a equipe de produto lançar uma nova ferramenta global (ex: `generate_video_avatar`), a política dos planos deve ser revisada no mesmo PR para determinar se ela entra no Free ou no Pro, e quais capacidades ela exige.
2.  **Lançamento de Novo Modelo Base (LLM):** Modelos mais novos (ex: GPT-5) podem ter comportamentos de *Tool Calling* diferentes ou serem mais suscetíveis a injeções de prompt específicas. As políticas de roteamento de modelos devem ser revisadas.
3.  **Incidente de Segurança (Post-Mortem):** Se um tenant conseguir escalar privilégios ou burlar o Policy Engine (ex: bypass via *Tool Chaining* relatado em bug bounty).

### B. Revisão Periódica (Auditoria Trimestral)
A cada três meses (Quarterly), a equipe de Segurança (AppSec) e Agent Core devem realizar uma cerimônia de auditoria formal:

1.  **Geração de Relatório de Drift:** O CI exporta as políticas atualmente em execução no Redis/OPA de Produção e compara o *hash* estrutural com as políticas no branch `main` do repositório. Qualquer divergência não justificada (Drift) é tratada como Incidente Crítico (P0).
2.  **Revisão de Tools Obsoletas:** Identificar ferramentas (Tools) listadas nas políticas que foram deprecadas (ver `docs/policies/deprecation-policy.md`) e já passaram do período de *Sunset*. Remover essas tools das allow-lists e limpar o código obsoleto.
3.  **Análise de Logs de Negativas (Deny Logs):** Analisar um dump anonimizado de 7 dias dos eventos de "Policy Violation" (ex: `403 Forbidden`). O objetivo é identificar:
    *   **Falsos Positivos:** Ferramentas lícitas sendo bloqueadas com muita frequência devido a uma política mal configurada.
    *   **Tentativas de Ataque Agrupadas:** Se um IP ou Tenant específico está batendo repetidamente na Deny-List de ferramentas administrativas, emitir um alerta investigativo.

## 4. Auditoria de Conformidade Externa (Compliance)

As Políticas de Plataforma e os logs do Policy Engine (mantidos no SIEM por 12 meses) servem como evidência primária em auditorias SOC2 Type II e ISO 27001 para comprovar o **Segregação Lógica de Acesso (Logical Access Segregation)** entre os Tenants do BirthHub360.
