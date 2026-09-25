export const findFavicon = (websiteUrl: string): string => {
    const origin = new URL(websiteUrl).origin;
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
        origin
    )}`;
};
