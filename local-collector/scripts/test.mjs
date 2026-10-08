import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const steps=[
  ['--test',...['local-runtime.test.mjs','source-provenance.test.mjs','single-source-cli.test.mjs'].map(f=>path.join(root,'tests',f))],
  [path.join(root,'tests/source-contracts/run-source-contracts.mjs'),'--checkout',root,'--report-prefix','local-runtime-contract-report']
];
for(const args of steps) {
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
