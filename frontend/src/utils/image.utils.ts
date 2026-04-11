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

const normalizeSupabaseStorageUrl = (url: string): string => {
    if (!url.includes('supabase.co/storage/v1/')) {
        return url;
    }

    if (url.includes('/storage/v1/object/public/') || url.includes('/storage/v1/render/image/public/')) {
        return url;
    }

    // Handle legacy/private-like URLs saved in DB such as:
    // .../storage/v1/object/attachments/path/to/file.png
    if (url.includes('/storage/v1/object/')) {
        return url.replace('/storage/v1/object/', '/storage/v1/object/public/');
    }

    return url;
};

/**
 * Generates an optimized URL for a Supabase Storage object.
 * If the URL is not a Supabase URL, it returns the original URL.
 */
export const getOptimizedImageUrl = (url: string | undefined, options: ImageOptions = {}): string => {
    if (!url) return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&q=60&fm=webp';

    // For Unsplash URLs, apply width/quality/format params
    if (url.includes('images.unsplash.com')) {
        const u = new URL(url);
        if (options.width) u.searchParams.set('w', String(options.width));
        if (options.height) u.searchParams.set('h', String(options.height));
        if (options.quality) u.searchParams.set('q', String(options.quality));
        if (options.resize) u.searchParams.set('fit', options.resize === 'cover' ? 'crop' : options.resize);
        u.searchParams.set('fm', options.format || 'webp');
        u.searchParams.set('auto', 'format');
        return u.toString();
    }

    const normalizedUrl = normalizeSupabaseStorageUrl(url);

    // Note: Image transformations (/render/image/) require Supabase Pro plan.
    // On the Free plan, just return the normalized public URL directly.
    // If render/image URL was somehow stored, convert back to object/public.
    if (normalizedUrl.includes('/storage/v1/render/image/public/')) {
        return normalizedUrl.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
    }

    return normalizedUrl;
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
