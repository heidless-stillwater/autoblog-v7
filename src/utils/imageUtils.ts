export const compressImage = async (
    base64Url: string,
    maxSizeBytes: number = 800 * 1024, // Target safe size (e.g., 800KB)
    maxWidth: number = 1024,
    initialQuality: number = 0.8
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Url;

        img.onload = () => {
            let width = img.width;
            let height = img.height;
            let quality = initialQuality;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            const tryCompress = (q: number) => {
                const dataUrl = canvas.toDataURL('image/jpeg', q);
                // Base64 overhead is approx 1.33x, but we check string length primarily for Firestore.
                // 1 char = 1 byte in standard ASCII/UTF-8 single byte per char calculation for limits usually?
                // Actually Firestore counts UTF-8 bytes. Base64 is ASCII. So result.length is roughly the byte count.

                if (dataUrl.length < maxSizeBytes || q < 0.1) {
                    resolve(dataUrl);
                } else {
                    // Reduce quality and try again
                    tryCompress(q - 0.1);
                }
            };

            tryCompress(quality);
        };

        img.onerror = () => reject(new Error('Failed to load image for compression'));
    });
};
