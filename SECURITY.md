# Security Policy (Política de Segurança)

Nós levamos a segurança do ecosistema **BirthHub 360** a sério. Mantemos uma plataforma de infraestrutura com Agentes de Inteligência Artificial para operar faturamentos, leads e documentações comerciais críticas. Agradecemos qualquer contribuição responsável de pesquisadores de segurança.

## Versões Suportadas

Aplicamos patches de segurança com prioridade para as versões atualmente rodando em nosso monorepo (principal branch `main` implementada no Cloud Run e versões estáveis das nossas APIs).

| Versão da API | Status de Suporte | Atualizações Críticas |
| ------------- | ----------------- | --------------------- |
| `v1` (Atual)  | Suportada         | Sim                   |
| `beta`        | Suportada         | Sim                   |

> **Nota:** Versões ou pacotes descontinuados nos branches antigos não receberão atualizações retroativas a não ser por força maior de compliance.

## Reportando uma Vulnerabilidade (Responsible Disclosure)

Se você acredita ter encontrado uma falha de segurança no repositório BirthHub 360 (ex: Injeção de SQL, vazamento em um endpoint GraphQL/REST da API, Prompt Injection Severo que cause Extração de PII por parte do Agente LLM, ou bypass em um Auth Middleware), pedimos **encarecidamente** que siga nosso processo de divulgação responsável:

1. **NÃO crie uma issue pública no GitHub.** As falhas expostas publicamente são um risco real e severo aos nossos clientes antes que possamos criar o patch.
2. Envie um e-mail com os detalhes do seu achado para: **security@birthhub360.com**
3. **O que incluir no seu relatório:**
   - Descrição clara da vulnerabilidade e seu impacto.
   - Provas de conceito (PoC) simples, em texto, código ou vídeo, demonstrando como ela funciona no ambiente.
   - Ferramentas e versões do seu ambiente.
4. **Tempo de Resposta:** Nossa equipe fará a triagem do relatório em até **48 horas úteis**, comunicando a gravidade confirmada, e estabeleceremos uma cronologia razoável (tipicamente dentro de 1 a 7 dias) para efetuar o conserto (`hotfix`) antes da publicação de qualquer boletim de segurança (CVE).

## Escopo Fora de Perigo (Out of Scope)

As seguintes práticas são proibidas durante suas investigações:

- Realizar ataques de Denial of Service (DoS / DDoS) em nossos endpoints ou esgotamento do pool de conexões (BullMQ/Redis).
- Exaurir recursos do provedor (Token Draining na OpenAI enviando mega payloads) propositalmente.
- Engenharia social ou phishing contra funcionários do BirthHub.
- Acesso indevido a dados de terceiros; se você confirmar a quebra do _Tenant Isolation_, extraia apenas o que pertencer a uma conta de teste que você mesmo provisionou (ou dados mock) como prova.

Agradecemos a colaboração em manter o BirthHub 360 um ambiente B2B seguro para o mercado de RevOps.
