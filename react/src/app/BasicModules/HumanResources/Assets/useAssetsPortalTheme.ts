import { useEffect, useState } from 'react';

export function useAssetsPortalTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const resolveTheme = () => {
      const appRoot = document.querySelector('.notranslate');
      setIsDarkMode(Boolean(appRoot?.classList.contains('dark')));
    };

    resolveTheme();

    const appRoot = document.querySelector('.notranslate');
    if (!appRoot) {
      return;
    }

    const observer = new MutationObserver(resolveTheme);
    observer.observe(appRoot, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkMode;
}
