echo "=== 6.7 ==="
grep -rn "Debugger" apps/web/app/ || true
echo "=== 6.10 ==="
grep -rn "Smoke" packages/workflows-core/ || true
grep -rn "Smoke" apps/worker/ || true
