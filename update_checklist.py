import re

checklist_file = "CHECKLIST_MASTER.md"
with open(checklist_file, "r") as f:
    content = f.read()

# Replace Azul with appropriate status based on evaluation.
# We will do a simple pass first to see what's what.
# Actually let's just create a new report file and then we can update CHECKLIST_MASTER.md later if needed,
# but the prompt says: "Atualize o estado de cada ciclo/item avaliado usando EXCLUSIVAMENTE a seguinte escala... na LISTA DE ITENS PARA AUDITORIA"
# Oh wait, we need to provide a report and update the status of each item.
