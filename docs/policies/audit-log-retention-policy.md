# Política de Retenção de Logs de Auditoria (Audit Log Retention Policy)

Este documento dita as normas operacionais e financeiras de retenção (armazenamento de curto e longo prazo) para os dados da tabela de eventos de Auditoria Global (`audit.global_logs`), de modo a assegurar as exigências legais sem incorrer em custos de cloud inviáveis.

Os logs detalhados (Event Sourcing ou Access Logs) crescem exponencialmente e necessitam de expurgo e arquivamento compulsório (Purge Policy).

## 1. Exigências Legais e Custo de Storage (O Problema)
*   **Lei Marco Civil da Internet (Art. 15):** No Brasil, provedores de aplicação devem manter os registros de acesso a aplicações de internet (data, hora, IP, porta, fuso) por **seis (6) meses** sob sigilo, em ambiente controlado e de segurança, a não ser por ordem judicial que exija extensão de guarda provisória.
*   **LGPD (Accountability):** A plataforma também deve ter logs transacionais das operações sobre Dados Pessoais de terceiros, necessários em caso de incidentes (Breach Notifications - Art. 48).
*   **O Custo do Banco Operacional (Hot Storage):** Os bancos de dados relacionais transacionais (PostgreSQL/RDS) são caríssimos (NVMe). Tentar manter anos de histórico em "Hot Storage" degrada o RLS, exige particionamento complexo e custa dezenas a centenas de dólares/TB mensal.

## 2. A Política de Retenção do BirthHub360

Adotamos a estratégia arquitetural de Tiered Storage (Camadas):

### Tier 1: Retenção a Quente (Hot Database - RDS/Aurora)
*   **Período:** Logs com até **90 dias (3 meses)** de idade (`NOW() - interval '90 days'`).
*   **Acesso Direto:** Disponíveis instantaneamente para consultas rápidas na UI do cliente, APIs de filtros complexos e relatórios curtos. Estão contidos na própria base relacional (com particionamento mensal se necessário por volume `PARTITION BY RANGE (timestamp)`).
*   **Custo/Performance:** Foco em velocidade de I/O em discos caros.

### Tier 2: Retenção Arquivada (Cold Storage S3)
*   **Transição Automática (Archival Job):** Semanalmente, cronjobs de exportação transferem todos os logs do período de 91 a 180 dias de cada Tenant (e globais) do Hot Storage para o Cold Storage (Amazon S3 em formato Parquet/CSV criptografado `AES-256-GCM`). Após exportados e o checksum confirmado (Chained Hash daquele mês ser gravado seguro), os dados antigos são **fisicamente apagados (`DELETE`)** da base RDS, reduzindo pela metade o uso de disco da nuvem de produção.
*   **Período Total Garantido (Legal Minimum):** A retenção legal Mínima do BirthHub360 é de **6 meses (180 dias totais)** contados a partir do T=0 de qualquer log.
*   **Acesso Retardado (Delayed):** Se o cliente desejar pesquisar logs de 4 ou 5 meses atrás, a UI não filtrará instantaneamente em tela. O painel deve disponibilizar a requisição de um "Relatório Histórico" assíncrono. O sistema consultará as pastas do S3 e devolverá o resultado por e-mail em minutos/horas. O custo cai pra cêntimos de dólar via S3 Glacier/Standard.

### Tier 3: Purga Completa (End-of-Life / Expurgo)
*   **Período Máximo:** Após a janela legal e de conformidade contratual, os dados arquivados chegam no Fim da Vida (EOL). Os arquivos que ultrapassarem sua janela (ex: 6 meses e 1 dia no plano Base, ou 1 ano no plano Enterprise que pague Storage Adicional) sofrerão deleção definitiva.
*   **Automação Silenciosa (S3 Lifecycle Rules):** O próprio provedor de nuvem (AWS Lifecycle Policies) aplicará a deleção permanente de objetos no Bucket/S3 `Prefix: /audit-logs/` antigos sem que o software precise invocar `DELETE` manualmente (Evitando falhas humanas e custos de computação de delete).

## 3. Planos de Assinatura x Retenção Estendida (Upselling)
*   **Atenção Comercial:** A conformidade com a LGPD e Marco Civil dita que a própria plataforma BirthHub360 guarde os logs contra o cliente e o usuário (no mínimo para as requisições governamentais/policiais).
*   Se um cliente de plano Premium/Enterprise demandar políticas SOC 2 internas próprias de arquivamento para sua corporação de 3 a 5 anos, isso será faturado à parte, habilitando na AWS o envio de cópias destes logs frios para um *Data Lake* do cliente ou retendo indefinidamente nos buckets S3 do BirthHub360 com faturamento da taxa de "Storage Plus" repassada mensalmente. O RDS Hot nunca ultrapassa 90 dias por questões de limite físico transacional global de estabilidade (Shared Schema não suporta infinitos logs).