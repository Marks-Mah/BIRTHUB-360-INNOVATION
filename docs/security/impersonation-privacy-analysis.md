# Análise de Privacidade de Impersonation

## Riscos na Visão do Suporte (Customer Success)
Quando um atendente de CS (funcionário do BirthHub 360) usa a função "Impersonate" e loga como o "Gestor do Tenant", ele teoricamente vê a mesma interface que o cliente. Isso cria enormes riscos de LGPD.

## O que o CS NÃO deve ver (Dados Protegidos)

1. **PII de Leads Finais (Usuários B2C):**
   - Na tela de "Histórico de Chats", o cliente pode ver que o "Joãozinho (joao@gmail.com)" perguntou sobre dívidas.
   - **Mitigação UI:** No modo Impersonation, a API deve ofuscar ativamente nomes e contatos. O CS verá "User_45A" conversou com o Agente. O objetivo do CS é avaliar o comportamento do Agente (O Prompt falhou?), e não fazer engenharia social com os leads do cliente.
2. **Dados de Faturamento e Cartões:**
   - Telas de Billing devem ser bloqueadas com "Acesso Restrito: Modo Impersonation" ou ocultar o final do cartão e as faturas geradas.
3. **Chaves de API Privadas (Secrets):**
   - Se o cliente inseriu a Chave da OpenAI ou do Twilio dele, o input field deve ser renderizado como "Password" mascarado (`********`), impossibilitando que o CS copie a chave do cliente.

## Conclusão
O Modo Impersonation no BirthHub 360 não é um "Login Direto" com a senha do cliente. É uma view filtrada pelo backend que carrega a estrutura do Tenant B2B removendo PII antes de renderizar no navegador do funcionário de CS.
