# Métricas de Sucesso da Página de Billing (KPIs)

Para avaliarmos se o design da UX de Billing (Item 7.7.J1) e a Modelagem de Planos (Item 7.1.J1) estão funcionando, precisamos monitorar ativamente o comportamento dos usuários dentro do portal `/billing`. As seguintes métricas serão rastreadas via ferramentas de product analytics (como PostHog, Mixpanel ou Amplitude).

## 1. Funil de Conversão (Trial para Pago)
O objetivo principal da página de billing para novos usuários.

- **Checkout View Rate (CVR):** Porcentagem de usuários Trial que clicam em "Upgrade" e visualizam o modal do Stripe Checkout. (Meta: > 15%).
- **Checkout Completion Rate (CCR):** Dos que abriram o modal do Stripe, quantos finalizaram o pagamento com sucesso. Avalia o atrito na inserção do cartão. (Meta: > 80%).
- **Time to Upgrade:** Média de dias que um usuário leva para assinar um plano desde o dia 1 do Trial. (Geralmente picos ocorrem no D+1 e D+13).

## 2. Movimentação de Planos (Upgrades & Downgrades)

- **Expansion MRR (Net Revenue Retention):** Aumento de faturamento originado de clientes da base atual clicando em "Adicionar Seats" ou mudando de plano, sem envolver a equipe de vendas (Self-Service Expansion).
- **Taxa de Downgrade Voluntário:** Quantos usuários ativamente vão na página de billing e escolhem reduzir o plano. Se esta taxa for muito alta, indica que a diferença de "Percepção de Valor" entre os *tiers* não está clara ou não justifica o preço.
- **Paywall Conversion Rate:** Quando um usuário de plano inferior tenta acessar uma feature premium e vê o Paywall (Banner de Bloqueio), qual a porcentagem que clica em "Ver Planos" e efetiva o Upgrade. (Se for menor que 1%, o Paywall está sendo ignorado ou a feature não é atraente).

## 3. Saúde do Overage (Uso Excedente)

O BirthHub360 tem um modelo híbrido e depende do overage saudável:

- **Overage Activation Rate:** Porcentagem de clientes pagantes que ultrapassam sua "Franquia Base" no mês. Indica adoção profunda do produto. (Meta: 30-40% dos clientes). Se estiver em 0%, nossos limites base estão altos demais e estamos perdendo dinheiro de LLM. Se estiver em 95%, nossos limites base são uma mentira (clientes odiarão).
- **Projeção vs Disputa:** Relação entre faturas de *overage* altas (>$500) e a abertura de tickets de suporte / cancelamentos no mesmo mês. Um Overage saudável não gera atrito (o cliente entende o valor gerado).

## 4. Autoatendimento e Atrito

- **Billing Support Ticket Ratio:** Número de tickets de suporte com a tag "Dúvida de Fatura", "Reembolso" ou "Erro de Cartão" dividido pelo total de clientes ativos.
- **In-App Invoice Downloads:** Quantas Invoices ou Notas Fiscais são baixadas diretamente pelo portal `/billing/history` pelos clientes, comprovando que o Self-Service está mitigando chamados manuais do financeiro.