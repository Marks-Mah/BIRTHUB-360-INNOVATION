# Casos de Uso Reais dos Templates - BirthHub 360

## Objetivo
Validar a utilidade prática de cada template ("Pack") de agente oferecido no catálogo público do BirthHub 360, documentando cenários fictícios, porém realistas, de adoção B2B.

## 1. Template: SDR Inbound Responder
**Empresa Fictícia:** TechCloud Solutions (SaaS B2B).
**Dor:** Recebem 500 leads inbound mensais. Os SDRs humanos levam até 12 horas para responder, o que esfria o lead e reduz a conversão de agendamento de reuniões.
**Como o Template Resolve:** O Agente "SDR Inbound Responder" analisa a solicitação no HubSpot em tempo real. Se o lead tiver "Fit", o agente envia automaticamente um e-mail personalizado em até 3 minutos contendo um link do Calendly para agendamento com um AE. Se não tiver Fit, insere o lead em um fluxo de nutrição.
**Valor Gerado:** Redução do SLA de resposta de 12 horas para 3 minutos, resultando num aumento documentado de 30% nas reuniões agendadas.

## 2. Template: Pipeline Hygiene Auditor (Sales Ops)
**Empresa Fictícia:** GlobalLogistics Inc.
**Dor:** Vendedores (AEs) esquecem de atualizar a data de fechamento (Close Date) ou o próximo passo (Next Step) no CRM, causando erros grosseiros na previsão de vendas da diretoria (Forecast).
**Como o Template Resolve:** O Agente de Sales Ops escaneia o Salesforce todas as sextas-feiras às 16h. Ele identifica oportunidades com Close Date no passado e sem atividades nos últimos 7 dias. Envia um resumo no Slack (ou Teams) marcando os AEs responsáveis com links diretos para atualização.
**Valor Gerado:** Maior precisão de forecast e economia de 10 horas semanais do gerente cobrando a equipe manualmente.

## 3. Template: Churn Risk Predictor (Account Manager)
**Empresa Fictícia:** HRTech Pro.
**Dor:** Renovações de contrato são perdidas porque os Account Managers não conseguem monitorar proativamente a queda de uso da plataforma por 2.000 clientes.
**Como o Template Resolve:** O Agente analisa os logs de telemetria diariamente. Se um cliente "Tier 1" apresentar queda de login > 40% em 14 dias, o agente abre um ticket urgente no Zendesk com o playbook sugerido para o AM ligar e intervir.
**Valor Gerado:** 15% de redução na taxa de churn (Gross Revenue Retention aumentada) ao agir antes do cliente pedir cancelamento.
