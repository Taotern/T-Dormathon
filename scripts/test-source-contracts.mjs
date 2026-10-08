import {spawnSync} from 'node:child_process';import path from 'node:path';
const result=spawnSync(process.execPath,['tests/independent-source-contracts/run-source-contracts.mjs','--checkout',process.cwd(),'--report-prefix','integration-contract-report'],{stdio:'inherit'});process.exitCode=result.status||0;
