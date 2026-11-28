'use client';

import { useEffect, useState } from 'react';

// Same 1024px as Tailwind's `lg:` — the dashboard shows its inline chat from there up.
// null until mounted, so neither chat mounts (and polls) before we know the width.
export function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isDesktop;
}
