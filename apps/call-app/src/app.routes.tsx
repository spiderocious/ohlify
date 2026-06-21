import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import { isTestHarnessEnabled } from '@shared/config/env.js';
import { CallScreen } from '@features/call/screen/call-screen.js';

const TestHarnessScreen = lazy(() =>
  import('@features/test-harness/screen/test-harness-screen.js').then((m) => ({
    default: m.TestHarnessScreen,
  })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/call" element={<CallScreen />} />
      {isTestHarnessEnabled && (
        <Route
          path="/test"
          element={
            <Suspense fallback={<div className="p-8 text-zinc-400 text-sm">Loading...</div>}>
              <TestHarnessScreen />
            </Suspense>
          }
        />
      )}
      <Route
        path="*"
        element={
          <div className="flex h-screen items-center justify-center text-zinc-500 text-sm">
            Nothing here.
          </div>
        }
      />
    </Routes>
  );
}
