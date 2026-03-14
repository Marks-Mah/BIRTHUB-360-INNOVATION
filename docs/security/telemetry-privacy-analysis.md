# Análise de Privacidade em Telemetria (LGPD/GDPR)

## O Desafio B2B
Ao inserir SDKs de analytics (como Google Analytics, Datadog RUM ou Mixpanel) no painel de controle ou no Widget de Chat (virado para o cliente final), coletamos dados intrinsecamente. É vital diferenciar dados de *comportamento* de dados *pessoais* (PII).

## Diretrizes de Coleta de Dados

1. **Painel do Gestor (Dashboard do Tenant):**
   - **O que coletamos:** Cliques em botões, tempo gasto em páginas, uso de features (telemetria de produto).
   - **PII:** O e-mail do Gestor é vinculado ao seu `user_id` na ferramenta de Analytics para fins de Customer Success e Onboarding.
   - **Consentimento:** Coberto pelos "Termos de Serviço" (ToS) corporativos e legítimo interesse em melhorar o serviço.

2. **O Widget de Chat do Agente (Usuário Final / Lead):**
   - **O que coletamos:** Quantidade de mensagens trocadas, duração da sessão de chat.
   - **O que NÃO DEVE ser enviado ao Analytics (PII Stripping):** O nome do Lead, CPF, E-mail ou o CONTEÚDO da conversa.
   - **Implementação:** O Backend do BirthHub deve atuar como proxy. O widget dispara `Chat Started` anônimo. O conteúdo da conversa (que pode ter dados sensíveis de saúde/finanças de terceiros) fica restrito ao banco transacional criptografado do BirthHub, não indo para o Mixpanel/Amplitude em texto plano.

## Consentimento Necessário (Cookie Banner)
Para o site institucional do BirthHub, um banner de consentimento explícito é obrigatório. Para o Widget de Chat embutido no site dos clientes (Tenants), a responsabilidade de obter consentimento do lead é do Tenant, mas o BirthHub deve fornecer os meios técnicos (ex: `BirthHubWidget.init({ requireConsent: true })`).
