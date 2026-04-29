import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Webfonts (variable axis — single tiny woff2)
import '@fontsource-variable/mona-sans';
import '@fontsource-variable/mona-sans/wdth.css';

// Design system base styles + CSS variables
import '@ohlify/ui/styles.css';

// App-local Tailwind directives
import './styles/index.css';

import { App } from './app.js';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
