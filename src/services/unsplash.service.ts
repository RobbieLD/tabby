import type UnsplashResponse from '../models/unsplash-response';

export default class UnsplashService {
    private key: string

    public constructor(key: string) {
        this.key = key;
    }

    public async get(): Promise<UnsplashResponse> {
        const response = await fetch('https://api.unsplash.com/photos/random?orientation=landscape&query=nature&client_id=' + this.key);
        const data = await response.json();

        return {
            url: 'url(' + data.urls.full + ')',
            description: data.description || data.alt_description
        }
    }
}
