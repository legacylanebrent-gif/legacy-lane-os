import { base44 } from '@/api/base44Client';

/**
 * Get optimized image URL for thumbnails
 * @param {string} imageUrl - Original image URL
 * @param {string} size - Size variant: 'thumbnail' (300x300), 'medium' (800x600), 'large' (1920x1080)
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (imageUrl, size = 'thumbnail') => {
  if (!imageUrl) return null;
  
  // If it's already a Base44 file URL, we can add transformation params
  if (imageUrl.includes('base44.com') || imageUrl.includes('media.base44.com')) {
    const sizeParams = {
      thumbnail: '?w=300&h=300&fit=min&auto=compress,format',
      medium: '?w=800&h=600&fit=max&auto=compress,format',
      large: '?w=1920&h=1080&fit=max&auto=compress,format'
    };
    
    // Remove existing query params if any
    const baseUrl = imageUrl.split('?')[0];
    return `${baseUrl}${sizeParams[size]}`;
  }
  
  // For external URLs (Unsplash, etc.), return as-is
  return imageUrl;
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