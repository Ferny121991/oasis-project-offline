import React from 'react';
import { createRoot } from 'react-dom/client';

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('FlujoEclesial render error:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 560, border: '1px solid rgba(248,113,113,.35)', background: 'rgba(15,23,42,.94)', borderRadius: 24, padding: 28, boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>FlujoEclesial no pudo abrir esta sesion</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: '#cbd5e1', marginBottom: 18 }}>
            Hay datos guardados en este navegador que estan rompiendo el arranque. Recarga primero; si sigue igual, limpia solo los datos locales de Oasis.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 14, background: '#4f46e5', color: 'white', fontWeight: 800, padding: '12px 18px', cursor: 'pointer' }}>Recargar</button>
            <button
              onClick={() => {
                localStorage.clear();
                indexedDB.deleteDatabase('oasis_media_store');
                window.location.href = window.location.origin + window.location.pathname;
              }}
              style={{ border: '1px solid rgba(248,113,113,.45)', borderRadius: 14, background: 'rgba(127,29,29,.45)', color: 'white', fontWeight: 800, padding: '12px 18px', cursor: 'pointer' }}
            >
              Limpiar datos locales
            </button>
          </div>
        </div>
      </div>
    );
  }
}

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
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}).catch((error) => {
  console.error('No se pudo cargar FlujoEclesial:', error);
  rootElement.innerHTML = `
    <div style="height:100%;width:100%;display:flex;align-items:center;justify-content:center;background:#111827;color:white;font-family:Inter,system-ui,sans-serif;padding:24px;text-align:center;">
      <div style="max-width:520px;border:1px solid rgba(129,140,248,.35);background:rgba(15,23,42,.92);border-radius:24px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.35);">
        <div style="font-size:18px;font-weight:900;margin-bottom:10px;">FlujoEclesial necesita recargar</div>
        <div style="font-size:14px;line-height:1.55;color:#cbd5e1;margin-bottom:18px;">El navegador intento abrir una version vieja de la aplicacion. Recarga para tomar la version nueva.</div>
        <button onclick="window.location.reload()" style="border:0;border-radius:14px;background:#4f46e5;color:white;font-weight:800;padding:12px 18px;cursor:pointer;">Recargar ahora</button>
      </div>
    </div>
  `;
});
