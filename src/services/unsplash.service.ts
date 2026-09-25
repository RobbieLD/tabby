import type UnsplashResponse from '../models/unsplash-response';

interface UnsplashSearchResponse {
    results?: Array<{
        urls?: { full?: string };
        description?: string | null;
        alt_description?: string | null;
        links?: { download_location?: string };
        user?: {
            name?: string;
            links?: { html?: string };
        };
    }>;
}

export default class UnsplashService {
    private key: string

    public constructor(key: string) {
        this.key = key;
    }

    public async get(): Promise<UnsplashResponse> {
        const searchUrl = new URL('https://api.unsplash.com/search/photos');
        searchUrl.searchParams.set('orientation', 'landscape');
        searchUrl.searchParams.set('query', 'nature');
        searchUrl.searchParams.set('color', 'black');
        searchUrl.searchParams.set('per_page', '30');
        searchUrl.searchParams.set('client_id', this.key);

        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Unsplash request failed with HTTP ${response.status}.`);
        }

        const data = (await response.json()) as UnsplashSearchResponse;
        if (!data.results || data.results.length === 0) {
            throw new Error("Unsplash found no dark landscape photos for this search.");
        }
        const photo = data.results[Math.floor(Math.random() * data.results.length)];
        const imageUrl = photo.urls?.full;
        const downloadLocation = photo.links?.download_location;
        const photographerName = photo.user?.name;
        const photographerPage = photo.user?.links?.html;
        if (!imageUrl || !downloadLocation || !photographerName || !photographerPage) {
            throw new Error("Unsplash returned a photo without its image or attribution details.");
        }

        const trackingUrl = new URL(downloadLocation);
        trackingUrl.searchParams.set('client_id', this.key);
        const trackingResponse = await fetch(trackingUrl);
        if (!trackingResponse.ok) {
            throw new Error(
                `Unsplash download tracking failed with HTTP ${trackingResponse.status}.`
            );
        }

        const photographerUrl = new URL(photographerPage);
        photographerUrl.searchParams.set('utm_source', 'tabby');
        photographerUrl.searchParams.set('utm_medium', 'referral');

        return {
            url: `url("${imageUrl}")`,
            description: photo.description || photo.alt_description || "Unsplash photo",
            photographerName,
            photographerUrl: photographerUrl.toString(),
        };
    }
}
