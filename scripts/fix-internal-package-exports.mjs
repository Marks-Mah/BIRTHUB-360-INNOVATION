#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const PACKAGES_DIRS = ["packages", "services", "agents"];
const TARGET_EXPORTS = [
  "ForbiddenError",
  "UnauthorizedError",
  "NotFoundError",
  "ValidationError",
];

function exists(p) {
  return fs.existsSync(p);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function getAllPackageDirs() {
  const out = [];
  for (const base of PACKAGES_DIRS) {
    const absBase = path.join(ROOT, base);
    if (!exists(absBase)) continue;
    for (const entry of fs.readdirSync(absBase, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgDir = path.join(absBase, entry.name);
      if (exists(path.join(pkgDir, "package.json"))) out.push(pkgDir);
    }
  }
  return out;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseNamedExports(tsCode) {
  const names = new Set();

  // export class X
  for (const m of tsCode.matchAll(/export\s+class\s+([A-Za-z0-9_]+)/g)) {
    names.add(m[1]);
  }

  // export function X
  for (const m of tsCode.matchAll(/export\s+function\s+([A-Za-z0-9_]+)/g)) {
    names.add(m[1]);
  }

  // export const X
  for (const m of tsCode.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z0-9_]+)/g)) {
    names.add(m[1]);
  }

  // export { A, B }
  for (const m of tsCode.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const raw of m[1].split(",")) {
      const cleaned = raw.trim().split(/\s+as\s+/i)[0]?.trim();
      if (cleaned) names.add(cleaned);
    }
  }

  return [...names];
}

function findSourceExports(pkgDir) {
  const srcDir = path.join(pkgDir, "src");
  const found = {};
  if (!exists(srcDir)) return found;

  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
  for (const file of files) {
    const abs = path.join(srcDir, file);
    const code = fs.readFileSync(abs, "utf8");
    const exports = parseNamedExports(code);
    if (exports.length) found[file] = exports;
  }
  return found;
}

function ensureIndexBarrel(pkgDir, sourceExports) {
  const srcDir = path.join(pkgDir, "src");
  const indexFile = path.join(srcDir, "index.ts");
  if (!exists(srcDir)) return { changed: false, notes: ["sem src/"] };

  let current = exists(indexFile) ? fs.readFileSync(indexFile, "utf8") : "";
  let changed = false;
  const notes = [];

  const candidates = Object.keys(sourceExports)
    .filter((f) => f !== "index.ts")
    .sort((a, b) => a.localeCompare(b));

  for (const file of candidates) {
    const rel = "./" + file.replace(/\.tsx?$/, ".js");
    const wanted = `export * from "${rel}";`;
    if (!current.includes(wanted)) {
      current += (current.trim() ? "\n" : "") + wanted + "\n";
      changed = true;
      notes.push(`adicionado barrel para ${file}`);
    }
  }

  if (changed) {
    ensureDir(indexFile);
    fs.writeFileSync(indexFile, current, "utf8");
  }

  return { changed, notes };
}

function ensurePackageJson(pkgDir) {
  const pkgFile = path.join(pkgDir, "package.json");
  const pkg = readJson(pkgFile);
  let changed = false;
  const notes = [];

  if (pkg.type !== "module") {
    pkg.type = "module";
    changed = true;
    notes.push(`type -> module`);
  }

  if (pkg.main !== "./dist/index.js") {
    pkg.main = "./dist/index.js";
    changed = true;
    notes.push(`main -> ./dist/index.js`);
  }

  if (pkg.types !== "./dist/index.d.ts") {
    pkg.types = "./dist/index.d.ts";
    changed = true;
    notes.push(`types -> ./dist/index.d.ts`);
  }

  const desiredExports = {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    },
  };

  if (JSON.stringify(pkg.exports) !== JSON.stringify(desiredExports)) {
    pkg.exports = desiredExports;
    changed = true;
    notes.push(`exports -> entrypoint público único`);
  }

  if (changed) writeJson(pkgFile, pkg);
  return { changed, notes, pkgName: pkg.name || path.basename(pkgDir) };
}

