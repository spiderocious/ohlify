import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { session } from '@ohlify/api';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      if (session.hasTokens()) {
        navigate(ROUTES.HOME.absPath, { replace: true });
      } else {
        navigate(ROUTES.ONBOARDING.absPath, { replace: true });
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 30%, #5C50F2 0%, var(--ohl-primary) 65%, #2A21AE 100%)',
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
          <span className="font-sans text-3xl font-extrabold text-white">o</span>
        </div>
        <span className="font-sans text-3xl font-extrabold text-white">ohlify</span>
      </div>
    </main>
  );
}
