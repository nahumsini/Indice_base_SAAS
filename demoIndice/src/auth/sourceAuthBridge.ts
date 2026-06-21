import { authApi } from '../../../react/src/app/api/auth';

export const DEMO_SOURCE_LOGOUT_EVENT = 'demo-indice:source-logout';

let isInstalled = false;
const sourceLogout = authApi.logout.bind(authApi);

export function installSourceAuthBridge() {
  if (isInstalled) {
    return;
  }

  isInstalled = true;

  authApi.logout = async () => {
    try {
      await sourceLogout();
    } finally {
      window.dispatchEvent(new Event(DEMO_SOURCE_LOGOUT_EVENT));
    }
  };
}
