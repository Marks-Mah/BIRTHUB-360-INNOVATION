# Política de Limites de Membros por Plano (Member Limits Policy)

Este documento dita a política comercial e técnica para o controle de quantos usuários (Membros/Assentos) podem fazer parte de uma única organização (Tenant) dentro do BirthHub360, baseado no plano de assinatura contratado (Free, Starter, Pro, Enterprise).

O controle de membros é a métrica central de monetização do nosso modelo "Per-Seat Pricing". A aplicação de bloqueios rigorosos garante que o cliente pague justamente pelo valor gerado.

## 1. Definição de Limites por Nível (Tiers)

O número máximo de membros ativos permitidos simultaneamente em um Tenant é gerido pela entidade comercial `SubscriptionPlan`:
*   **Plano Free (Gratuito):** Limite Rígido de **3 membros ativos** (Incluindo o Owner/Fundador).
*   **Plano Starter:** Limite Base de **10 membros ativos** (Com possibilidade de compra de assentos avulsos, se o faturamento permitir).
*   **Plano Pro:** Limite Base de **50 membros ativos** (Com possibilidade de compra de assentos adicionais ilimitados via faturamento automatizado).
*   **Plano Enterprise:** Ilimitado (Customizado em Contrato - Configurado manualmente via Admin do Sistema).

### O que conta como um "Membro Ativo" (Uso de Assento)?
1.  **Usuários com o status `ACTIVE` na tabela `organization_members`.**
2.  **Convites `PENDING`:** Para evitar "estouro de limite", o simples disparo de um convite já reserva (Aloca) temporariamente um assento (Seat) no limite da organização. (Ex: O Plano Free tem 3 lugares. O Owner (1), um membro ativo (2) e um convite enviado pendente de aceite (3). O limite foi atingido e o botão de convidar é desativado na interface).
    *   Se o convite expirar (vide Política de Expiração), o assento volta a ficar livre para ser reutilizado.

## 2. Bloqueios de Excedentes e Upgrade Forçado (Degradação Graciosa)

O sistema possui duas barreiras de bloqueio (Enforcement) para o atingimento da cota máxima:

### 2.1. Bloqueio Preventivo (UI e API de Convites)
*   **Ação API (HTTP 402 Payment Required / 403 Forbidden):** Quando um Administrador ou Owner de uma organização tentar enviar um novo convite (`POST /api/invites`) e o cálculo (`COUNT(membros ativos) + COUNT(convites pendentes)`) for igual ou superior ao limite do seu `current_plan_id`, o backend **rejeita imediatamente a operação**.
*   **Mensagem de Erro/Payload:** O endpoint retorna um código claro indicando que o limite do plano foi atingido e orienta um payload com o link para a tela de *Upgrade (Checkout Stripe)*.
*   **Interface Gráfica (UI):** O botão "Convidar Membro" e "Adicionar em Massa" tornam-se inativos (cinzas) com um tooltip informativo.

### 2.2. Efeito Cascata em Downgrades (Cancelamento de Plano)
*   **O Problema (Downgrade de Pro para Free):** Uma organização com 20 membros ativos decide não renovar o plano Pro. Quando o faturamento vence ou ela clica em "Mudar para Free", o limite desce abruptamente de 50 para 3. O que acontece com os 17 membros excedentes?
*   **Ação de Reconciliação (Remoção Forçada - Soft Lock):**
    1.  **Não Apagamos Dados (Soft Delete na Relação):** O sistema nunca excluirá definitivamente as contas excedentes. O BirthHub360 executará um script de ajuste de assentos que alterará o status dos 17 últimos usuários (os admitidos mais recentemente) de `ACTIVE` para `SUSPENDED_OVER_LIMIT`.
    2.  O **Owner (Fundador) NUNCA será suspenso** (É garantido o assento 1/3).
    3.  Os membros suspensos, ao tentarem realizar login ou interagir com a API usando seus tokens, receberão um `HTTP 403 (Acesso Suspenso: Limite da Organização Excedido)`.
    4.  Na tela inicial do Owner, será exibido um Banner Vermelho (Aviso de Over-limit), solicitando o upgrade de plano ou que ele escolha manualmente na tabela de Membros quais as 2 pessoas ele deseja manter como `ACTIVE`, mantendo o restante congelado.