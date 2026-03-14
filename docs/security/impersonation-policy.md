# Política de Impersonation (Logar como Usuário)

## Objetivo
Permitir que agentes de Suporte/CS visualizem o dashboard exatamente como o cliente vê, para resolver problemas técnicos ou guiar a configuração ("Como faço para integrar o CRM?"), garantindo segurança e auditoria (Compliance B2B).

## Regras e Limitações

1. **Autorização Mínima:** Apenas funcionários com a role `cs_agent` ou `super_admin` podem acionar a feature de Impersonation no backoffice do BirthHub.
2. **Consentimento Explícito (Obrigatório):**
   - O botão "Log in as Tenant" ficará *desabilitado* por padrão.
   - Para habilitá-lo, o CS deve enviar um link de aprovação gerado pelo sistema ao usuário, ou o usuário deve marcar uma caixa no painel dele: `[x] Autorizar Suporte a acessar minha conta por 24 horas`.
3. **Restrição de Ações Mutáveis:** O modo "Impersonation" é estritamente **Read-Only** (Apenas Leitura) para dados transacionais.
   - O CS *pode* ver a tela de integração e orientar.
   - O CS *não pode* deletar agentes, baixar faturas ou alterar senhas em nome do cliente.
4. **Trilha de Auditoria Inviolável:** Toda sessão iniciada logará o evento `Impersonation_Started` com o ID do funcionário, IP, e tempo de duração. Esse log vai para armazenamento frio (S3/CloudTrail) e não pode ser apagado nem por Admins do banco de dados.