function ensureTsconfig(pkgDir) {
  const file = path.join(pkgDir, "tsconfig.json");
  if (!exists(file)) return { changed: false, notes: ["sem tsconfig.json"] };

  const tsconfig = readJson(file);
  tsconfig.compilerOptions ||= {};
  let changed = false;
  const notes = [];

  const wanted = {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    declaration: true,
    outDir: "dist",
    rootDir: "src",
    verbatimModuleSyntax: true,
    isolatedModules: true,
  };

  for (const [k, v] of Object.entries(wanted)) {
    if (tsconfig.compilerOptions[k] !== v) {
      tsconfig.compilerOptions[k] = v;
      changed = true;
      notes.push(`${k} -> ${JSON.stringify(v)}`);
    }
  }

  if (!tsconfig.include) {
    tsconfig.include = ["src/**/*"];
    changed = true;
    notes.push(`include -> ["src/**/*"]`);
  }

  if (changed) writeJson(file, tsconfig);
  return { changed, notes };
}

function inspectSuspiciousExports(pkgDir, sourceExports) {
  const found = new Set(Object.values(sourceExports).flat());
  const missing = TARGET_EXPORTS.filter((x) => found.has(x));
  return {
    hasInterestingSymbols: missing.length > 0,
    symbols: missing,
  };
}

function buildPackage(pkgDir) {
  try {
    execSync("pnpm build", { cwd: pkgDir, stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.stderr || err?.message || err),
    };
  }
}

function inspectDist(pkgDir) {
  const distIndex = path.join(pkgDir, "dist", "index.js");
  if (!exists(distIndex)) return { ok: false, reason: "dist/index.js não existe" };
  const code = fs.readFileSync(distIndex, "utf8");
  const exported = TARGET_EXPORTS.filter((name) => code.includes(name));
  return { ok: true, exported };
}

function main() {
  const packageDirs = getAllPackageDirs();
  const report = [];

  console.log(`\n🔎 Encontrados ${packageDirs.length} pacotes internos\n`);

  for (const pkgDir of packageDirs) {
    const pkgName = path.relative(ROOT, pkgDir);
    console.log(`\n=== ${pkgName} ===`);

    const sourceExports = findSourceExports(pkgDir);
    const symbols = inspectSuspiciousExports(pkgDir, sourceExports);
    const barrel = ensureIndexBarrel(pkgDir, sourceExports);
    const pkg = ensurePackageJson(pkgDir);
    const ts = ensureTsconfig(pkgDir);

    const didTouch = barrel.changed || pkg.changed || ts.changed;

    let build = { ok: null };
    let dist = { ok: null };

    if (didTouch) {
      build = buildPackage(pkgDir);
      if (build.ok) dist = inspectDist(pkgDir);
    }

    report.push({
      package: pkgName,
      suspiciousSymbols: symbols.symbols,
      changed: didTouch,
      barrelNotes: barrel.notes,
      packageJsonNotes: pkg.notes,
      tsconfigNotes: ts.notes,
      build,
      dist,
    });

    console.log(`exports de interesse: ${symbols.symbols.join(", ") || "(nenhum)"}`);
    console.log(`alterado: ${didTouch ? "sim" : "não"}`);
    if (didTouch) {
      console.log(`build: ${build.ok ? "ok" : "falhou"}`);
      if (dist.ok) {
        console.log(`dist exporta: ${dist.exported.join(", ") || "(nenhum símbolo-alvo encontrado no texto)"}`);
      }
    }
  }

  const reportFile = path.join(ROOT, "docs", "evidence", "package-exports-fix-report.json");
  ensureDir(reportFile);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`\n📄 Relatório salvo em: ${path.relative(ROOT, reportFile)}\n`);
  console.log("Próximos passos recomendados:");
  console.log("1. Rodar pnpm -r build");
  console.log("2. Rodar pnpm test");
  console.log("3. Inspecionar pacotes cujo build falhou");
  console.log("4. Validar especialmente o api-gateway e @birthub/utils");
}

main();
