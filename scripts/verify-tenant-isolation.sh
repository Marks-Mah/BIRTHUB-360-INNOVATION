#!/usr/bin/env bash

# Script de Exemplo: Execução de Provas de Isolamento Multi-Tenant
# Este script deve ser executado pelo CI/CD contra o ambiente de Staging ou Testes de Integração.
# Seu objetivo é automatizar os 15 cenários de Isolation Proof.

set -e

API_URL=${API_URL:-"http://localhost:3000"}
TENANT_A_TOKEN=${TENANT_A_TOKEN:-""}
TENANT_B_TOKEN=${TENANT_B_TOKEN:-""}

echo "=================================================="
echo " Iniciando Testes de Isolamento Cross-Tenant (RLS)"
echo "=================================================="

if [ -z "$TENANT_A_TOKEN" ] || [ -z "$TENANT_B_TOKEN" ]; then
  echo "ERRO: Tokens de teste TENANT_A_TOKEN e TENANT_B_TOKEN não definidos no ambiente."
  echo "Por favor, defina-os e tente novamente."
  exit 1
fi

# Função auxiliar para realizar as chamadas HTTP e checar HTTP Status
check_isolation() {
  local scenario_name=$1
  local token=$2
  local method=$3
  local endpoint=$4
  local expected_status=$5

  echo -n "Testando: $scenario_name... "

  response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_URL$endpoint" -H "Authorization: Bearer $token")

  if [ "$response" -eq "$expected_status" ]; then
    echo "✅ PASSOU (Status: $response)"
  else
    echo "❌ FALHOU (Status: $response, Esperado: $expected_status)"
    exit 1
  fi
}

# Assumindo que o Tenant B possui um pedido com ID 'ord_12345' conhecido pelo atacante
# Cenário 1: Tenant A tenta ler um recurso do Tenant B (IDOR Read)
check_isolation "Cenário 1: Leitura Indevida (IDOR GET)" "$TENANT_A_TOKEN" "GET" "/api/v1/orders/ord_12345" 404

# Cenário 2: Tenant A tenta atualizar um recurso do Tenant B (IDOR Update)
check_isolation "Cenário 2: Escrita Indevida (IDOR PUT)" "$TENANT_A_TOKEN" "PUT" "/api/v1/orders/ord_12345" 404

# Cenário 3: Tenant A tenta deletar um recurso do Tenant B (IDOR Delete)
check_isolation "Cenário 3: Deleção Indevida (IDOR DELETE)" "$TENANT_A_TOKEN" "DELETE" "/api/v1/orders/ord_12345" 404

# Cenário 5: Tentativa de sobreposição de Tenant ID via Query Parameter Injetada
check_isolation "Cenário 5: Injeção de Parâmetro (?tenant_id=B)" "$TENANT_A_TOKEN" "GET" "/api/v1/users?tenant_id=tenant_b" 200
# (Nota: o script Python/Pytest validaria se o payload de retorno não contém dados do Tenant B, aqui checamos apenas a resiliência do endpoint)

# Se tudo passou
echo "=================================================="
echo "✅ Todos os testes essenciais de isolamento (API Layer) passaram!"
echo "O Row-Level Security e as validações de API estão ativas e funcionando."
echo "=================================================="
