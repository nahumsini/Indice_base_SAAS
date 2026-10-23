#!/usr/bin/env python3
"""Refuse Flyway/test launches unless the named disposable database is verified."""
import json, os, subprocess, sys
from pathlib import Path
name='indice-security-isolated-test'
info=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
assert info['State']['Running'] and info['Config']['Image']=='mysql:8.4'
assert '/var/lib/mysql' in info['HostConfig']['Tmpfs']
assert not any(m.get('Type')=='volume' and m.get('Destination')=='/var/lib/mysql' for m in info['Mounts'])
assert info['NetworkSettings']['Ports']['3306/tcp']==[{'HostIp':'127.0.0.1','HostPort':'13321'}]
assert subprocess.check_output(['docker','exec',name,'sh','-c','MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -Nse "SELECT DATABASE()"'],text=True).strip()=='indice_test_db'
env=os.environ.copy();env.update(TEST_DATASOURCE_URL='jdbc:mysql://127.0.0.1:13321/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&forceConnectionTimeZoneToSession=true&useUnicode=true&characterEncoding=utf8',TEST_DATASOURCE_USERNAME='indice_test_user',TEST_DATASOURCE_PASSWORD='indice_test_pass')
root=Path(__file__).resolve().parents[2]
print('Verified isolated tmpfs MySQL indice-security-isolated-test at 127.0.0.1:13321/indice_test_db',flush=True)
args=sys.argv[1:] or ['-q','-Dtest=HrIdentityIsolationIntegrationTest,SecurityUploadIntegrityIntegrationTest,MigrationVersionUniquenessTest','test']
raise SystemExit(subprocess.call([str(root/'mvnw'),*args],cwd=root,env=env))
