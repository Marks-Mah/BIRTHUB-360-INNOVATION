# Análise de Privacidade em Telemetria de Produto (LGPD) - BirthHub 360

## Objetivo
Analisar a conformidade legal (especialmente LGPD e GDPR) na coleta de dados comportamentais via telemetria no frontend e backend, garantindo que o BirthHub 360 não capture Informações Pessoalmente Identificáveis (PII) inadvertidamente.

## 1. Tipos de Dados em Telemetria: O que coletamos?
O plano de telemetria baseia-se puramente em cliques de botões, navegação de páginas e status de ações dos agentes (Ex: `agent_activated`).

### Dados Explicitamente Proibidos (Blacklist da Telemetria)
As ferramentas de Product Analytics (Mixpanel, Amplitude, PostHog) no BirthHub 360 estão configuradas para **nunca** receber os seguintes dados sob nenhuma propriedade customizada:
- Nomes completos de Leads ou Contatos do CRM.
- Endereços de E-mail de clientes finais (apenas IDs hasheados ou o domínio da empresa, `*@empresa.com`, podem ser usados para análise B2B agregada).
- Números de telefone.
- Conteúdo livre (Free-text) preenchido em caixas de mensagem pelo usuário. (Um usuário poderia digitar uma senha ali sem querer, então o evento só captura "mensagem_enviada: true", não o conteúdo).

### O Papel do "Data Masking" no Frontend
Se a telemetria envolver gravação de sessão (Session Replay via ferramentas como Hotjar), todas as `<input>`, `<textarea>` e tabelas contendo dados de CRM recebem a classe CSS `.block-recording` ou `data-hj-suppress`, que transforma o texto em asteriscos no vídeo gravado para os nossos desenvolvedores.

## 2. Bases Legais e Consentimento (LGPD)

O BirthHub 360 atua com telemetria baseada em duas premissas:

### A. Legítimo Interesse (Telemetria Anônima e Agregada)
Para a coleta de eventos puros de navegação que não identificam o usuário (apenas um `device_id` ou `tenant_id` anônimo), o BirthHub se baseia em Legítimo Interesse para melhorar a segurança e a performance da plataforma (Prevenção de fraudes e análise de travamentos).

### B. Consentimento Explícito (Tracking Identificado e Cookies)
Quando o `user_id` é atrelado ao comportamento no painel (para o Customer Success saber que *aquele usuário específico* não está usando a plataforma), isso exige um Cookie Banner de Opt-In na primeira sessão de Onboarding.
- **Opt-out:** O usuário pode a qualquer momento acessar as Configurações de Privacidade e desativar o "Product Tracking". Quando ativado, o SDK de telemetria é inicializado em modo "Anonymous", gerando UUIDs randômicos por sessão que não podem ser ligados ao e-mail real do usuário.
