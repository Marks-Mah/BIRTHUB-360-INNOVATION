# ADR 012: RBAC vs ABAC para a Arquitetura Multi-tenant

## Status
Aceito

## Contexto
O controle de acesso em um sistema Multi-tenant como o BirthHub360 exige definir quem tem autorização para realizar quais ações dentro do escopo de cada tenant. Precisamos escolher entre Role-Based Access Control (RBAC) ou Attribute-Based Access Control (ABAC) para guiar o gerenciamento de permissões.

## Decisão
Implementaremos **Role-Based Access Control (RBAC)** como modelo base de autorização no MVP (Minimum Viable Product). No entanto, o sistema deve ser projetado com as abstrações necessárias para permitir a futura adoção de ABAC.

## Justificativa
A escolha recai sobre RBAC amarrado ao `TenantId`.

### RBAC: Simplicidade e Desempenho
A implementação inicial de RBAC é direta, fácil de auditar e tem baixo custo computacional. Permissões estáticas atreladas a cargos/roles (como Owner, Admin, Member, ReadOnly) cobrem a esmagadora maioria dos casos de uso de nossos clientes atuais. A gestão é simplificada, o que acelera o go-to-market. A verificação das roles será efetuada nas requisições através do ID do Tenant.

### Deixando ABAC para V2
Embora o ABAC (ex. "Pode aprovar se o valor for menor que R$100,00" ou "Pode acessar se o IP for da empresa") seja poderoso, ele adiciona complexidade significativa à engenharia e penalidades de latência para consultas contínuas. Esta granularidade foi classificada como requerimento avançado e será diferida para uma **V2**, quando o amadurecimento das políticas do sistema for alcançado.

## Matriz de Permissões Básica
A matriz de permissões será cruzada entre as Roles do RBAC e os Endpoints do sistema:

| Permissão | Owner | Admin | Member | ReadOnly |
| :--- | :---: | :---: | :---: | :---: |
| Gerenciar Faturamento/Plano | ✅ | ❌ | ❌ | ❌ |
| Convidar novos membros | ✅ | ✅ | ❌ | ❌ |
| Alterar Role de Membros | ✅ | ✅ | ❌ | ❌ |
| Banir/Remover Owner | ❌ | ❌ | ❌ | ❌ |
| Banir/Remover Admin | ✅ | ❌ | ❌ | ❌ |
| Promover a Admin | ✅ | ❌ | ❌ | ❌ |
| Criar Agentes/Workflows | ✅ | ✅ | ✅ | ❌ |
| Deletar Agentes | ✅ | ✅ | ❌ | ❌ |
| Editar/Executar Workflows | ✅ | ✅ | ✅ | ❌ |
| Visualizar Dados (Dashboard) | ✅ | ✅ | ✅ | ✅ |
| Consultar Logs de Auditoria | ✅ | ✅ | ❌ | ❌ |

## Implementação Técnica (@RequireRole)
Para aplicar o RBAC nas camadas de Controller/Router, utilizaremos um padrão de Decorator (ex: `@RequireRole('Admin')`).
A implementação deste Guard deve seguir a premissa de **priorizar o Banco de Dados como Fonte da Verdade** em vez dos claims do JWT. Isso evita o acesso por tokens ainda válidos (expiração de 15 min), mas pertencentes a usuários recém-rebaixados de cargo ou bloqueados.

### Herança e Elevação de Privilégios
A hierarquia será estritamente implementada:
*   Um **Admin não pode banir um Owner** (o Owner é o dono absoluto do Tenant).
*   Um **Member não pode promover a si mesmo ou a outro Member a Admin** (falta de permissão explícita).
*   A promoção/rebaixamento requer privilégios mais altos do que o cargo que está sendo concedido/revogado.

## Consequências
*   Reduz o tempo de desenvolvimento em comparação a um sistema ABAC complexo.
*   Pode requerer reengenharia para regras condicionais baseadas em atributos de negócio futuros.
*   Custo ligeiramente maior na latência da API, pois cada requisição protegida exigirá uma consulta no banco de dados para validar a Role atual.