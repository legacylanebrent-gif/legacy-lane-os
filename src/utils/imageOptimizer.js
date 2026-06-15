import { base44 } from '@/api/base44Client';

/**
 * Get the best image source from an image object.
 * Prefers pre-generated thumbnail_url for small sizes, falls back to CDN params.
 * @param {object|string} image - Image object with { url, thumbnail_url } or plain URL string
 * @param {number|string} size - 'thumbnail' (300), 'gallery' (800), 'large' (1920), or pixel number
 * @returns {string} Best image URL for the requested size
 */
export const getImageSrc = (image, size = 'thumbnail', opts = {}) => {
  if (!image) return null;

  const sizePx = typeof size === 'number' ? size : { thumbnail: 200, gallery: 800, large: 800 }[size] || 200;
  const imgObj = typeof image === 'string' ? { url: image } : image;

  // For thumbnail sizes (≤400px): prefer pre-generated thumbnail
  if (sizePx <= 400) {
    if (imgObj.thumbnail_url) return imgObj.thumbnail_url;
    if (opts.imageThumbnails && opts.index != null) {
      const thumbUrl = opts.imageThumbnails[String(opts.index)];
      if (thumbUrl) return thumbUrl;
    }
  }

  // Fall back to raw URL with CDN resizing params for performance
  const url = typeof imgObj.url === 'string' ? imgObj.url : (typeof imgObj === 'string' ? imgObj : null);
  if (!url) return null;

  // Append CDN width param to limit served image size
  if (url.includes('base44') || url.includes('media')) {
    return `${url}?width=${sizePx}&auto=compress,format`;
  }
  return url;
};

/**
 * Legacy alias — calls getImageSrc internally.
 * @deprecated Use getImageSrc instead.
 */
export const getOptimizedImageUrl = (imageUrl, size = 'thumbnail') => {
  if (!imageUrl) return null;
  if (typeof imageUrl === 'object' && imageUrl.thumbnail_url) return imageUrl.thumbnail_url;
  return getImageSrc(imageUrl, size);
};

/**
 * Generate a thumbnail data URL (JPEG, 300px max) from a File object.
 * Used during image upload to create a pre-generated thumbnail.
 * @param {File} file - The original image file
 * @returns {Promise<string>} data URL of the thumbnail
 */
export const createThumbnailDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        img.src = '';
        reject(new Error('Image decode timed out — format may not be supported'));
      }, 15000);
      img.onload = () => {
        clearTimeout(timeout);
        const maxSize = 200;
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
        else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Image decode failed — unsupported format'));
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Preload images for smoother gallery experience
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};

/**
 * Get image dimensions for responsive loading
 * @param {string} context - Where the image is displayed
 * @returns {object} Width and height attributes
 */
export const createResizedImageDataUrl = (file, maxSize = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        img.src = '';
        reject(new Error('Image decode timed out — format may not be supported'));
      }, 15000);
      img.onload = () => {
        clearTimeout(timeout);
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
        else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
        // Skip resize if image is already small enough
        if (img.width <= maxSize && img.height <= maxSize) {
          resolve(reader.result);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Image decode failed — unsupported format'));
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getImageDimensions = (context) => {
  const dimensions = {
    thumbnail: { width: 200, height: 200 },
    gallery: { width: 800, height: 600 },
    modal: { width: 800, height: 600 },
    full: { width: 800, height: 600 }
  };
  
  return dimensions[context] || dimensions.thumbnail;
};