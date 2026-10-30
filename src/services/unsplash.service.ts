import type UnsplashResponse from '../models/unsplash-response';

export const UNSPLASH_COLOR_OPTIONS = [
    { value: "", label: "Any color" },
    { value: "black_and_white", label: "Black and white" },
    { value: "black", label: "Black" },
    { value: "white", label: "White" },
    { value: "yellow", label: "Yellow" },
    { value: "orange", label: "Orange" },
    { value: "red", label: "Red" },
    { value: "purple", label: "Purple" },
    { value: "magenta", label: "Magenta" },
    { value: "green", label: "Green" },
    { value: "teal", label: "Teal" },
    { value: "blue", label: "Blue" },
] as const;

export type UnsplashColor =
    (typeof UNSPLASH_COLOR_OPTIONS)[number]["value"];

export const DEFAULT_UNSPLASH_COLOR: UnsplashColor = "black";

export const isUnsplashColor = (value: string): value is UnsplashColor =>
    UNSPLASH_COLOR_OPTIONS.some((option) => option.value === value);

interface UnsplashPhotoUrls {
    raw?: string;
    full?: string;
}

interface UnsplashSearchResponse {
    results?: Array<{
        width?: number;
        height?: number;
        urls?: UnsplashPhotoUrls;
        description?: string | null;
        alt_description?: string | null;
        links?: { download_location?: string };
        user?: {
            name?: string;
            links?: { html?: string };
        };
    }>;
}

const MIN_IMAGE_WIDTH = 1280;
const MAX_IMAGE_WIDTH = 3840;
const DEFAULT_PHOTO_ASPECT_RATIO = 3 / 2;

// Width that lets the photo cover this screen at its pixel density without
// downloading the full-size original.
const getImageWidth = (photoWidth?: number, photoHeight?: number): number => {
    const aspectRatio =
        photoWidth && photoHeight ? photoWidth / photoHeight : DEFAULT_PHOTO_ASPECT_RATIO;
    const coverWidth =
        Math.max(window.screen.width, window.screen.height * aspectRatio) *
        (window.devicePixelRatio || 1);
    return Math.round(Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, coverWidth)));
};

const getImageUrl = (
    urls: UnsplashPhotoUrls | undefined,
    photoWidth?: number,
    photoHeight?: number
): string | undefined => {
    if (!urls?.raw) {
        return urls?.full;
    }

    const imageUrl = new URL(urls.raw);
    imageUrl.searchParams.set('w', String(getImageWidth(photoWidth, photoHeight)));
    imageUrl.searchParams.set('fit', 'max');
    imageUrl.searchParams.set('q', '80');
    imageUrl.searchParams.set('fm', 'jpg');
    imageUrl.searchParams.set('cs', 'srgb');
    return imageUrl.toString();
};

export default class UnsplashService {
    private key: string
    private searchTerms: string
    private color: UnsplashColor

    public constructor(key: string, searchTerms: string, color: UnsplashColor) {
        this.key = key;
        this.searchTerms = searchTerms;
        this.color = color;
    }

    public async get(): Promise<UnsplashResponse> {
        const searchUrl = new URL('https://api.unsplash.com/search/photos');
        searchUrl.searchParams.set('orientation', 'landscape');
        searchUrl.searchParams.set('query', this.searchTerms);
        if (this.color) {
            searchUrl.searchParams.set('color', this.color);
        }
        searchUrl.searchParams.set('per_page', '30');
        searchUrl.searchParams.set('client_id', this.key);

        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Unsplash request failed with HTTP ${response.status}.`);
        }

        const data = (await response.json()) as UnsplashSearchResponse;
        if (!data.results || data.results.length === 0) {
            throw new Error("Unsplash found no landscape photos for the current search.");
        }
        const photo = data.results[Math.floor(Math.random() * data.results.length)];
        const imageUrl = getImageUrl(photo.urls, photo.width, photo.height);
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
            imageUrl,
            description: photo.description || photo.alt_description || "Unsplash photo",
            photographerName,
            photographerUrl: photographerUrl.toString(),
        };
    }
}
