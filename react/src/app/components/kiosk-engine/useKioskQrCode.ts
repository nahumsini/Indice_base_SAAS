import { useEffect, useState } from 'react';

export function useKioskQrCode(value: string, color = '#147514') {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!value || typeof window === 'undefined') {
      setDataUrl('');
      return;
    }

    let active = true;
    void import('qrcode')
      .then((module) => module.default.toDataURL(value, {
        margin: 1,
        width: 280,
        color: { dark: color, light: '#FFFFFF' },
      }))
      .then((nextDataUrl) => { if (active) setDataUrl(nextDataUrl); })
      .catch(() => { if (active) setDataUrl(''); });

    return () => { active = false; };
  }, [color, value]);

  return dataUrl;
}
