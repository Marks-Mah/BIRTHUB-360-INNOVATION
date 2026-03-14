echo "5.1.C4 and C5 manifests"
ls -la packages/agent-packs/corporate-v1/cro-pack/manifest.json || true
ls -la packages/agent-packs/corporate-v1/legal-pack/manifest.json || true

echo "5.2.C1 tags"
cat packages/agent-packs/corporate-v1/manifest.json | grep -i tags -A 5

echo "5.3.C2 C3 C4 C5 templates"
ls -la packages/agent-packs/corporate-v1 | grep orchestrator || true

echo "5.6.C4 C5 status and update"
grep -rn "degraded" apps/api/src/modules/packs/ || true

echo "5.7.C4 C5 outputs"
grep -rn "export" apps/web/app/ || true

echo "6.4"
grep -rn "HTTP Request" packages/workflows-core/ || true
grep -rn "js-sandbox" packages/workflows-core/ || true

echo "6.5.C3 Fallback branch"
grep -rn "Fallback" packages/workflows-core/ || true

echo "6.9.C4 Signature rotation"
grep -rn "X-Birthhub-Signature" apps/ || true
