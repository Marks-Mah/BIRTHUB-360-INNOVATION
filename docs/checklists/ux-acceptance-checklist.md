# Checklist de Aceite de UX (User Experience) do Agent Studio

O **Agent Studio** é a vitrine do BirthHub360. Para garantir que a plataforma permaneça acessível para usuários não-técnicos e mantenha um padrão de classe mundial, toda nova funcionalidade (feature), tela ou componente adicionado ao Studio deve passar por este checklist de aceite antes de ser mesclado na branch principal (merge to `main`).

**Feature Analisada:** ________________________
**Product Manager / Designer:** ________________________
**Desenvolvedor Frontend:** ________________________

---

## 1. Clareza e Jargão (No-Code First)
A plataforma é voltada para Gestores de Negócio, não (apenas) para Engenheiros de IA.
*   [ ] A interface não expõe conceitos internos profundos como "LangGraph Nodes", "Vector DB Embeddings" ou "Pydantic Schemas" diretamente. Em vez disso, usa termos como "Passos", "Memória de Longo Prazo" e "Formato de Dados".
*   [ ] Onde conceitos técnicos forem estritamente necessários (ex: Temperatura do LLM), existe um *Tooltip* (ícone de ajuda `?`) explicando o conceito de forma simples e intuitiva.
*   [ ] Mensagens de erro são acionáveis e escritas em linguagem humana (ex: em vez de `HTTP 500: Tool Execution Failed`, exibe `"A integração com o Zendesk falhou. Verifique se sua senha de acesso está correta."`).

## 2. Feedback de Estado e Prevenção de Erros (Resiliência)
Usuários cometem erros. A interface deve perdoá-los e guiá-los.
*   [ ] Qualquer botão que inicie uma ação destrutiva (Deletar Agente, Remover Tool, Reverter Prompt) exige uma confirmação explícita (Modal de "Tem certeza?").
*   [ ] Ações assíncronas (ex: "Treinando Memória...", "Publicando Agente...") mostram *spinners* ou barras de progresso visíveis e desabilitam o botão de submit para evitar duplos-cliques.
*   [ ] Formulários possuem validação *inline* (no lado do cliente) em tempo real (ex: avisar que um campo de URL está inválido antes do usuário tentar salvar).

## 3. Acessibilidade (A11y)
A plataforma deve ser utilizável por todos, aderindo aos padrões mínimos WCAG 2.1 AA.
*   [ ] Todo formulário e botão importante pode ser navegado e ativado usando apenas o teclado (Tab, Enter, Espaço). Focus visível e claro.
*   [ ] A paleta de cores atende ao contraste mínimo (4.5:1 para texto regular). Testado o Modo Escuro (Dark Mode), se suportado.
*   [ ] Componentes interativos complexos (ex: o Canvas de desenho de workflow, se existir) possuem atalhos de teclado e/ou uma visualização alternativa em lista/tabela para leitores de tela.

## 4. O Fluxo do "Time to Value" (TTV)
A feature ajuda o usuário a resolver o problema dele rapidamente?
*   [ ] O usuário precisa de menos de 3 cliques partindo do Dashboard principal para acessar essa nova funcionalidade?
*   [ ] Se a feature introduz um conceito totalmente novo, ela oferece um "Empty State" rico? (ex: Em vez de uma tabela vazia de "Agentes", mostra uma ilustração e um botão grande "Criar seu primeiro Agente usando um Template").
*   [ ] As opções mais seguras e recomendadas já vêm pré-selecionadas (Sensible Defaults). O usuário só altera configurações avançadas se quiser.

## 5. Integração com o Simulador (Playground)
A confiança do usuário vem de poder testar antes de publicar.
*   [ ] Se a feature altera o comportamento de um agente (ex: edição de prompt, adição de nova tool, alteração de política), essa mudança pode ser testada no "Modo Rascunho" (Simulador) antes de afetar a produção.
*   [ ] O Simulador fornece feedback claro se a nova feature falhar (ex: "Você adicionou a tool de E-mail, mas esqueceu de conectar a conta. Clique aqui para conectar.").

## Decisão de Aceite
- [ ] **Aprovado (Ready for Release).**
- [ ] **Rejeitado (Necessita melhorias de UX detalhadas nos comentários).**
