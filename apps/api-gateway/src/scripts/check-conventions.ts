import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const serverContent = readFileSync(resolve(process.cwd(), "src/server.ts"), "utf8");

if (!serverContent.includes('./routes/supported.js')) {
  throw new Error("Convention violated: server must mount only the supported gateway surface");
}

if (serverContent.includes('./routes/index.js')) {
  throw new Error("Convention violated: deprecated legacy routes cannot be mounted");
}

console.log("Conventions check passed");
