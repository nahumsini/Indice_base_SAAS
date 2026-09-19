import { useEffect } from 'react';

/** Discovery hint only, never an access-control mechanism. Restore on SPA exit. */
export function useInvestmentMetadata(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousRobots = Array.from(document.head.querySelectorAll<HTMLMetaElement>('meta[name="robots"]'));
    const previousContents = previousRobots.map(meta => meta.getAttribute('content'));
    const robots = previousRobots.length ? previousRobots : [document.createElement('meta')];
    robots.forEach(meta => {
      meta.name = 'robots';
      meta.content = 'noindex, nofollow, noarchive';
      if (!meta.isConnected) document.head.appendChild(meta);
    });
    document.title = title;
    return () => {
      document.title = previousTitle;
      robots.forEach((meta, index) => {
        if (!previousRobots.length) meta.remove();
        else if (previousContents[index] === null) meta.removeAttribute('content');
        else meta.setAttribute('content', previousContents[index]);
      });
    };
  }, [title]);
}
