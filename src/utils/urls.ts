export const normalizeWebUrl = (value: string): string => {
    const input = value.trim();
    let url: URL;

    try {
        url = new URL(input);
    } catch {
        try {
            url = new URL(`https://${input}`);
        } catch {
            throw new Error("Enter a valid website URL.");
        }
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Website URLs must begin with http:// or https://.");
    }

    return url.toString();
};
