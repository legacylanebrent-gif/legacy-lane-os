import { base44 } from '@/api/base44Client';

/**
 * Get the best image source from an image object.
 * Prefers pre-generated thumbnail_url for small sizes, falls back to CDN params.
 * @param {object|string} image - Image object with { url, thumbnail_url } or plain URL string
 * @param {number|string} size - 'thumbnail' (300), 'gallery' (800), 'large' (1920), or pixel number
 * @returns {string} Best image URL for the requested size
 */
export const getImageSrc = (image, size = 'thumbnail') => {
  if (!image) return null;

  const sizePx = typeof size === 'number' ? size : { thumbnail: 300, gallery: 800, large: 1920 }[size] || 300;
  const imgObj = typeof image === 'string' ? { url: image } : image;

  // For thumbnails (≤400px): use pre-generated thumbnail_url if available
  if (sizePx <= 400 && imgObj.thumbnail_url) {
    return imgObj.thumbnail_url;
  }

  // Fall back to full URL with CDN resize params
  const url = imgObj.url || imgObj;
  if (!url) return null;

  if (url.includes('base44.com') || url.includes('media.base44.com')) {
    const baseUrl = url.split('?')[0];
    if (sizePx <= 200) return `${baseUrl}?w=200&h=200&fit=min&auto=compress,format`;
    if (sizePx <= 400) return `${baseUrl}?w=400&h=400&fit=min&auto=compress,format`;
    if (sizePx <= 800) return `${baseUrl}?w=800&h=600&fit=max&auto=compress,format`;
    return `${baseUrl}?w=1920&h=1080&fit=max&auto=compress,format`;
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
      img.onload = () => {
        const maxSize = 300;
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
      img.onerror = reject;
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
export const getImageDimensions = (context) => {
  const dimensions = {
    thumbnail: { width: 300, height: 300 },
    gallery: { width: 800, height: 600 },
    modal: { width: 1920, height: 1080 },
    full: { width: 2400, height: 1800 }
  };
  
  return dimensions[context] || dimensions.thumbnail;
};