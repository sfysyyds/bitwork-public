import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{resolve}from'node:path';
const root=resolve(process.argv[2]||'.'),publish=readFileSync(resolve(root,'.github/workflows/public-site.yml'),'utf8');
const gated=publish.includes('run: npm run check:regression');console.log(JSON.stringify({publishFullRegressionGate:gated}));assert.ok(gated,'Production publish must run the complete regression entry, not only snapshot');
const pr=readFileSync(resolve(root,'.github/workflows/checks.yml'),'utf8');assert.match(pr,/pull_request:/);assert.match(pr,/run: npm run check/);assert.ok(!/pages: write|id-token: write|secrets\./.test(pr));console.log(JSON.stringify({pass:true,prChecks:true,publishRegression:true,prDeploymentPermissions:false}));
