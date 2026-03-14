# ADR 011: Armazenamento de Sessão (Cookie vs LocalStorage)

## Status
Aceito

## Contexto
Ao autenticar usuários no BirthHub360, precisamos definir um mecanismo seguro para persistência do estado da sessão do cliente (JWT Access e Refresh Tokens) em aplicações web.

## Decisão
Apenas o uso de **HTTPOnly Cookies** será permitido para armazenar JWTs e dados sensíveis de sessão. O uso do LocalStorage e SessionStorage para essa finalidade está terminantemente proibido.

## Justificativa
A decisão é tomada como principal mecanismo de defesa contra vulnerabilidades **XSS (Cross-Site Scripting)**. Como o conteúdo do `localStorage` pode ser lido e extraído por qualquer script rodando na mesma origem, ataques que injetam JavaScript malicioso conseguiriam roubar os tokens facilmente. Por outro lado, cookies configurados com a flag `HttpOnly` são completamente invisíveis para o código JavaScript do lado do cliente e são transmitidos automaticamente nas requisições do navegador para os mesmos domínios permitidos, tornando o ataque inútil em cenários base.

## Configuração de Cookies
*   A flag `HttpOnly` será obrigatória.
*   A flag `Secure` será obrigatória em produção (garantindo envio apenas via HTTPS).
*   A política `SameSite=Strict` será aplicada por padrão.

## Políticas de Sessão Adicionais

### Concorrência de Sessões
A plataforma permitirá a existência de múltiplas sessões simultâneas por usuário (Multi-device). No entanto, aplicaremos **auditoria de mudanças de IP drásticas no mesmo JWT** e exigiremos re-autenticação baseada em anomalias para prevenir o sequestro de tokens de sessão.

### Rotação de Refresh Tokens
Implementaremos **Rotation de Refresh Tokens** como a arquitetura padrão para combater o roubo de tokens de longo prazo. As regras de rotação serão estritas:
1.  **Uso Único:** Quando o Refresh Token 1 é utilizado, ele é deletado/invalidado, e um novo (Refresh Token 2) é retornado para a continuidade da sessão.
2.  **Stolen Token Defense (Defesa contra Roubo):** Se houver uma tentativa de uso de um Refresh Token previamente utilizado e revogado, a família inteira de tokens do dispositivo/sessão será automaticamente **revogada**, desconectando ambos os usuários (o original e o atacante).

### Metadados de Sessão
Para viabilizar as políticas acima e proporcionar visibilidade aos usuários, criaremos uma tabela `Session` que armazenará metadados adicionais, incluindo `User-Agent`, IP e a data/hora do `Last Active`. O campo de User-Agent deverá ser formatado/parseado durante a criação da sessão para extrair propriedades amigáveis como "Browser" e "OS" (ex: Chrome, Windows 11), a serem exibidas na interface do usuário (UI).

## Consequências
*   Mitigação significativa de riscos relacionados a ataques XSS para roubo de sessão.
*   Aumenta a complexidade arquitetural ao necessitar do armazenamento de sessões e famílias de tokens ativas e inativas (rotation) no banco de dados.
*   Necessidade de sincronizar as atualizações/invalidamento de tokens via cookies em clients.