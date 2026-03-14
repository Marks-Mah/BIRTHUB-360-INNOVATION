# Critérios de Aceite de UI (Página de Faturamento)

Este documento serve como o **Checklist Prático do Agente JULES (e da equipe de QA)** antes de aprovar o deploy de qualquer alteração na interface de usuário (UI) relacionada ao faturamento do BirthHub360 (`/billing`). Nenhuma branch será mergeada para produção sem que todos os itens abaixo estejam validados.

## 1. Checklist de Navegação e Conteúdo

- [ ] **Visibilidade do Plano Atual:** A interface exibe claramente o nome do plano atual e o status da assinatura (Ex: "Plano Growth - Ativo", ou "Plano Growth - Cancelará no final do mês").
- [ ] **Indicador de Consumo (Overage):** Uma barra de progresso visual exibe a "Franquia Consumida" (Ex: `1.500 / 2.500 interações`).
- [ ] **Estimativa da Próxima Fatura:** O valor estimado da próxima renovação é exibido em destaque, somando a base do plano atual + a estimativa de overage atualizada até a data.
- [ ] **Histórico de Faturas:** Existe uma tabela listando no mínimo as últimas 12 faturas, contendo: Data, Status (`Paga`, `Pendente`, `Falha`), Valor e um ícone ativo para Download (PDF da Invoice).

## 2. Checklist de Ações de Autoatendimento (Self-Service)

- [ ] **Adicionar Método de Pagamento:** O usuário consegue inserir um novo cartão sem ser cobrado imediatamente (apenas `SetupIntent`), e pode definir este novo cartão como "Padrão".
- [ ] **Excluir Método Antigo:** O usuário consegue deletar um cartão antigo, **desde que** exista pelo menos um cartão válido ativo se a assinatura for recorrente (ou o sistema deve alertar: "Adicione um novo cartão antes de excluir este").
- [ ] **Fluxo de Downgrade:** Ao clicar em "Cancelar" ou "Fazer Downgrade", um modal de retenção aparece (Impactos do Downgrade) exigindo confirmação explícita. A data de efetivação mostrada na tela deve ser a do "Final do Ciclo Atual", não o cancelamento imediato.
- [ ] **Modificar Informações Fiscais:** Um formulário permite que o cliente atualize os campos *Nome da Empresa na Fatura*, *CNPJ/VAT*, e *E-mail de Cobrança* (separado do e-mail de login).

## 3. Checklist de Estados de Erro (Error Handling)

- [ ] **Grace Period Visual:** Se a assinatura estiver `past_due`, uma faixa (banner) vermelha/laranja fixa aparece no topo de TODAS as telas do sistema para o Admin, apontando para a página de faturamento.
- [ ] **Stripe Elements Erros:** Se o usuário errar o CVC ou se o cartão for recusado durante uma compra, a mensagem não deve ser um modal genérico de "Erro 500". A mensagem do provedor deve ser traduzida (ex: "Fundos insuficientes. Tente outro cartão.").
- [ ] **Idempotency UI:** Ao clicar em "Pagar" ou "Confirmar", o botão entra no estado *loading* (desabilitado com spinner) imediatamente, não permitindo um duplo clique acidental.

## 4. Checklist de Responsividade e Acessibilidade (Mobile/A11y)

- [ ] **Mobile-Friendly:** A tabela de planos de preços (`Pricing Matrix`) deve se comportar de forma legível em telas pequenas (ex: cards empilhados verticalmente ou scroll horizontal com coluna de features fixada).
- [ ] **Screen Readers:** Os botões de ação ("Atualizar Cartão", "Baixar Recibo") têm foco de teclado ativado (Tab) e contêm as `aria-labels` mapeadas na Análise de Acessibilidade.