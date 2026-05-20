
/**
 * Image compression and resizing service to maintain performance and storage limits.
 */
export const compressImage = (dataUrl: string, maxWidth = 1280, maxHeight = 720, quality = 0.5): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize maintaining aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Check if the input is a format that supports transparency
            const isTransparentFormat = dataUrl.startsWith('data:image/png') ||
                                         dataUrl.startsWith('data:image/svg+xml') ||
                                         dataUrl.startsWith('data:image/gif') ||
                                         dataUrl.startsWith('data:image/webp');

            if (isTransparentFormat) {
                // Export as PNG to preserve transparency
                resolve(canvas.toDataURL('image/png'));
            } else {
                // Compress to JPEG with specified quality
                resolve(canvas.toDataURL('image/jpeg', quality));
            }
        };
        img.onerror = (e) => reject(e);
    });
};
