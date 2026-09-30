import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// First, so its `popstate` listener is added before the router's. See the file.
import './shared/lib/history-gate';
import { App } from './app/App';
import './app/styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
