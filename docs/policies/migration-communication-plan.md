# Plano de Comunicação de Migração (Client Maintenance Window Communication)

Este documento dita a política de transparência comercial do BirthHub360 para notificar clientes existentes (Organizações) sobre a Janela de Manutenção Programada necessária para o "Cut-over" da nova Arquitetura Multi-Tenant com Segurança Nível de Linha (RLS).

Esta atualização estrutural causará downtime total temporário e exige coordenação com a rotina de trabalho (hospitais e clínicas) dos nossos clientes.

## 1. Regras de Agendamento da Janela (Timing)
*   A migração estrutural do banco de dados (Cut-over) DEVE ocorrer no período de **menor tráfego histórico global** da plataforma.
*   **Horário Padrão Aprovado:** Sábado para Domingo (Madrugada), das **01h00 às 04h00 (Horário de Brasília - BRT)**.
*   **Duração Planejada (Maintenance Window):** 3 horas (Mesmo que o RTO seja de 15 minutos e a expectativa de deploy seja 40 minutos, anuncia-se 3 horas para comportar atrasos e validações pós-deploy).

## 2. Cronograma de Comunicação (Cadência)

Para minimizar fricção e surpresas operacionais, a comunicação ocorrerá em três fases:

### 2.1. Aviso Antecipado (T-14 Dias)
*   **Canal:** E-mail direto para Administradores e "Proprietários" (Owners) das contas.
*   **Objetivo:** Permitir que as clínicas e redes programem plantões e evitem faturamentos na madrugada especificada.
*   **Conteúdo Chave:**
    *   Data e horário exatos.
    *   Motivo (Benefício para o cliente): *"Uma grande atualização de segurança e performance de banco de dados (Infraestrutura V2)."*
    *   Impacto: *"A plataforma, incluindo o acesso aos registros, APIs e automações, ficará totalmente indisponível durante o período."*

### 2.2. Lembrete de Borda (T-48 Horas)
*   **Canal:** Banner Amarelo Fixo no topo do Dashboard de todos os usuários logados. E-mail de lembrete curto para os Admins.
*   **Conteúdo Chave:**
    *   Contagem regressiva.
    *   Link para o StatusPage (Onde a atualização em tempo real acontecerá).

### 2.3. Início e Fim da Janela (T=0 e T+Final)
*   **Canal:** StatusPage Oficial (`status.birthhub360.com`) gerando notificações via e-mail e SMS (para quem optou por assinar as atualizações operacionais).
*   **Ação T=0:** Atualização manual: *"Manutenção iniciada. Nossos engenheiros estão operando as atualizações estruturais."*
*   **Ação Final:** Atualização manual: *"Manutenção concluída com sucesso. Todos os sistemas estão operacionais. Obrigado pela paciência."*

## 3. Mensagens e Scripts de Proteção (Durante o Downtime)

*   **Página de Manutenção (API e Web):** Se um usuário tentar acessar `app.birthhub360.com` durante o "Cut-over", o Cloudflare (Edge) ou o Nginx retornará uma página HTML estática amigável (Status `503 Service Unavailable` e `Retry-After: 3600`) explicando que estamos em manutenção programada e sugerindo visitar o StatusPage. Isso impede que os requests cheguem ao backend que está sendo atualizado.
*   **Tratamento de Webhooks (Inbound):** Para parceiros como Stripe (Pagamentos), a API retornará estritamente código `503`. Esses serviços são resilientes e programados para aplicar Retentativas com Backoff Exponencial (Eles reenviarão o evento horas depois, quando o BirthHub360 voltar ao ar, garantindo que não perderemos faturamentos).

## 4. Suporte Excepcional (Pós-Migração)
*   Durante as primeiras 24 horas após a janela (O Domingo Inteiro), o nível de plantão da equipe L2 (SRE/DBA) será mantido em Estado de Alerta (On-Call Enhanced).
*   A equipe de Suporte ao Cliente deve receber um script (Playbook) atualizado para responder imediatamente a tickets do tipo: *"Não consigo ver os dados do meu paciente Y desde a atualização"*. Se houver suspeita de que a migração causou perda de visibilidade (Falha do RLS ou Dados Órfãos), o ticket escalará como **SEV-1 (Emergência de Dados)** instantaneamente.