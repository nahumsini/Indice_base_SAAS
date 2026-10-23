#!/usr/bin/env python3
"""Read-only config validation. Never connects to a database, storage, Meta or billing."""
import base64, re, sys
from pathlib import Path

def validate(env):
    def get(key): return env.get('SALES_CONVERSATIONS_'+key, '').strip().strip('"\'')
    def flag(key):
        value=get(key)
        if value.lower() not in ('', 'true', 'false'): raise ValueError('Invalid WhatsApp boolean configuration')
        return value.lower()=='true'
    enabled,ingress,worker,outbound,onboarding=[flag(k) for k in ('ENABLED','INGRESS_ENABLED','WORKER_ENABLED','OUTBOUND_ENABLED','ONBOARDING_ENABLED')]
    if onboarding: raise ValueError('Real WhatsApp onboarding adapter is pending official verification; keep onboarding disabled')
    if outbound and not (enabled and worker): raise ValueError('WhatsApp outbound requires feature and worker configuration')
    if any((ingress,worker,outbound)):
        def decode(value):
            key=base64.b64decode(value,validate=True)
            if len(key)!=32: raise ValueError()
            return key
        try:
            key=decode(get('ENCRYPTION_KEY'))
            if env.get('MAIL_ACCOUNTS_ENCRYPTION_KEY','').strip() and key==decode(env['MAIL_ACCOUNTS_ENCRYPTION_KEY'].strip()): raise ValueError()
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,40}',get('KEY_VERSION') or 'k1'): raise ValueError()
            versions={get('KEY_VERSION') or 'k1'}
            for entry in filter(None,get('PREVIOUS_KEYS').split(',')):
                version,value=entry.split(':',1);decode(value)
                if version in versions or not re.fullmatch(r'[A-Za-z0-9_-]{1,40}',version): raise ValueError()
                versions.add(version)
        except Exception: raise ValueError('Invalid or shared WhatsApp key configuration') from None
    if ingress:
        if not re.fullmatch(r'[0-9]{1,80}',get('APP_ID')) or not get('APP_SECRET') or not get('VERIFY_TOKEN') or get('APP_SECRET')==get('VERIFY_TOKEN'): raise ValueError('WhatsApp ingress requires distinct server secrets and verified app ID')
    if outbound and not re.fullmatch(r'v[0-9]{1,3}\.[0-9]{1,2}',get('GRAPH_VERSION')): raise ValueError('WhatsApp Graph version requires current official verification')

def read(path):
    result={}
    for line in Path(path).read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key,value=line.split('=',1);result[key.strip()]=value.strip()
    return result

if __name__=='__main__':
    try: validate(read(sys.argv[1]))
    except Exception as failure:
        print(str(failure) if isinstance(failure,ValueError) else 'WhatsApp configuration could not be checked',file=sys.stderr);sys.exit(1)
    print('WhatsApp configuration checked; no external actions performed.')
