/**
 * Utility for generating optimized Supabase Storage URLs.
 * Requires Supabase Storage transformation (Pro/Enterprise plan or self-hosted with imgproxy).
 */

interface ImageOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'origin';
    resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Generates an optimized URL for a Supabase Storage object.
 * If the URL is not a Supabase URL, it returns the original URL.
 */
export const getOptimizedImageUrl = (url: string | undefined, options: ImageOptions = {}): string => {
    if (!url) return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80';

    // Check if it's a Supabase Storage URL
    if (!url.includes('supabase.co/storage/v1/render/image/public/') && !url.includes('/storage/v1/object/public/')) {
        return url;
    }

    // Convert standard public URL to transformation URL if it's not already
    // Standard: .../storage/v1/object/public/bucket/path/to/file.jpg
    // Transform: .../storage/v1/render/image/public/bucket/path/to/file.jpg?width=...

    let baseUrl = url;
    if (url.includes('/storage/v1/object/public/')) {
        baseUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    }

    const params = new URLSearchParams();
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.format) params.set('format', options.format);
    if (options.resize) params.set('resize', options.resize);

    // Default format to WebP for optimization
    if (!params.has('format')) {
        params.set('format', 'webp');
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}` : baseUrl;
};

/**
 * Preset for service thumbnails in listing cards.
 */
export const getThumbnailUrl = (url: string | undefined) => getOptimizedImageUrl(url, {
    width: 400,
    height: 400,
    resize: 'cover',
    quality: 80
});

/**
 * Preset for service carousel images.
 */
export const getCarouselUrl = (url: string | undefined) => getOptimizedImageUrl(url, {
    width: 800,
    quality: 85
});

/**
 * Preset for small avatars or icons.
 */
export const getAvatarUrl = (url: string | undefined) => getOptimizedImageUrl(url, {
    width: 100,
    height: 100,
    resize: 'cover',
    quality: 70
});
