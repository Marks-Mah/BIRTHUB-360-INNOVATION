echo "=== 5.1 ==="
ls -l packages/agent-packs/corporate-v1/
find . -name "ADR-016*"
grep -r "corporate-v1-catalog" .
echo "=== 5.2 ==="
grep -rn "Marketplace" apps/ packages/
echo "=== 5.3 ==="
grep -rn "skill template analyzer" .
echo "=== 5.4 ==="
grep -rn "tool de email estendida" .
echo "=== 5.5 ==="
grep -rn "BudgetService" .
echo "=== 5.6 ==="
grep -rn "wizard multi-step" .
echo "=== 5.7 ==="
grep -rn "hash SHA256 de todo output" .
echo "=== 5.8 ==="
grep -rn "schema para 100%" .
echo "=== 5.9 ==="
grep -rn "docs (MDX) extraindo infos" .
echo "=== 6.1 ==="
grep -rn "WorkflowRunner" .
grep -rn "DAG" packages/workflows-core
echo "=== 6.2 ==="
grep -rn "interpolação Mustache" .
echo "=== 6.3 ==="
grep -rn "Trigger Webhook" .
echo "=== 6.4 ==="
grep -rn "Node Nativo HTTP Request" .
echo "=== 6.5 ==="
grep -rn "Node Agent Execute" .
echo "=== 6.6 ==="
grep -rn "React Flow" .
echo "=== 6.7 ==="
grep -rn "Historico /workflows/\[id\]/runs" .
echo "=== 6.8 ==="
grep -rn "Unit Tests para parser DAG" .
echo "=== 6.9 ==="
grep -rn "Config Node Caching" .
echo "=== 6.10 ==="
grep -rn "Smoke Test Workflow" .
