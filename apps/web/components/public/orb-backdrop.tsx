'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import Orb from '@/components/Orb';

export function OrbBackdrop() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains('dark'));

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const overlayClass = isDark
    ? isHome
      ? 'bg-[linear-gradient(180deg,rgba(6,0,18,0.18)_0%,rgba(6,0,18,0.4)_35%,rgba(6,0,18,0.74)_100%)]'
      : 'bg-[linear-gradient(180deg,rgba(6,0,18,0.42)_0%,rgba(6,0,18,0.64)_100%)]'
    : isHome
      ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(244,247,255,0.34)_35%,rgba(239,244,255,0.76)_100%)]'
      : 'bg-[linear-gradient(180deg,rgba(248,250,255,0.34)_0%,rgba(239,244,255,0.84)_100%)]';

  return (
    <div aria-hidden className="fixed inset-0 -z-20">
      <div
        className={cn(
          'h-full w-full transition-opacity duration-500',
          isHome ? 'opacity-100' : isDark ? 'opacity-72' : 'opacity-88',
        )}
      >
        <Orb
          hoverIntensity={0}
          rotateOnHover={false}
          hue={isDark ? 0 : -6}
          forceHoverState={false}
          backgroundColor={isDark ? '#060012' : '#eef3ff'}
        />
      </div>
      <div className={cn('pointer-events-none absolute inset-0', overlayClass)} />
    </div>
  );
}
