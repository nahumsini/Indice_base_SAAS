import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('public Agenda remains opt-in and both deployment topologies retain the activation flag',()=>{
 assert.match(read('src/main/resources/application.properties'),/kiosk\.engine\.adapter\.scheduling\.enabled=\$\{KIOSK_ENGINE_ADAPTER_SCHEDULING_ENABLED:false\}/);
 assert.match(read('deployment/compose/docker-compose.yml'),/KIOSK_ENGINE_ADAPTER_SCHEDULING_ENABLED: \$\{KIOSK_ENGINE_ADAPTER_SCHEDULING_ENABLED:-false\}/);
 assert.match(read('deployment/env/.env.example'),/^KIOSK_ENGINE_ADAPTER_SCHEDULING_ENABLED=false$/m);
 const host=read('deployment/scripts/up-host-network.sh');
 const prepare=host.slice(host.indexOf('prepare_backend_env()'),host.indexOf('prepare_backend_env()')+5000);
 assert.match(prepare,/grep -v -E/);assert.doesNotMatch(prepare,/KIOSK_ENGINE_ADAPTER_SCHEDULING_ENABLED/);
});
