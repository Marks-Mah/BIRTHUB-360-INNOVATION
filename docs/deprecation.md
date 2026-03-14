# Política de Depreciação de Endpoints

## Janela padrão
- Tempo mínimo de aviso: **90 dias** antes do sunset.
- Para endpoints críticos de alta adoção: recomendado **180 dias**.

## Etapas obrigatórias
1. Marcar endpoint como `Deprecated` na OpenAPI.
2. Publicar aviso em changelog e documentação.
3. Enviar comunicação para consumidores identificados.
4. Fornecer guia de migração com exemplos.
5. Monitorar tráfego legado até sunset.

## Cabeçalhos recomendados
- `Deprecation: true`
- `Sunset: <RFC-1123 date>`
- `Link: <url-do-guia-de-migracao>; rel="deprecation"`
