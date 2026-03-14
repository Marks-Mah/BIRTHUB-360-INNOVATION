# Análise de Risco: Instalação de Conectores Mal-Configurados

No processo de instalação de um Agent Pack ("Wizard"), a etapa mais suscetível a erros de usuário é o input de credenciais (Passo 2.2). Este documento explora os riscos de uma configuração malfeita e a importância do *Fail-Fast*.

## O Problema da Falha Silenciosa ("Silent Failure")
*   **Cenário:** O usuário finaliza o Wizard colocando uma API Key do Jira com um espaço em branco no final, ou insere o ID do Workspace incorreto.
*   **Comportamento Ruim:** O Wizard diz "Instalado com Sucesso". O agente começa a receber webhooks no orquestrador e tenta criar tickets. O conector subjacente do Jira falha com HTTP 401. O agente, desenhado para ser autônomo, "suprime" o erro, relata no histórico que "O Jira não funcionou hoje" e segue o fluxo, mandando um e-mail incompleto pro cliente final.
*   **Consequência:** Adoção frustrada. O cliente passa semanas achando que a IA é burra, quando na verdade era apenas uma chave inválida.

## A Solução: Erro Claro e Validado (Fail-Fast Validation)

### 1. Teste de Vida (`/ping` ou `/me`) no Setup
Nenhum conector deve ser aceito na base do Tenant (salvo no banco de dados) sem uma chamada de validação instantânea.
*   *Mecânica:* Assim que o usuário insere a chave e clica em "Avançar", o Backend chama uma rota inofensiva do provedor externo (ex: `GET /v3/users/me` no Hubspot).
*   *Se falhar:* A UI bloqueia o avanço com uma tarja vermelha e a mensagem bruta retornada ("Unauthorized - Invalid Key Format").

### 2. Notificação Pró-ativa de Desconexão
Se um token OAuth2 for revogado ou expirar e o refresh token não funcionar:
1.  O Conector emite o evento `Event.CONNECTOR_FAILED_AUTH` para o Message Broker (RabbitMQ/BullMQ).
2.  O Tenant Admin recebe instantaneamente um E-mail e um In-App Alert: "O seu Agente Financeiro parou porque a conexão com o Stripe expirou. Clique aqui para reconectar".
3.  O Agente é pausado (`state: suspended_auth`) automaticamente para não queimar tokens LLM tentando rodar no vazio.

## Conclusão
Configurações de integração não podem assumir que o ambiente de execução lidará com os erros. O rigor (Hard Fail) durante a interface de instalação é vital para a operação saudável da Plataforma.
