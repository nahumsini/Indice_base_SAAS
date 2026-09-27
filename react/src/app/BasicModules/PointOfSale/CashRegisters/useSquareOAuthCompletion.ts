import { useEffect, useRef } from 'react';
import { posBackendApi } from '../Sale/services/posBackendApi';
import type { readSquareOAuthReturn } from './squareOAuthReturn';

interface Options {
  oauthReturn: ReturnType<typeof readSquareOAuthReturn>;
  ready: boolean;
  canManage: boolean;
  errorMessage: string;
  onCompleted: () => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
}

/** Authorization values remain in component memory until authenticated CSRF completion. */
export function useSquareOAuthCompletion({ oauthReturn, ready, canManage, errorMessage, onCompleted, onError, onBusy }: Options) {
  const handled = useRef(false);
  useEffect(() => {
    if (!oauthReturn || !ready || handled.current) return;
    handled.current = true;
    if (!canManage || !oauthReturn.code || !oauthReturn.state || oauthReturn.error) { onError(errorMessage); return; }
    onBusy(true);
    void posBackendApi.completeSquareOAuth(oauthReturn.code, oauthReturn.state)
      .then((result) => { if (result.connected !== true) throw new Error('SQUARE_CONNECTION_NOT_CONFIRMED'); onCompleted(); })
      .catch(() => onError(errorMessage)).finally(() => onBusy(false));
  }, [oauthReturn, ready, canManage, errorMessage, onCompleted, onError, onBusy]);
}
