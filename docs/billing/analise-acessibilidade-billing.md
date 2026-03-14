# Análise de Acessibilidade da Página de Billing (a11y)

Para garantir que o BirthHub360 atenda às diretrizes do WCAG 2.1 AA (mínimo exigido para B2B Enterprise em muitas jurisdições, e boa prática universal), a UI de Faturamento e Checkout deve ser analisada meticulosamente. Falhas de acessibilidade em tabelas de preços e modais de pagamento são barreiras críticas para usuários com deficiências.

## 1. Contraste e Uso de Cores
O faturamento lida com informações vitais de segurança e alertas (Cartão Recusado, Inadimplência, Sucesso).
- **Erro Crítico Comum:** Usar apenas a cor para indicar estado (ex: apenas a borda do input do cartão fica vermelha em caso de erro, sem ícone ou texto claro).
- **Diretriz de Contraste:** O texto principal e os preços dos planos ($149, $399) devem ter uma taxa de contraste de pelo menos `4.5:1` contra o fundo. Se um plano estiver "desativado" (disabled) para downgrade, o cinza deve manter contraste mínimo de legibilidade (`3:1`).
- **Estado de Foco:** Ao navegar com teclado pela tabela de preços, o botão "Escolher Plano" ativo deve ter um `outline` (focus ring) visualmente óbvio (ex: anel azul de 2px).

## 2. Leitura de Telas (Screen Readers)
Tabelas de preços B2B costumam ser matrizes complexas (Linhas = Features, Colunas = Planos). Para usuários cegos ou de baixa visão utilizando NVDA ou VoiceOver:
- **Tabelas Acessíveis:** As *Pricing Tables* não podem ser implementadas usando um monte de `<div>` empilhadas com CSS Grid sem papéis semânticos. Elas devem usar tags `<table>`, `<th>` para os planos com `scope="col"`, e `<th>` para as features com `scope="row"`.
- **Aviso de Iframe (Stripe):** O modal de pagamento do Stripe injeta um `<iframe>`. O botão que o abre deve ter `aria-haspopup="dialog"`. O foco do teclado deve ser capturado (*focus trap*) dentro do iframe de pagamento até ser cancelado ou concluído.
- **Labels Ocultas:** Botões com ícones de "+ / -" para adicionar usuários devem ter um `aria-label="Adicionar usuário"` ou `<span class="sr-only">`.

## 3. Clareza Cognitiva e Formulários
- **Desativação de Timeout:** Por envolver tomada de decisão financeira e busca por cartões, sessões não devem expirar silenciosamente em curtos períodos de tempo (menos de 20 minutos).
- **Tratamento de Erros de Cartão:** Se o Stripe retornar um `card_declined`, a mensagem de erro deve ser injetada em um container com atributo `role="alert" aria-live="assertive"`, forçando o leitor de tela a enunciar o erro imediatamente sem que o usuário precise procurar a mensagem visualmente.
- **Microcópia Simples:** Evitar jargões desnecessários na tela de confirmação de compra, mantendo a linguagem no nível A2 (simples e direta).