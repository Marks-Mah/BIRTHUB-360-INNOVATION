#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const critical=[];
const warnings=[];

function trackedFiles(){
  return execSync('git ls-files',{encoding:'utf8'}).trim().split('\n').filter(Boolean);
}

const files=trackedFiles();

const legacyImports=files.filter((f)=>/\.(ts|tsx|js|mjs|cjs)$/.test(f)).flatMap((f)=>{
  const c=fs.readFileSync(f,'utf8');
  return c.includes('@birthub/db')?[f]:[];
});
if(legacyImports.length) critical.push(`Legacy import @birthub/db found in: ${legacyImports.join(', ')}`);

const generated=files.filter((f)=>f.endsWith('.tsbuildinfo') || (f.endsWith('.js') && files.includes(f.replace(/\.js$/,'.ts'))));
if(generated.length) critical.push(`Generated artifacts tracked: ${generated.join(', ')}`);

const pkgFiles=files.filter((f)=>/^apps\/[^/]+\/package\.json$/.test(f));
const ports=new Map();
for(const pf of pkgFiles){
  const pkg=JSON.parse(fs.readFileSync(pf,'utf8'));
  const dev=pkg.scripts?.dev;
  const m=typeof dev==='string'?dev.match(/-p\s*(\d+)/):null;
  if(m){
    const port=m[1];
    const app=pf.split('/')[1];
    ports.set(port,[...(ports.get(port)||[]),app]);
  }
}
for(const [port,apps] of ports){
  if(apps.length>1) critical.push(`Local port collision ${port}: ${apps.join(', ')}`);
}

const dirCandidates=['agents','docs'];
for(const base of dirCandidates){
  if(!fs.existsSync(base)) continue;
  const entries=fs.readdirSync(base,{withFileTypes:true}).filter((d)=>d.isDirectory()).map((d)=>d.name);
  const map=new Map();
  for(const e of entries){
    const key=e.toLowerCase().replace(/[-_]/g,'');
    map.set(key,[...(map.get(key)||[]),e]);
  }
  for(const [k,v] of map){
    if(v.length>1) warnings.push(`Potential duplicate directories in ${base} (${k}): ${v.join(', ')}`);
  }
}

const report = [
  '# Monorepo Doctor Report',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  '## Critical findings',
  ...(critical.length?critical.map((x)=>`- ${x}`):['- none']),
  '',
  '## Warnings',
  ...(warnings.length?warnings.map((x)=>`- ${x}`):['- none'])
].join('\n');

fs.mkdirSync('artifacts/doctor',{recursive:true});
fs.writeFileSync('artifacts/doctor/monorepo-doctor-report.md',report);
console.log(report);

if(critical.length){
  process.exit(1);
}
