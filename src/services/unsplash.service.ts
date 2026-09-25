import type UnsplashResponse from '../models/unsplash-response';

export default class UnsplashService {
    private key: string

    public constructor(key: string) {
        this.key = key;
    }

    public async get(): Promise<UnsplashResponse> {
        const response = await fetch(
            'https://api.unsplash.com/photos/random?orientation=landscape&query=nature&client_id=' +
                encodeURIComponent(this.key)
        );
        if (!response.ok) {
            throw new Error(`Unsplash request failed with HTTP ${response.status}.`);
        }

        const data = (await response.json()) as {
            urls?: { full?: string };
            description?: string | null;
            alt_description?: string | null;
        };
        if (!data || !data.urls || !data.urls.full) {
            throw new Error("Unsplash did not return a background image.");
        }

        return {
            url: `url("${data.urls.full}")`,
            description: data.description || data.alt_description || "Unsplash photo",
        };
    }
}
