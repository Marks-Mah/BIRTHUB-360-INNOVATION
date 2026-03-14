# Critérios de Escalonamento: KB para Suporte Humano - BirthHub 360

## Objetivo
Definir o processo e os gatilhos exatos (triggers) que movem um usuário de um fluxo de autoatendimento (Lendo a Knowledge Base / Interagindo com Bot de Suporte) para um ticket com um agente humano de Customer Support (CS).

## A Jornada de Suporte Padrão (Tier 0 -> Tier 1)
O BirthHub 360 adota a filosofia de "Deflection by Default" (Desvio por Padrão). O usuário deve sempre passar pela pesquisa da KB ou pelo Bot de IA antes de abrir um ticket, *exceto* em cenários críticos predefinidos.

## Gatilhos de Escalonamento Automático (Quando escalar?)

O sistema (Chatbot In-App ou Portal) deve transferir o usuário para um humano imediatamente, sem forçar mais artigos, quando:

### 1. Loop de Frustração (Fricção Alta)
- **Critério:** O usuário marca 2 artigos consecutivos como "Isto não resolveu meu problema" (Thumbs down) em uma janela de 10 minutos.
- **Ação:** O widget de chat altera o estado para: *"Vejo que os artigos não estão ajudando. Conectando você a um especialista de RevOps..."*

### 2. Palavras-Chave Críticas (Intenção de Risco)
- **Critério:** O usuário digita no campo de busca ou no chatbot palavras como: `cancelar conta`, `vazamento`, `processo legal`, `LGPD`, `reembolso`, `cobrança indevida`, `API caiu`.
- **Ação:** Bypass (pulo) total da KB. O ticket é aberto com prioridade "Urgent" e roteado para as filas de CS ou Financeiro.

### 3. Falhas Comprovadas de Backend (Erros 5xx)
- **Critério:** Se a telemetria do usuário disparar um erro de servidor (HTTP 500+) enquanto ele tenta executar uma ação e, logo em seguida, ele abrir a tela de suporte.
- **Ação:** O sistema não sugere artigos genéricos. O humano já recebe o ticket preenchido com o log do erro técnico.

### 4. Status do Cliente (Tier Enterprise)
- **Critério:** Contas sinalizadas no banco de dados como "VIP" ou "Enterprise" que pagam pelo plano de SLA Premium.
- **Ação:** A interface exibe o botão "Falar com CS" (Live Chat) sem esconder atrás do campo de busca obrigatório da KB.

## Como a Transferência Deve Ocorrer (UX do Escalonamento)
- **Nunca perca o contexto:** Quando o humano assumir, o ticket deve conter o histórico dos artigos lidos pelo usuário nos últimos 15 minutos.
- **Mensagem Clara:** O usuário não deve achar que ainda está falando com um robô. A transição deve ser clara: *"Transferindo para [Nome do Humano]... O tempo de resposta atual é de X minutos."*
