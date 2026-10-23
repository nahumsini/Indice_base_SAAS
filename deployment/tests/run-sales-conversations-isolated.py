#!/usr/bin/env python3
"""Every Flyway-capable test launch verifies our tmpfs-only MySQL destination first."""
import json, os, subprocess, sys
from pathlib import Path
name='indice-whatsapp-isolated-test'
info=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
assert info['State']['Running'] and info['Config']['Image']=='mysql:8.4'
assert '/var/lib/mysql' in info['HostConfig']['Tmpfs']
assert not any(m.get('Type')=='volume' and m.get('Destination')=='/var/lib/mysql' for m in info['Mounts'])
assert info['NetworkSettings']['Ports']['3306/tcp']==[{'HostIp':'127.0.0.1','HostPort':'13319'}]
result=subprocess.check_output(['docker','exec',name,'sh','-c',
    'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -Nse "SELECT DATABASE()"'],text=True).strip()
assert result=='indice_test_db', 'Refusing non-isolated database'
env=os.environ.copy();env.update(TEST_DATASOURCE_URL='jdbc:mysql://127.0.0.1:13319/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&forceConnectionTimeZoneToSession=true&useUnicode=true&characterEncoding=utf8',TEST_DATASOURCE_USERNAME='indice_test_user',TEST_DATASOURCE_PASSWORD='indice_test_pass')
print('Verified tmpfs MySQL indice-whatsapp-isolated-test / 127.0.0.1:13319 / indice_test_db',flush=True)
repo=Path(__file__).resolve().parents[2]
args=sys.argv[1:] or ['-q','-Dtest=SalesConversationsIntegrationTest,MigrationVersionUniquenessTest','test']
raise SystemExit(subprocess.call([str(repo/'mvnw'),*args],cwd=repo,env=env))
