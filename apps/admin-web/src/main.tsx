import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/mona-sans';
import '@fontsource-variable/mona-sans/wdth.css';

import '@ohlify/ui/styles.css';
// Hawk's tokens. Every name is --hawk-*, distinct from @ohlify/ui's --ohl-*,
// so both stylesheets coexist with zero collision.
import '@ohlify/hawk-ui/styles.css';
import './styles/index.css';

import { App } from './app.js';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
