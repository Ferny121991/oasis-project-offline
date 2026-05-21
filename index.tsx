import React from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const bootParams = new URLSearchParams(window.location.search);
rootElement.innerHTML = `
  <div style="height:100%;width:100%;display:flex;align-items:center;justify-content:center;background:#111827;color:white;font-family:Inter,system-ui,sans-serif;">
    <div style="display:flex;align-items:center;gap:12px;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a5b4fc;">
      <span style="width:14px;height:14px;border:2px solid rgba(165,180,252,.35);border-top-color:#67e8f9;border-radius:999px;display:inline-block;animation:oasis-spin .8s linear infinite;"></span>
      Cargando FlujoEclesial
    </div>
  </div>
  <style>@keyframes oasis-spin{to{transform:rotate(360deg)}}</style>
`;

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
