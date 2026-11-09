import React, { useEffect, useRef, useState } from 'react';

/** File pickers can make the browser leave fullscreen. Never trap Escape. */
export default function FullscreenRecovery() {
  const target = useRef<HTMLElement | null>(null);
  const picking = useRef(false);
  const [needsRestore, setNeedsRestore] = useState(false);
  const restore = () => {
    const element = target.current;
    if (!element?.isConnected || document.fullscreenElement) return;
    element.requestFullscreen().then(() => setNeedsRestore(false)).catch(() => setNeedsRestore(true));
  };
  useEffect(() => {
    const beforePicker = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
        target.current = document.fullscreenElement as HTMLElement | null;
        picking.current = !!target.current;
      }
    };
    const afterPicker = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'file' && picking.current) {
        picking.current = false;
        restore();
      }
    };
    const changed = () => {
      if (document.fullscreenElement) setNeedsRestore(false);
      else if (picking.current) setNeedsRestore(true);
    };
    document.addEventListener('click', beforePicker, true);
    document.addEventListener('change', afterPicker, true);
    document.addEventListener('cancel', afterPicker, true);
    document.addEventListener('fullscreenchange', changed);
    return () => {
      document.removeEventListener('click', beforePicker, true);
      document.removeEventListener('change', afterPicker, true);
      document.removeEventListener('cancel', afterPicker, true);
      document.removeEventListener('fullscreenchange', changed);
    };
  }, []);
  if (!needsRestore) return null;
  return <div className="fullscreen-recovery" role="status">
    <span>El navegador salió de pantalla completa.</span>
    <button onClick={restore}>Volver a pantalla completa</button>
    <button aria-label="Descartar aviso de pantalla completa" onClick={() => setNeedsRestore(false)}>×</button>
  </div>;
}
