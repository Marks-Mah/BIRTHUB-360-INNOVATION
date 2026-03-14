# Content Security Policy (CSP) Base

A política de CSP para a aplicação Web (Next.js) deve restringir severamente o carregamento de recursos de origens desconhecidas.

A string de diretivas padrão deve ser:
`default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:;`
