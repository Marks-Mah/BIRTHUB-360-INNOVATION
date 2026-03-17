#!/usr/bin/env node
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const gates = [];

function gate(name, pass, detail){gates.push({name,pass,detail});}

try {
  execSync('node scripts/ci/monorepo-doctor.mjs',{stdio:'ignore'});
  gate('Monorepo doctor',true,'No critical findings');
} catch {
  gate('Monorepo doctor',false,'Critical findings found');
}

const hasSecurityReport=fs.existsSync('docs/security/security-coverage-report.md');
gate('Security baseline report',hasSecurityReport, hasSecurityReport?'Report present':'Missing docs/security/security-coverage-report.md');

const hasMigrationsLock=fs.existsSync('packages/database/prisma/migrations/migration_lock.toml');
gate('Schema migration lock',hasMigrationsLock, hasMigrationsLock?'Prisma lock present':'Prisma migration lock missing');

const hasSloDoc=fs.existsSync('docs/OBSERVABILIDADE_E_SLOS.md');
gate('SLO baseline',hasSloDoc, hasSloDoc?'SLO documentation present':'Missing SLO document');

const md=['# Release Scorecard',`Generated at: ${new Date().toISOString()}`,'', '| Gate | Status | Detail |','| --- | --- | --- |'];
for(const g of gates){md.push(`| ${g.name} | ${g.pass?'PASS':'FAIL'} | ${g.detail} |`);}

fs.mkdirSync('artifacts/release',{recursive:true});
const out='artifacts/release/scorecard.md';
fs.writeFileSync(out,md.join('\n'));
console.log(md.join('\n'));

if(gates.some((g)=>!g.pass)) process.exit(1);
