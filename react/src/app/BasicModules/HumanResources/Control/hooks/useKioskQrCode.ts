import { useEffect, useState } from 'react';

export function useKioskQrCode(isOpen: boolean, kioskLink: string) {
  const [kioskQrDataUrl, setKioskQrDataUrl] = useState('');

  useEffect(() => {
    if (!isOpen || !kioskLink) {
      setKioskQrDataUrl('');
      return;
    }

    let active = true;
    import('qrcode')
      .then((module) => module.default.toDataURL(kioskLink, {
        margin: 1,
        width: 320,
        color: {
          dark: '#59C3A5',
          light: '#ffffff',
        },
      }))
      .then((dataUrl) => {
        if (active) {
          setKioskQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setKioskQrDataUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, kioskLink]);

  return kioskQrDataUrl;
}
