import { useEffect, useState } from 'react';

export function useTaskKioskQrCode(publicToken: string) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!publicToken || typeof window === 'undefined') {
      setDataUrl('');
      return;
    }
    let active = true;
    const kioskUrl = `${window.location.origin}/task-kiosk/${publicToken}`;
    void import('qrcode')
      .then((module) => module.default.toDataURL(kioskUrl, {
        margin: 1,
        width: 280,
        color: { dark: '#7A5204', light: '#FFFFFF' },
      }))
      .then((value) => { if (active) setDataUrl(value); })
      .catch(() => { if (active) setDataUrl(''); });
    return () => { active = false; };
  }, [publicToken]);

  return dataUrl;
}
