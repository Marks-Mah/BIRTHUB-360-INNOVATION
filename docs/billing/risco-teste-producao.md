# Análise de Risco de Teste em Produção (Billing)

Validar a infraestrutura de pagamentos em produção é um desafio inerente ao desenvolvimento de software financeiro. O risco principal reside em causar prejuízos não intencionais a clientes (cobrança indevida) ou inflar métricas financeiras reais com transações de teste, sujando a contabilidade oficial.

## 1. O Problema do Ambiente Isolado

Por que testar em produção se existe o ambiente de "Test/Staging"?
- Ambientes de teste nem sempre refletem perfeitamente as latências de rede, as tabelas de roteamento, o *WAF (Web Application Firewall)*, as políticas de restrição de IP, e os gargalos do banco de dados reais.
- Uma falha de configuração de variáveis de ambiente (`sk_test` acidentalmente em Prod, ou webhook com segredo errado) só será revelada na integração real.

## 2. Riscos ao Testar em Produção

### A. Poluição de Métricas Financeiras e Fiscais
- Ao passar um cartão corporativo de um founder no ambiente produtivo para validar se "funciona", o Stripe registrará isso como MRR legítimo (Ex: +$399 na receita mensal).
- Se a integração com nota fiscal automática (NFe) estiver ativada, a prefeitura receberá a nota, o que gera obrigação tributária real (pagar impostos sobre o teste) se a transação não for estornada.

### B. Notificações Errôneas para Clientes
- Rodar um script automatizado (bot) de QA na produção que "mocka" um ID de usuário, e errar na injeção de ID, pode alterar a assinatura de um cliente real ou disparar um "E-mail de Dunning" dizendo que a fatura dele falhou, causando pânico e atrito imenso.

## 3. Como Validar sem Causar Danos

Para mitigar esses riscos, o BirthHub360 adota as seguintes estratégias de *Smoke Testing* e validação *Live*:

### Estratégia 1: Uso Estrito de Contas 'Sandbox' Segregadas
- Nenhuma automação de teste E2E pode apontar aleatoriamente para registros em produção.
- Uma conta (Tenant) específica (Ex: "BirthHub360 Quality Assurance Inc.") deve ser criada com um e-mail controlado pela equipe técnica (ex: `billing-qa@birthhub360.com`). Todos os testes em *Live Mode* ocorrem apenas dentro deste Tenant.

### Estratégia 2: O Modelo "Penny Test" e Estorno Automático
- Em vez de testar a compra de um plano anual de $5.000, um plano oculto de testes (ex: "QA Smoke Plan - $1") deve ser criado no Stripe (ou usar cupons de desconto de 99%).
- O QA efetua a compra de baixo valor usando um cartão corporativo isolado (Cartão Virtual de Despesa).
- Imediatamente após a validação do webhook `invoice.paid`, o QA dispara o comando de estorno (Refund) ou a conta já possui um *script* que estorna transações sob o Tenant de QA no final do dia. Estornos evitam a tributação definitiva e zeram a métrica irreal no fim do mês.

### Estratégia 3: Shadow Traffic (Dark Launching)
- Para grandes mudanças de infraestrutura de faturamento (ex: mudar a fórmula de agrupamento de *Overage*), a funcionalidade deve rodar primeiro de forma silenciosa ("Shadow"). O sistema calcula a nova métrica, salva no banco e gera um log do que *teria faturado*, mas não dispara o comando na API do Stripe. Após uma semana de comparação analítica garantindo que a matemática está precisa, o "botão é ligado".