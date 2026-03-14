# Política de Gestão de Dados Financeiros e Cobrança

O ecossistema BirthHub360 não é um banco, mas processa e armazena metadados de pagamentos corporativos essenciais. A manipulação de PII (Personally Identifiable Information) financeiro exige governança restrita para conformidade com a LGPD e regras do PCI-DSS, minimizando o risco de vazamentos.

## 1. Escopo de Retenção de Dados Financeiros
O que nós armazenamos internamente (Banco de Dados):
- `stripe_customer_id`, `stripe_subscription_id`, `stripe_payment_method_id`
- Status do plano, valores das faturas (invoices)
- E-mail e Nome do contato financeiro (Billing Admin)
- CNPJ/CPF do contratante (para fins de Nota Fiscal)

O que **NÃO** armazenamos em hipótese alguma (Delegado ao Stripe):
- Números de Cartão de Crédito (PAN)
- Códigos de Segurança (CVV/CVC)
- Datas de Expiração do Cartão

## 2. Política de Acesso Interno (RBAC)
O acesso aos dados financeiros dos clientes B2B deve respeitar o princípio do menor privilégio.

- **Desenvolvedores/Engenharia:** Têm acesso apenas a tabelas anonimizadas em ambiente de staging. Acesso direto ao banco de produção é vedado, exceto por procedimento de "break-glass" audível via Bastion Host.
- **Time de Suporte / Atendimento (CS/SDR):** Não podem ver a Dashboard do Stripe. Acessam apenas o "Painel Admin do BirthHub360", que exibe de forma "Read-Only" se a conta do cliente está `active` ou `past_due`, permitindo-lhes engajar com o cliente.
- **Time Financeiro/RevOps:** Possuem acesso à visualização (View-only) da Dashboard do Stripe (Live Mode) com MFA (Múltiplo Fator de Autenticação) ativado obrigatoriamente.
- **Fundadores/Diretores:** Possuem privilégio de "Admin" no Stripe (capazes de processar reembolsos, emitir faturas manuais e alterar webhooks).

## 3. LGPD: Retenção e o "Direito ao Esquecimento"
A LGPD estabelece regras sobre quando podemos ou não reter os dados do titular.

- **Durante a vigência do contrato:** O consentimento é justificado pela base legal de "Execução de Contrato" (Art. 7º, V).
- **Após o cancelamento (Direito ao Esquecimento):** Se um usuário solicitar a exclusão de seus dados (Wipe), todos os dados comportamentais e os dados inseridos nos agentes (CRMs) serão apagados.
- **Exceção Financeira Obrigatória:** Os dados de faturamento (Nome, Endereço, Documento, Valores Pagos e Recibos) associados àquela empresa/indivíduo **NÃO SERÃO APAGADOS**, sendo retidos pelo prazo de até 5 anos (ou o período exigido pelas leis fiscais do país de incorporação da BirthHub360) para atendimento à "Obrigação Legal ou Regulatória" (Art. 7º, II).
- **Anonimização no Analytics:** O histórico financeiro retido (ex: *LTV de um cliente cancelado*) terá os identificadores pessoais ofuscados do Data Warehouse analítico assim que a conta for encerrada, restando no banco transacional isolado apenas para eventuais auditorias governamentais.