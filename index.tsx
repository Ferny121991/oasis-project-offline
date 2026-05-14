import React from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const bootParams = new URLSearchParams(window.location.search);
const appModule = bootParams.get('projector') === 'true'
  ? import('./ProjectorApp')
  : import('./App');

appModule.then(({ default: App }) => {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
