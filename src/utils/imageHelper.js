/**
 * Get the best available image URL from Last.fm API response
 * @param {Object[]|Object|string} images - Last.fm API image array, single image object, or direct URL
 * @param {string} preferredSize - Preferred image size ('mega', 'extralarge', 'large', 'medium', 'small')
 * @returns {string} Best available image URL or fallback placeholder
 */
export const getBestImageUrl = (images, preferredSize = 'large') => {
  // Handle null/undefined case
  if (!images) return 'https://via.placeholder.com/300?text=No+Image';

  // Handle string URL
  if (typeof images === 'string') return images;

  // Handle single image object
  if (!Array.isArray(images) && typeof images === 'object') {
    return images['#text'] || 'https://via.placeholder.com/300?text=No+Image';
  }

  // Handle array of images
  if (Array.isArray(images)) {
    // Clean invalid entries
    const validImages = images.filter(img => img && typeof img === 'object' && img['#text']);
    
    if (validImages.length === 0) {
      return 'https://via.placeholder.com/300?text=No+Image';
    }

    // Size preference order (largest to smallest)
    const sizes = ['mega', 'extralarge', 'large', 'medium', 'small'];
    
    // First try preferred size
    if (preferredSize) {
      const preferred = validImages.find(img => img.size === preferredSize);
      if (preferred?.['#text']) {
        return preferred['#text'];
      }
    }
    
    // Try each size in order if preferred not found
    for (const size of sizes) {
      const match = validImages.find(img => img.size === size);
      if (match?.['#text']) {
        return match['#text'];
      }
    }

    // If no size match, return first valid image
    return validImages[0]['#text'];
  }

  // Fallback for unexpected input
  return 'https://via.placeholder.com/300?text=No+Image';
};
