# Checklist de Migração de Versão para Tenants (Upgrade/Breaking Changes)

## 1. Contexto e Uso (Homologação de Upgrade de Plataforma)
Sempre que o BirthHub360 anunciar uma grande atualização de plataforma que envolva *Breaking Changes* na API principal, no SDK de criação de Agentes ou na estrutura do `manifest.yaml` (ex: migração da versão `v1` para `v2`), os Administradores de TI/Segurança dos Tenants devem executar o plano de migração de forma segura para evitar interrupções de serviço.

Apesar do BirthHub360 garantir a coexistência (SLA de 6 meses - ver ADR-030), a adoção imediata da nova versão é altamente recomendada devido a melhorias de performance e segurança.
Este documento lista as validações mínimas (Checklist) que a equipe técnica de um Tenant (Cliente) deve executar antes, durante e após forçar a transição dos seus ambientes para a nova versão (Upgrade).

## 2. Fase Pré-Migração (O Planejamento - T-30 dias)

Antes de alterar qualquer código de integração ou rotear os Agentes de Produção para a versão `v2` da API:

*   **[1] Leitura do Changelog Oficial:** O desenvolvedor leu detalhadamente o documento de "Breaking Changes" e "Guia de Migração v1 -> v2" na documentação oficial do BirthHub360?
*   **[2] Mapeamento de Dependências (Auditoria Interna):** Quais fluxos de negócio, Webhooks, integrações via Zapier/Make ou scripts Python rodando na AWS do cliente atualmente chamam os *endpoints* `/api/v1` do BirthHub360? O cliente mapeou todos os sistemas que quebrarão se a v1 for desligada?
*   **[3] Atualização do SDK Local:** Se a equipe de desenvolvimento usa o pacote `birthhub-sdk` (NPM ou PyPI) em sua máquina local ou esteira CI/CD para criar e empacotar *Tools*, a versão atualizada `v2` da biblioteca foi instalada e testada na máquina de *Dev* de todos os engenheiros do Tenant?
*   **[4] Verificação de Compatibilidade de Packs Antigos:** Todos os Packs criados in-house (Sideloads) que dependiam da estrutura antiga do `manifest.yaml` da `v1` já foram refatorados, re-testados e importados novamente (gerando o novo Hash de Integridade) no ambiente de *Staging* do Tenant?
*   **[5] Criação de Ambiente Isolado (Sandbox):** O Tenant provisionou um ambiente de *Sandbox/Staging* limpo no BirthHub360 exclusivamente rodando o novo motor `v2` para testes de fumaça (Smoke Tests), sem tocar no ambiente `v1` de Produção?

## 3. Fase de Execução (A Janela de Manutenção e Testes - T-0)

Esta etapa envolve a transição ativa de um ambiente de *Staging* para a nova versão, homologando a integração antes do *Go-Live* em Produção.

*   **[6] Teste de Autenticação (Chaves de API):** As chaves de API antigas (Legacy Tokens) do cliente funcionam na nova versão `/api/v2` ou o BirthHub360 exigiu a geração de tokens de acesso baseados no novo padrão JWT de permissões granulares? (Se for o segundo caso, as chaves foram trocadas no cofre de senhas do cliente?)
*   **[7] Simulação de Carga Leve no Staging:** A equipe rodou testes sintéticos ou *scripts* que simulam 5-10 usuários interagindo simultaneamente com um Agente na versão `v2`?
*   **[8] Testes de Fim a Fim (E2E):** O principal caso de uso do negócio do cliente (ex: *Pipeline* de RAG + Tool de Inserção no Salesforce) foi executado com sucesso e os dados chegaram formatados corretamente no CRM de destino? A *tool* falhou com o novo formato de *payload* do orquestrador?
*   **[9] Validação de Webhooks de Retorno:** Se o BirthHub360 enviou webhooks assíncronos (ex: `agent.run.completed`) de volta para o sistema do cliente, o sistema do cliente conseguiu *parsear* (deserializar) o novo formato JSON da versão `v2` sem gerar exceções nulas?
*   **[10] Plano de Rollback Engatilhado:** A equipe de CI/CD do cliente configurou um botão ou comando reverso (ex: mudar a variável de ambiente `BIRTHHUB_API_VERSION` de `v2` de volta para `v1`) que pode ser ativado em menos de 5 minutos caso o teste falhe tragicamente?

## 4. Fase Pós-Migração (O Go-Live e Monitoramento Ativo - T+1 dia)

O upgrade foi virado na Produção (O roteamento de DNS/API ou a configuração do Agente no painel agora apontam para a versão `v2`).

*   **[11] Monitoramento de Taxa de Erro (Erro 400/500):** O administrador do Tenant está ativamente observando os gráficos de *Timeouts* e *Taxa de Falha de Tools* (Dashboard de Eficiência Executiva) na primeira hora pós-migração? Houve um salto inexplicável de erros em relação à média histórica?
*   **[12] Verificação de Qualidade Semântica (RLHF):** O modelo subjacente do BirthHub360 mudou (ex: um upgrade de LLM que foi empurrado na `v2`)? Se sim, os usuários finais (funcionários do cliente) reportaram uma queda brusca na qualidade, formatação de tabelas ou precisão das respostas (*Accuracy*) via "Thumbs Down" massivos?
*   **[13] Confirmação de Encerramento (Limpeza de Código Legado):** Após 72 horas rodando na `v2` com estabilidade total e 0 chamadas presas na `v1`, o cliente apagou/descomissionou os *scripts* provisórios de roteamento, chaves de API legadas e atualizou formalmente a sua documentação interna indicando que a migração para a `v2` do BirthHub360 foi concluída com sucesso?
