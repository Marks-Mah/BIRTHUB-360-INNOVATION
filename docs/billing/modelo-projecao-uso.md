# Modelo de Projeção de Uso (Estimativa de Overage)

Para evitar sustos na fatura ("Bill Shock") e proteger a margem em caso de clientes abusivos ou comprometidos, o BirthHub360 utiliza um modelo de projeção linear em tempo real. O modelo estima qual será o custo variável no final do mês com base no padrão de consumo diário atual, permitindo ações proativas tanto pelo cliente quanto pelo sistema.

## 1. A Fórmula de Projeção (Run Rate)

A projeção se baseia na taxa média diária de consumo (Velocity) desde o início do ciclo de faturamento atual até a data de hoje.

**Variáveis:**
- `uso_atual`: Unidades consumidas até agora (ex: 4.500 interações).
- `dias_passados`: Dias corridos desde o início do ciclo atual (ex: 10 dias).
- `dias_totais_ciclo`: Total de dias do ciclo faturado (ex: 30 dias para mês cheio).
- `franquia_gratis`: O limite incluso no plano base (ex: 2.500 interações no plano Growth).

**Cálculo da Projeção de Fim de Mês (EOM):**
```
uso_projetado = (uso_atual / dias_passados) * dias_totais_ciclo
uso_projetado_excedente = MAX(0, uso_projetado - franquia_gratis)
custo_projetado_overage = uso_projetado_excedente * preco_unitario
```

*Exemplo:* No dia 10, o cliente usou 4.500 unidades.
- *Taxa diária:* 450 un/dia.
- *Projeção (30 dias):* 13.500 unidades.
- *Excedente (Overage):* 13.500 - 2.500 = 11.000 unidades extras.
- *Custo Projetado a $0.10/un:* **+$1,100.00** adicionais na próxima fatura.

## 2. Ações Baseadas em Alertas (Thresholds)

Quando o modelo de projeção atinge certos limites financeiros, o sistema dispara fluxos automatizados (Alertas de FinOps):

| Limite Projetado/Atual | Ação do Sistema | Responsável |
|------------------------|-----------------|-------------|
| **75% da Franquia** atingida | E-mail simples: "Seu uso base está no fim. A partir de agora, você começará a pagar $X por interação." | Sistema (Automático) |
| **100% da Franquia** atingida | Banner In-App Amarelo + E-mail. Notifica o início efetivo da cobrança adicional. | Sistema (Automático) |
| **Projeção de > $500 extras** e cliente possui plano de entrada | Alerta interno no Slack (Canal #billing-alerts) indicando cliente com anomalia de uso. Agente SDR cria ticket sugerindo Upgrade de plano. | Suporte/Vendas (Proativo) |
| **Projeção > 3x o histórico** (Spike Súbito em 24h) | O sistema pausa temporariamente as automações, suspeitando de um *loop infinito* em integrações ou invasão na conta. Exige login e confirmação manual para destravar ("Seu Agente consumiu de forma anormal hoje"). | Sistema (Segurança) |

## 3. Feedback na Interface de Usuário
O Painel de Faturamento (`/billing`) do cliente deve sempre exibir um gráfico visual:
- Uma barra verde de progresso preenchendo o `uso_atual`.
- Uma barra pontilhada até o final que marca o `uso_projetado`, com a cifra predita em Dólar/Real ao lado. Isso devolve o controle e a transparência ao administrador da conta corporativa.