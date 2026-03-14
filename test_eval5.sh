echo "6.6.C1 React Flow"
ls -la apps/web/app/\(dashboard\)/workflows/ || true
cat apps/web/package.json | grep react-flow || true

echo "6.1.C2 DAG parser"
cat packages/workflows-core/src/parser/dagValidator.ts | grep -C 5 cycle || true

echo "5.3 Analyzer"
ls -la packages/agent-packs/corporate-v1/ | grep -i analyze || true
