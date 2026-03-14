# Checklist Pré-lançamento de Faturamento (Go-Live Billing)

Antes de virar a chave da conta Stripe do modo `Test` para `Live` e processar o primeiro cartão de crédito de um cliente real, a equipe de engenharia e produto deve garantir que todos os itens deste checklist estejam concluídos e validados. Falhas aqui podem gerar passivos legais ou a suspensão da conta Stripe por altas taxas de *chargeback*.

## 1. Configuração do Stripe (Dashboard Live Mode)

- [ ] **Informações da Empresa e Branding:** O logo, nome de exibição no extrato do cartão (Statement Descriptor) e o endereço de suporte devem estar corretamente configurados na aba de `Public Details` do Stripe (Isso previne disputas por não reconhecimento da marca).
- [ ] **Configuração de Produtos e Preços:** Todos os Planos (Starter, Growth, Scale) foram recriados no Live Mode e as IDs de preço (Price IDs) correspondem exatamente às variáveis de ambiente de produção no backend.
- [ ] **Configuração de Taxas (Stripe Tax):** O módulo *Stripe Tax* está ativo para calcular e recolher automaticamente impostos onde o BirthHub360 atingiu o *nexus* fiscal.
- [ ] **Regras do Radar (Antifraude):** As regras do Stripe Radar estão habilitadas para rejeitar preventivamente cartões com falha no CVC ou sem verificação de CEP (Zip Code).

## 2. Configurações de Backend e Infraestrutura (BirthHub360)

- [ ] **Chaves de API Seguras:** O `.env` de produção está usando as chaves `sk_live_...` e `pk_live_...` (Stripe Secret e Public Key) armazenadas num Secret Manager seguro (como AWS Secrets Manager), nunca comitadas no código.
- [ ] **Stripe Webhook Secret (Live):** O `STRIPE_WEBHOOK_SECRET` gerado no Live Mode foi configurado. (O segredo do webhook de Test Mode falhará ao tentar decodificar eventos de Live).
- [ ] **URLs do Webhook:** O endpoint de webhook cadastrado no Stripe aponta para o domínio oficial HTTPS de produção (ex: `https://api.birthhub360.com/webhooks/stripe`).
- [ ] **DLQ Monitorada:** A Dead Letter Queue (DLQ) para falhas de webhooks está ligada a um alerta no PagerDuty ou canal de Slack da engenharia para intervenção imediata.

## 3. UI e Acessibilidade (Frontend)

- [ ] **HTTPS Obrigatório:** A página de Checkout e a injeção do Stripe Elements estão servidas via HTTPS válido (Certificado SSL não expirado).
- [ ] **Idempotência no Frontend:** O botão de "Pagar" bloqueia (loading state) após o primeiro clique para evitar duplicidade.
- [ ] **Terms e Privacy Policy:** Os links para os *Termos de Serviço* e *Política de Privacidade* (com consentimento sobre LGPD no tratamento do billing) estão visíveis na tela de Checkout, acima do botão de confirmação.
- [ ] **Métricas Instanciadas:** A página de *Billing Settings* puxa os dados do `Live Mode`, não apresentando dados mockados de cartões de teste "4242".

## 4. Teste em Produção ("Penny Test" ou "Smoke Test")

- [ ] **Compra Real Interna:** Um membro da diretoria ou founder utilizou seu próprio cartão de crédito real na produção para assinar o plano mais barato.
- [ ] **Validação do Caminho Feliz:** O pagamento foi processado, os limites (ex: 500 interações) foram atribuídos, o banco refletiu o status e a fatura fiscal (Invoice/NFe) chegou no e-mail real.
- [ ] **Cancelamento e Reembolso Real:** O mesmo usuário efetuou o cancelamento e solicitou um reembolso de teste. O valor estornado voltou pro cartão dias depois, e o acesso premium foi cortado instantaneamente do painel do BirthHub360.
