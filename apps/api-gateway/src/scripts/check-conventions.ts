import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const files = [
  "src/routes/index.ts",
  "src/integrations/resilience.ts",
  "src/integrations/error-catalog.ts",
];

for (const file of files) {
  const content = readFileSync(resolve(process.cwd(), file), "utf8");

  if (file.includes("routes") && content.includes("throw new Error(")) {
    throw new Error(`Convenção violada: use erros tipados em ${file}`);
  }

  if (file.includes("integrations") && !content.includes("IntegrationError")) {
    throw new Error(`Convenção violada: integração sem catálogo de erro em ${file}`);
  }
}

console.log("Conventions check passed");
