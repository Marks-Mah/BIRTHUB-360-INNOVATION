import re

file_path = "CHECKLIST_MASTER.md"
with open(file_path, "r") as f:
    lines = f.readlines()

out_lines = []
for line in lines:
    if "Assinatura de Finalização Novo Ciclo 3" in line:
        pass
    out_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(out_lines)
