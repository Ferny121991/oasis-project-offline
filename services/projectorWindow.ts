export type Display = {
  availLeft: number; availTop: number; availWidth: number; availHeight: number;
  left: number; top: number; width: number; height: number;
  label: string; isPrimary: boolean;
};
type DisplayDetails = EventTarget & { screens: Display[]; currentScreen: Display };
type DisplayWindow = Window & { getScreenDetails?: () => Promise<DisplayDetails> };
let details: DisplayDetails | undefined;

export function otherDisplay(): Display | undefined {
  if (!details) return;
  // currentScreen updates when the operator moves the desktop to another monitor.
  return details.screens.find(s => s !== details!.currentScreen &&
    (s.left !== details!.currentScreen.left || s.top !== details!.currentScreen.top));
}

export async function detectDisplays(prompt: boolean): Promise<DisplayDetails | undefined> {
  const api = window as DisplayWindow;
  if (!api.getScreenDetails) return;
  if (!prompt) {
    const permission = await navigator.permissions.query({ name: 'window-management' as PermissionName });
    if (permission.state !== 'granted') return;
  }
  details = await api.getScreenDetails();
  return details;
}

export function placeProjector(win: Window, display: Display) {
  if (win.closed || win.document.fullscreenElement) return;
  win.moveTo(display.availLeft, display.availTop);
  win.resizeTo(display.availWidth, display.availHeight);
}

export function fullscreenProjector(win: Window) {
  if (win.closed) return;
  if (win.document.fullscreenElement) return;
  win.focus();
  // A normal postMessage does not carry the operator's click activation.
  // Chromium supports explicit fullscreen delegation to the trusted popup.
  try {
    win.postMessage('OASIS_ENTER_FULLSCREEN', {
      targetOrigin: window.location.origin, delegate: 'fullscreen',
    } as WindowPostMessageOptions);
  } catch {
    win.postMessage('OASIS_ENTER_FULLSCREEN', window.location.origin);
  }
}
