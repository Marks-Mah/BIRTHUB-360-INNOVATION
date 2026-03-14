# Regras de Isolamento de Banco de Dados

- O vazamento de estado entre testes é **proibido**.
- É obrigatório o uso de schemas PostgreSQL dinâmicos por worker ou o uso de containers efêmeros para garantir o isolamento total.
