import React, { useEffect } from 'react';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
}

const SEO: React.FC<SEOProps> = ({
    title,
    description = "The ultimate platform for booking event services at competitive prices.",
    image = "/og-image.jpg",
    url = window.location.href
}) => {
    useEffect(() => {
        // Basic Tags
        document.title = `${title} | DOUSHA`;

        const setMetaTag = (name: string, content: string, isProperty = false) => {
            const attr = isProperty ? 'property' : 'name';
            let meta = document.querySelector(`meta[${attr}="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(attr, name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        // Standard meta
        setMetaTag('description', description);

        // Open Graph
        setMetaTag('og:title', title, true);
        setMetaTag('og:description', description, true);
        setMetaTag('og:image', image, true);
        setMetaTag('og:url', url, true);
        setMetaTag('og:type', 'website', true);

        // Twitter Card
        setMetaTag('twitter:card', 'summary_large_image');
        setMetaTag('twitter:title', title);
        setMetaTag('twitter:description', description);
        setMetaTag('twitter:image', image);

    }, [title, description, image, url]);

    return null;
};

export default SEO;
