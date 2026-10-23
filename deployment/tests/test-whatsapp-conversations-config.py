import base64, importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('config',Path(__file__).parents[1]/'scripts/check-whatsapp-conversations-config.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ConfigTests(unittest.TestCase):
    def test_defaults_are_inert(self): module.validate({})
    def test_real_onboarding_remains_unavailable(self):
        with self.assertRaises(ValueError):module.validate({'SALES_CONVERSATIONS_ONBOARDING_ENABLED':'true'})
    def test_no_secrets_are_printed_by_invalid_configuration(self):
        secret='SYNTHETIC-SECRET-MUST-NOT-APPEAR'
        with self.assertRaises(ValueError) as error:module.validate({'SALES_CONVERSATIONS_WORKER_ENABLED':'true','SALES_CONVERSATIONS_ENCRYPTION_KEY':secret})
        self.assertNotIn(secret,str(error.exception))
    def test_email_key_reuse_is_rejected(self):
        key=base64.b64encode(bytes(32)).decode()
        with self.assertRaises(ValueError):module.validate({'SALES_CONVERSATIONS_WORKER_ENABLED':'true','SALES_CONVERSATIONS_ENCRYPTION_KEY':key,'MAIL_ACCOUNTS_ENCRYPTION_KEY':key})
    def test_outbound_requires_workers_and_verified_version(self):
        with self.assertRaises(ValueError):module.validate({'SALES_CONVERSATIONS_OUTBOUND_ENABLED':'true'})
if __name__=='__main__':unittest.main()
