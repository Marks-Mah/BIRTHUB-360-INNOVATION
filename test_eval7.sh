echo "6.9.C3 Max Depth 50 loop"
grep -rn "50" packages/workflows-core/src/ || true
grep -rn "depth" apps/worker/src/ || true
echo "6.9.C5 Hard limit memory 128MB"
grep -rn "128" packages/workflows-core/ || true
echo "5.10 and 6.10 Checklists"
grep -rn "5.10" CHECKLIST_MASTER.md || true
grep -rn "6.10" CHECKLIST_MASTER.md || true
