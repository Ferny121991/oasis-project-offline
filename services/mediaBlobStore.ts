/**
 * Media Blob Store - IndexedDB-based storage for large media files (videos).
 * 
 * This solves the "Out of Memory" crash that occurs when:
 * 1. Videos are stored as base64 data URLs (huge strings)
 * 2. These strings are sent via BroadcastChannel to the projector
 * 3. They're saved to localStorage/Supabase (exceeding limits)
 * 
 * Instead, blobs are stored in IndexedDB (shared across same-origin windows)
 * and referenced by lightweight keys like "idb:slideId".
 */

const DB_NAME = 'oasis_media_store';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

// In-memory cache of Object URLs created from IndexedDB blobs
const objectUrlCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store a blob (File or Blob) in IndexedDB keyed by slide ID.
 */
export async function storeMediaBlob(slideId: string, blob: Blob): Promise<string> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, slideId);
      tx.oncomplete = () => {
        db.close();
        // Create and cache an Object URL for immediate use
        const url = URL.createObjectURL(blob);
        objectUrlCache.set(slideId, url);
        resolve(`idb:${slideId}`);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.error('Failed to store media blob:', e);
    // Fallback: return a direct Object URL (won't persist across refreshes)
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(slideId, url);
    return `idb:${slideId}`;
  }
}

/**
 * Retrieve a usable Object URL for a stored media blob.
 * Returns the Object URL or null if not found.
 * Works from any same-origin window (main app or projector).
 */
export async function getMediaBlobUrl(slideId: string): Promise<string | null> {
  // Check in-memory cache first
  if (objectUrlCache.has(slideId)) {
    return objectUrlCache.get(slideId)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(slideId);
      request.onsuccess = () => {
        db.close();
        if (request.result) {
          const url = URL.createObjectURL(request.result);
          objectUrlCache.set(slideId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (e) {
    console.error('Failed to retrieve media blob:', e);
    return null;
  }
}

/**
 * Check if a mediaUrl is an IndexedDB reference.
 */
export function isIdbMediaUrl(url: string | undefined): boolean {
  return !!url && url.startsWith('idb:');
}

/**
 * Extract slide ID from an idb: URL.
 */
export function getSlideIdFromIdbUrl(url: string): string {
  return url.replace('idb:', '');
}

/**
 * Delete a media blob from IndexedDB.
 */
export async function deleteMediaBlob(slideId: string): Promise<void> {
  // Revoke Object URL if cached
  const cached = objectUrlCache.get(slideId);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(slideId);
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(slideId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch (e) {
    console.error('Failed to delete media blob:', e);
  }
}

/**
 * Strip large media data from slides for serialization (localStorage, Supabase, BroadcastChannel).
 * Video slides with idb: URLs keep their reference (lightweight string).
 * Video slides with base64 data URLs get stripped to prevent memory issues.
 */
export function stripLargeMedia(slides: any[]): any[] {
  return slides.map(slide => {
    if (slide.type === 'video' && slide.mediaUrl) {
      if (isIdbMediaUrl(slide.mediaUrl)) {
        // Keep the idb: reference — it's just a tiny string like "idb:abc123"
        return slide;
      }
      // Strip base64 data URLs for videos (they're too large)
      if (slide.mediaUrl.startsWith('data:video/')) {
        return { ...slide, mediaUrl: undefined };
      }
    }
    return slide;
  });
}

/**
 * Strip large media from an entire playlist for safe serialization.
 */
export function stripPlaylistMedia(playlist: any[]): any[] {
  return playlist.map(item => ({
    ...item,
    slides: stripLargeMedia(item.slides || [])
  }));
}
