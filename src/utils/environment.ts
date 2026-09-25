export const isLocalPreview = (): boolean => {
    const hostname = window.location.hostname;
    const isLoopback =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname === "::1";

    return window.location.protocol === "http:" && isLoopback;
};
