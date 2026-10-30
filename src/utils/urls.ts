const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const HOST_AND_PORT_PATTERN = /^[^\s/:?#]+:\d+(?:[/?#]|$)/;

export const normalizeWebUrl = (value: string): string => {
    const input = value.trim();
    // "localhost:3000" parses as a "localhost:" scheme, so treat host:port input as schemeless.
    const hasScheme = SCHEME_PATTERN.test(input) && !HOST_AND_PORT_PATTERN.test(input);
    let url: URL;

    try {
        url = new URL(hasScheme ? input : `https://${input}`);
    } catch {
        throw new Error("Enter a valid website URL.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Website URLs must begin with http:// or https://.");
    }

    return url.toString();
};
