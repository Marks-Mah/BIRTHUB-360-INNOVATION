# Threshold de Desativação Automática de Agentes - BirthHub 360

## Objetivo
Proteger a reputação da plataforma impedindo que Agentes IA (Packs) que estejam performando de forma danosa continuem operando ou sendo adquiridos por novos usuários, baseado em métricas de feedback direto (NPS/Score de Execução).

## O Threshold de "Quarentena" (Auto-Pause)

Um agente será colocado automaticamente em **Modo de Quarentena (Desativação Temporária)** se atender à seguinte condição matemática:

**Condição de Falha Crítica:**
*   `Média de Satisfação do Agente (Score 1 a 5)` é **inferior a 2.0**.
*   **Janela de Tempo:** Sustentado por um período contínuo de **7 dias**.
*   **Volume Mínimo (Amostragem):** Requer pelo menos 50 execuções avaliadas por diferentes Tenants nesse período (para evitar que 1 usuário frustrado derrube o agente).

### O que acontece no Modo de Quarentena?

1. **Remoção do Marketplace:** O Pack é ocultado de pesquisas públicas para novos usuários.
2. **Notificação In-App aos Usuários Atuais:** "O agente 'SDR Inbound' foi pausado temporariamente para uma auditoria de qualidade em seus modelos de resposta. Suas campanhas ativas estão em hold. Previsão de retorno: 24 horas."
3. **Página de PagerDuty:** O time de AI QA é acionado.

## O Threshold de Exclusão Definitiva (Delisting)

Se o agente em quarentena for corrigido (Patch Release) e, após ser reativado, voltar a cair abaixo do threshold de 2.0 em menos de 30 dias (Reincidência Grave), ele será **Desativado Definitivamente (Delisted)** do catálogo.

- Usuários antigos não perderão o acesso ao código fonte do seu prompt local (evitando quebra de workflow), mas a plataforma exibirá um banner vermelho gigante: *"Este template foi descontinuado por não atingir nossos padrões de qualidade. Recomendamos migrar para a versão oficial."*
