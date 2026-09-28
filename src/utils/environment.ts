export interface LocalPreviewConfig {
    azureDevOpsOrganization: string;
    azureDevOpsPat: string;
    unsplashAccessKey: string;
}

export const localPreviewConfig: LocalPreviewConfig = __TABBY_LOCAL_CONFIG__;

export const isLocalPreview = (): boolean => {
    const hostname = window.location.hostname;
    const isLoopback =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname === "::1";

    return window.location.protocol === "http:" && isLoopback;
};
