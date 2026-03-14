echo "=== 5.4.C2 ==="
grep -rn "slack" packages/agents-core/src/tools || true
echo "=== 5.4.C3 ==="
grep -rn "crm" packages/agents-core/src/tools || true
echo "=== 5.4.C4 ==="
grep -rn "storage" packages/agents-core/src/tools || true
echo "=== 5.4.C5 ==="
grep -rn "calendar" packages/agents-core/src/tools || true

echo "=== 5.5.C2 ==="
grep -rn "DRY_RUN" apps/ packages/ || true

echo "=== 5.6.C1 ==="
find apps/web/ -name "*wizard*" || true
echo "=== 5.6.C2 ==="
grep -rn "transaction" apps/api/src/modules/packs || true
echo "=== 5.6.C3 ==="
grep -rn "uninstall" apps/api/src/modules/packs || true

echo "=== 5.7.C1 ==="
grep -rn "hash" apps/worker/src/ || true

echo "=== 5.8.C1 ==="
find packages/agent-packs -name "*test*" || true
grep -rn "schema" packages/agent-packs/corporate-v1/tests || true

echo "=== 5.9.C1 ==="
grep -rn "MDX" scripts/ || true
grep -rn "MDX" packages/ || true

echo "=== 6.3.C1 ==="
grep -rn "Trigger Webhook" apps/ packages/ || true
grep -rn "webhook" apps/api/src/modules/workflows || true

echo "=== 6.4.C1 ==="
grep -rn "HTTP Request" packages/workflows-core || true
echo "=== 6.4.C2 ==="
grep -rn "json-rules-engine" packages/workflows-core || true
echo "=== 6.4.C3 ==="
grep -rn "isolated-vm" packages/workflows-core || true
echo "=== 6.4.C4 ==="
grep -rn "Transformer" packages/workflows-core || true

echo "=== 6.6.C1 ==="
grep -rn "React Flow" apps/web/ || true

echo "=== 6.8.C1 ==="
ls -la packages/workflows-core/test || true

echo "=== 6.9.C1 ==="
grep -rn "Caching" packages/workflows-core || true
