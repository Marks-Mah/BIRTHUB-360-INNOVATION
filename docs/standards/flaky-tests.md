# Política de Flaky Tests

Testes instáveis (que falham intermitentemente no CI) não devem bloquear a pipeline em PRs de features.
- Testes identificados como flaky devem ser **silenciados (via `.skip`)**.
- Um card de tech debt deve ser aberto na sprint atual contendo o log do erro para correção posterior (prazo máximo de 1 sprint para o fix).
