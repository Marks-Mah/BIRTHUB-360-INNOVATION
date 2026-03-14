# Injeção Segura de Variáveis para Frontend

O prefixo `NEXT_PUBLIC_` expõe a variável de ambiente diretamente para o bundle do navegador no Next.js.
É estritamente **proibido** utilizar esse prefixo para:
- Chaves de API privadas (ex: Stripe Secret Key, OpenAI API Key).
- Segredos, Senhas e Tokens de acesso.

O uso de `NEXT_PUBLIC_` deve se restringir apenas a identificadores públicos (como Sentry DSN, Google Analytics ID) e URLs base de APIs públicas (ex: `NEXT_PUBLIC_API_URL`).
