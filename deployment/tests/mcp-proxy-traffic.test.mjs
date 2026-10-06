import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const webImage = process.env.MCP_TRAFFIC_TEST_WEB_IMAGE;
const nodeImage = process.env.MCP_TRAFFIC_TEST_NODE_IMAGE;
if (!webImage || !nodeImage) throw new Error('Supply reviewed web and MCP images; this test never chooses latest or live containers.');
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 30_000 }).trim();
const upstreamCode = `
const http = require('node:http');
let held = 0;
http.createServer((req, res) => {
  req.resume();
  if (req.headers['x-traffic-test-hold'] === '1') { held++; setTimeout(() => { held--; res.end('{}'); }, 2500); }
  else { res.writeHead(401, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end('{}'); }
}).listen(3010, '0.0.0.0');
http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ held })); }).listen(8082, '0.0.0.0');
`;

// Runs inside the disposable upstream/proxy namespace: no host ports, external traffic or live data.
const exerciseCode = `
const assert = require('node:assert/strict');
const {setTimeout: delay} = require('node:timers/promises');
(async () => {
 const url = new URL('http://127.0.0.1:8080/api/v1/ai/mcp');
 for (let i=0;i<100;i++) {
  try { if ((await fetch(new URL('/api/test-metrics',url))).ok) break; } catch {}
  if(i===99)throw new Error('Isolated proxy did not become ready'); await delay(20);
 }
 const controllers=[], pending=[];
 try {
  for(let i=0;i<8;i++) {
   const controller=new AbortController();controllers.push(controller);
   pending.push(fetch(url,{method:'POST',body:'{}',headers:{'X-Traffic-Test-Hold':'1'},signal:controller.signal}).catch(()=>undefined));
  }
  for(let i=0;i<100;i++) {
   const metrics=await(await fetch(new URL('/api/test-metrics',url))).json();
   if(metrics.held===8)break;
   if(i===99)throw new Error('Eight isolated MCP requests were not held');await delay(10);
  }
  const saturated=await fetch(url,{method:'POST',body:'{}'});
  assert.equal(saturated.status,429);
  assert.equal(saturated.headers.get('Retry-After'),'1');
  assert.equal(saturated.headers.get('Cache-Control'),'no-store');
  assert.equal(saturated.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal((await saturated.json()).id,null);
  assert.equal((await fetch(new URL('/api/test-metrics',url))).status,200);
  await Promise.all(pending); await delay(2200);
  let limited=0;
  for(let i=0;i<90;i++) {
   const result=await fetch(new URL('?private-query-not-for-logs',url),{method:'POST',body:'{}',headers:{
    Host:i%2?'alternate.indice.invalid':'app.indice.invalid',
    'X-Forwarded-For':'198.51.100.'+(i%250), Authorization:'Bearer synthetic-not-for-logs'
   }});
   if(result.status===429) {
    limited++;assert.equal(result.headers.get('Retry-After'),'1');assert.equal((await result.json()).error.code,-32004);
   } else { assert.equal(result.status,401);await result.text(); }
  }
  assert.ok(limited>0,'Rotating Host/forwarded IP must not bypass quota');
  assert.equal((await fetch(new URL('/api/test-metrics',url))).status,200);
  console.log(JSON.stringify({concurrencyRejected:true,rateRejected:limited,unrelatedApiAvailable:true}));
 } finally {controllers.forEach(controller=>controller.abort());await Promise.all(pending);}
})().catch(error=>{console.error(error);process.exitCode=1;});
`;

for (const config of ['nginx.host.conf', 'nginx.conf']) {
  test(`${config}: actual Nginx enforces fixed traffic keys, 429 recovery, scope and safe logs`, async () => {
    const suffix = randomUUID().slice(0, 8);
    const network = `indice-mcp-traffic-${suffix}`;
    const upstream = `${network}-upstream`;
    const proxy = `${network}-proxy`;
    const configPath = fileURLToPath(new URL(`../docker/web/${config}`, import.meta.url));
    const source = readFileSync(configPath, 'utf8');
    assert.match(source, /limit_req_zone \$server_name zone=indice_mcp_requests:1m rate=20r\/s;/);
    assert.match(source, /limit_conn_zone \$server_name zone=indice_mcp_connections:1m;/);
    assert.doesNotMatch(source, /limit_(?:req|conn)_zone[^;]*(?:\$http_|\$host|\$remote_addr)/);
    let createdNetwork = false, createdUpstream = false, createdProxy = false;
    try {
      docker('network', 'create', '--internal', network); createdNetwork = true;
      docker('run', '-d', '--name', upstream, '--network', network, '--network-alias', 'mcp',
        '--network-alias', 'backend', '--network-alias', 'minio', '--entrypoint', 'node', nodeImage, '-e', upstreamCode);
      createdUpstream = true;
      docker('run', '-d', '--name', proxy, '--network', `container:${upstream}`,
        '--mount', `type=bind,src=${configPath},dst=/etc/nginx/conf.d/default.conf,readonly`, webImage);
      createdProxy = true;
      docker('exec', proxy, 'nginx', '-t');
      const results = JSON.parse(docker('exec', upstream, 'node', '-e', exerciseCode));
      assert.equal(results.concurrencyRejected, true);
      assert.ok(results.rateRejected > 0);
      assert.equal(results.unrelatedApiAvailable, true);
      const logs = docker('logs', proxy);
      assert.doesNotMatch(logs, /private-query-not-for-logs|synthetic-not-for-logs/);
    } finally {
      if (createdProxy) docker('rm', '-f', proxy);
      if (createdUpstream) docker('rm', '-f', upstream);
      if (createdNetwork) docker('network', 'rm', network);
    }
  });
}
