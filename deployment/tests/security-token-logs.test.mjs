import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const web=process.env.SECURITY_TEST_WEB_IMAGE,node=process.env.SECURITY_TEST_NODE_IMAGE;
if(!web || !node)throw new Error('Supply reviewed local image references; no live containers or remote images are selected.');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:30000}).trim();
for(const config of ['nginx.conf','nginx.host.conf']){
 test(`${config}: recovery tokens are absent from actual access and error logs`,()=>{
  const suffix=randomUUID().slice(0,8),network=`indice-token-logs-${suffix}`,upstream=`${network}-upstream`,proxy=`${network}-proxy`;
  let net=false,up=false,edge=false;
  try{
   docker('network','create','--internal',network);net=true;
   docker('run','-d','--name',upstream,'--network',network,'--network-alias','backend','--network-alias','minio','--network-alias','mcp','--entrypoint','node',node,'-e',`require('http').createServer((req,res)=>{req.resume();if(req.url.startsWith('/api/v1/auth/password-reset/')){res.destroy();return;}res.end('{}');}).listen(8082,'0.0.0.0')`);up=true;
   const path=fileURLToPath(new URL(`../docker/web/${config}`,import.meta.url));
   docker('run','-d','--name',proxy,'--network',`container:${upstream}`,'--mount',`type=bind,src=${path},dst=/etc/nginx/conf.d/default.conf,readonly`,'--tmpfs','/var/log/nginx:rw,size=16m,mode=1777',web);edge=true;
   docker('exec',proxy,'nginx','-t');
   const result=JSON.parse(docker('exec',upstream,'node','-e',`(async()=>{
     for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:8080/');break;}catch{await new Promise(r=>setTimeout(r,50));}}
     const statuses=[];
     for(const path of ['/reset-password/synthetic-private-reset-token?secret=synthetic-private-query','/api/v1/auth/password-reset/synthetic-private-reset-token','/RESET-PASSWORD/synthetic-private-reset-token','/api/v1/auth/csrf']){
       const r=await fetch('http://127.0.0.1:8080'+path,{headers:{Referer:'http://test/reset-password/synthetic-private-referrer'}});statuses.push(r.status);if(path.toLowerCase().startsWith('/reset-password/')){assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors/);}await r.text();
     }
     console.log(JSON.stringify(statuses));
   })().catch(()=>process.exit(1))`));
   assert.deepEqual(result,[200,502,200,200]);
   const logs=docker('exec',proxy,'sh','-c','cat /var/log/nginx/access.log; if [ -f /var/log/nginx/error.log ]; then cat /var/log/nginx/error.log; fi');
   assert.doesNotMatch(logs,/synthetic-private-reset-token|synthetic-private-query|synthetic-private-referrer/);
   assert.match(logs,/password-reset\/\[redacted\]/);
  }finally{
   if(edge)docker('rm','-f',proxy);if(up)docker('rm','-f',upstream);if(net)docker('network','rm',network);
  }
 });
}
