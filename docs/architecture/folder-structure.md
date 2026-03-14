# Arquitetura de Pastas Padrão

Para evitar código espaguete, as aplicações devem seguir a estrutura abaixo:

```text
src/
├── modules/      # Funcionalidades e domínios da aplicação (ex: auth, users)
├── common/       # Código compartilhado entre módulos (utils, middlewares)
```

No caso de aplicações Next.js:
```text
app/
├── (dashboard)/  # Rotas autenticadas do painel
```
