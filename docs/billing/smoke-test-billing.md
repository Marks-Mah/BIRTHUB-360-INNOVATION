# Processo de Smoke Test de Billing em Produção

O ecossistema financeiro do BirthHub360 não pode ficar longos períodos quebrado. Um erro num deploy que impeça o formulário do Stripe de carregar custa caro a cada minuto (Loss of Expansion Revenue). O *Smoke Test* em produção serve como uma sentinela avançada para detectar quebras de integração imediatamente.

## 1. Frequência dos Testes Sintéticos

O *Smoke Test* de faturamento é um *Synthetic Monitor* automatizado que simula a jornada do usuário de ponta a ponta em um ambiente vivo.

- **Deploy Trigger:** O smoke test roda obrigatoriamente logo após todo deploy que envolva mudanças na pasta `apps/dashboard/src/app/billing` (Frontend) ou no `webhook-receiver` (Backend).
- **Scheduled Ping:** Além do deploy, ele roda de hora em hora (via cronjob no GitHub Actions ou AWS CloudWatch Synthetics) para garantir que a API do Stripe não esteja sofrendo instabilidades.

## 2. O que o Smoke Test Valida?

O bot (escrito em Playwright) faz login na conta controlada de QA (`billing-qa@birthhub360.com`) no ambiente de Produção e executa as seguintes interações básicas de leitura/configuração (não faz compras irreais a cada hora):

1. **Acesso à Página:** Garante que a página `/billing` não retorna erro 500 ou "White Screen of Death".
2. **Carregamento da Tabela de Preços:** Verifica se os preços (buscados via API) estão renderizando corretamente (garante que a API Key do Stripe está válida).
3. **Stripe Elements Injection:** Clica em "Adicionar Cartão" e valida que o `iframe` do Stripe carrega em menos de 3 segundos (garante que o WAF e CSP não estão bloqueando o script de terceiros).
4. **Overage API:** O bot faz um GET na rota de métricas de Overage do mês atual e espera um JSON válido, não um erro interno (garante que a agregação Redis -> PostgreSQL está funcionando).

## 3. Alertas de Regressão Crítica (Incident Response)

Se qualquer um dos passos do Smoke Test falhar:

1. O script gera um screenshot do erro visual encontrado pelo Playwright.
2. Dispara um Webhook para o **OpsGenie / PagerDuty** alertando o Plantonista de Engenharia (On-Call Engineer) de nível "Sev-1".
3. Envia uma mensagem urgente para o canal `#alerts-billing-prod` no Slack com o link do log de execução.
4. **Rollback Automático (Opcional):** Se o teste for acionado imediatamente após um deploy e falhar de forma cataclísmica, a CI/CD pode disparar um rollback automático para a imagem de contêiner anterior.

## 4. O "Real Deal" Smoke Test (Mensal)
A cada 15 dias, a equipe de QA executa o "Penny Test" manual (conforme descrito no Risco de Teste em Produção), onde uma compra real de $1 com estorno imediato é feita, varrendo os webhooks ponta-a-ponta para garantir que o webhook receiver consegue escrever no banco de dados Master de Produção sob as permissões atuais.