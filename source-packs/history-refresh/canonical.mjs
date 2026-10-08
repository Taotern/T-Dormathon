import{canonical}from'../legal/adapters/normalized-common.mjs';
import{createHash}from'node:crypto';
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const text=canonical(JSON.parse(raw));
console.log(JSON.stringify({canonical:text,sha256:createHash('sha256').update(text).digest('hex')}));
