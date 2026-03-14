echo "5.1.C1"
ls -la packages/agent-packs/corporate-v1/
echo "5.1.C2"
cat scripts/validate-packs.ts | head -n 10
echo "5.1.C3"
ls -la packages/agent-packs/corporate-v1/ceo-pack
echo "5.2.C3"
cat apps/web/app/\(dashboard\)/marketplace/page.tsx | grep -i filter || true
echo "5.3.C1"
ls -la packages/agent-packs/corporate-v1 | grep analyzer || true
echo "5.4.C1"
grep -rni "email" packages/agents-core/src/tools || true
echo "5.5.C1"
cat apps/api/src/modules/budget/budget.service.ts | head -n 20 || true
echo "6.1.C1"
grep -i "Workflow" packages/db/prisma/schema.prisma || true
echo "6.2.C1"
cat apps/worker/src/engine/runner.ts | head -n 20 || true
