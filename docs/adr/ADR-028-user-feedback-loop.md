# ADR-028: Feedback de Usuário como Motor de Refinamento de IA

## Status
Aceito

## Contexto
Temos que decidir como armazenar e agir sobre o feedback negativo dos chats (os "Thumbs down"). Deixamos o Gestor do Tenant lidar sozinho com isso, ou usamos os dados meta-anonimizados para treinar nossos próprios templates globais?

## Decisão
Usaremos um **Data Flywheel Centralizado** (Ciclo de Feedback Ativo). O sistema coletará avaliações de chat e as associará ao ID do Template Base utilizado.

## Justificativa
O maior diferencial de um SaaS B2B de IA é a inteligência acumulada. Se 10 agências imobiliárias usam nosso Template SDR, um erro descoberto por uma agência deve consertar o prompt para as outras 9. Isso cria um fosso competitivo ("Moat") em relação aos concorrentes que apenas revendem chaves da OpenAI.

## Consequências
- Exigirá ofuscação (PII stripping) estrita das transcrições antes que nossos engenheiros de prompt leiam os chats "negativos" (compliance LGPD).
- Exigirá uma UI de versionamento de prompts no backend para gerenciar as melhorias de versão.
