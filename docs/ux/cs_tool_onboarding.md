# Onboarding de Novos CSMs na Ferramenta Interna - BirthHub 360

## Objetivo
Definir o processo de integração (onboarding) para novos agentes de Customer Success (CSMs) contratados pelo BirthHub 360, garantindo que saibam usar o painel administrativo (Admin Panel) de forma segura, ética e eficiente.

## O "Dia 1" do CSM no Painel de Admin

Ao receber seu login do Google Workspace corporativo, o CSM é automaticamente provisionado (via SSO/SAML) no painel administrativo interno do BirthHub 360 com o perfil de "Junior CSM".

### Permissões Restritas Padrão (Junior CSM)
- Pode visualizar Health Scores e Dashboards Globais.
- Pode ler tickets de suporte assinalados a ele.
- **NÃO** possui o botão de "Impersonation" habilitado.
- **NÃO** pode aplicar cupons de desconto ou alterar regras de Billing (Estes exigem aprovação de um "Senior CSM" ou "CS Manager").

## Treinamento e Certificação (Semana 1)

Antes de ter seus privilégios elevados, o CSM deve concluir o seguinte fluxo:

1. **Leitura Obrigatória:**
   - `impersonation_policy.md`: Para entender a gravidade de acessar dados de clientes.
   - `health_score_model.md`: Para entender como o sistema prioriza o trabalho diário dele.
   - `cs_playbook_risk_bands.md`: Para saber exatamente o que escrever para o cliente dependendo da cor do alerta.

2. **Simulação ("Flight Simulator"):**
   - O CSM será logado num Tenant de demonstração (Dummy Tenant) e deverá executar tarefas típicas de suporte:
     - Encontrar o log de erro que mostra por que a IA não enviou um e-mail.
     - Resetar a conexão "falsa" do HubSpot.
     - Praticar a ativação do modo de "Quebra-Vidro" (Break-Glass) preenchendo as justificativas corretas.

3. **Certificação Prática (Shadowing):**
   - Na primeira semana resolvendo tickets reais, o Junior CSM deve compartilhar a tela com um Senior (Shadowing) durante pelo menos 3 sessões de impersonation com clientes reais.

## Aprovação de Acesso Pleno
Após a conclusão do processo e do período de experiência (30 dias), o CS Manager altera a Role no sistema IAM para "CSM Pleno", destravando a ferramenta de Impersonation (com as regras de mascaramento detalhadas na política).
