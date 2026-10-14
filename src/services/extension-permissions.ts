import { isLocalPreview } from "../utils/environment";
import { writable } from "svelte/store";

interface ExtensionPermission {
    origins?: string[];
    permissions?: string[];
    data_collection?: string[];
}

interface FirefoxPermissions {
    request(permission: ExtensionPermission): Promise<boolean>;
    remove(permission: ExtensionPermission): Promise<boolean>;
    contains?(permission: ExtensionPermission): Promise<boolean>;
}

interface FirefoxExtensionApi {
    permissions?: FirefoxPermissions;
    runtime?: {
        getBrowserInfo?: () => Promise<unknown>;
    };
}

interface ChromePermission {
    origins?: string[];
    permissions?: string[];
}

interface ChromePermissions {
    request(
        permission: ChromePermission,
        callback: (granted: boolean) => void
    ): void;
    remove(
        permission: ChromePermission,
        callback: (removed: boolean) => void
    ): void;
}

interface ChromeExtensionApi {
    permissions?: ChromePermissions;
    runtime?: {
        lastError?: { message?: string };
    };
}

interface ExtensionWindow extends Window {
    browser?: FirefoxExtensionApi;
    chrome?: ChromeExtensionApi;
}

export const websiteActivityAccess = writable(false);

const getFirefoxPermissions = (): FirefoxPermissions | undefined => {
    const browserApi = (window as ExtensionWindow).browser;
    // Firefox exposes getBrowserInfo; Chrome's browser namespace does not support data_collection.
    if (typeof browserApi?.runtime?.getBrowserInfo !== "function") {
        return undefined;
    }

    return browserApi.permissions;
};

const toChromePermission = (
    permission: ExtensionPermission
): ChromePermission => {
    const chromePermission: ChromePermission = {};
    if (permission.origins) {
        chromePermission.origins = permission.origins;
    }
    if (permission.permissions) {
        chromePermission.permissions = permission.permissions;
    }
    return chromePermission;
};

const requestExtensionPermission = (
    permission: ExtensionPermission
): Promise<boolean> => {
    const extensionWindow = window as ExtensionWindow;
    const firefoxPermissions = getFirefoxPermissions();
    if (firefoxPermissions) {
        return firefoxPermissions.request(permission);
    }

    const chromePermission = toChromePermission(permission);
    if (!chromePermission.origins && !chromePermission.permissions) {
        return Promise.resolve(true);
    }

    const chromeApi = extensionWindow.chrome;
    if (!chromeApi?.permissions) {
        if (isLocalPreview()) {
            return Promise.resolve(true);
        }
        return Promise.reject(
            new Error("Open Tabby as a Chrome or Firefox extension to enable this panel.")
        );
    }

    return new Promise((resolve, reject) => {
        chromeApi.permissions?.request(chromePermission, (granted) => {
            const error = chromeApi.runtime?.lastError;
            if (error) {
                reject(
                    new Error(
                        error.message || "Azure DevOps access could not be requested."
                    )
                );
                return;
            }
            resolve(granted);
        });
    });
};

const removeExtensionPermission = (
    permission: ExtensionPermission
): Promise<boolean> => {
    const extensionWindow = window as ExtensionWindow;
    const firefoxPermissions = getFirefoxPermissions();
    if (firefoxPermissions) {
        return firefoxPermissions.remove(permission);
    }

    const chromePermission = toChromePermission(permission);
    if (!chromePermission.origins && !chromePermission.permissions) {
        return Promise.resolve(false);
    }

    const chromeApi = extensionWindow.chrome;
    if (!chromeApi?.permissions) {
        return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
        chromeApi.permissions?.remove(chromePermission, (removed) => {
            const error = chromeApi.runtime?.lastError;
            if (error) {
                reject(
                    new Error(
                        error.message || "Azure DevOps access could not be removed."
                    )
                );
                return;
            }
            resolve(removed);
        });
    });
};

export const requestAzureDevOpsAccess = (): Promise<boolean> =>
    requestExtensionPermission({
        origins: ["https://dev.azure.com/*"],
        data_collection: ["authenticationInfo"],
    });

export const removeAzureDevOpsAccess = (): Promise<boolean> =>
    removeExtensionPermission({ origins: ["https://dev.azure.com/*"] });

export const removeAuthenticationInfoAccess = (): Promise<boolean> =>
    removeExtensionPermission({ data_collection: ["authenticationInfo"] });

export const hasAuthenticationInfoAccess = async (): Promise<boolean> => {
    const browserPermissions = getFirefoxPermissions();
    if (!browserPermissions) {
        return true;
    }
    if (!browserPermissions.contains) {
        return false;
    }
    return browserPermissions.contains({
        data_collection: ["authenticationInfo"],
    });
};

export const hasLocationInfoAccess = async (): Promise<boolean> => {
    if (isLocalPreview()) {
        return true;
    }

    const browserPermissions = getFirefoxPermissions();
    if (!browserPermissions) {
        return true;
    }
    if (!browserPermissions.contains) {
        return false;
    }
    return browserPermissions.contains({
        data_collection: ["locationInfo"],
    });
};

const WEATHER_PERMISSION: ExtensionPermission = {
    origins: [
        "https://geocoding-api.open-meteo.com/*",
        "https://api.open-meteo.com/*",
    ],
    data_collection: ["locationInfo"],
};

export const requestWeatherAccess = (): Promise<boolean> =>
    requestExtensionPermission(WEATHER_PERMISSION);

export const removeWeatherAccess = (): Promise<boolean> =>
    removeExtensionPermission(WEATHER_PERMISSION);

const UNSPLASH_ORIGIN_PERMISSION: ExtensionPermission = {
    origins: ["https://api.unsplash.com/*"],
};

const UNSPLASH_PERMISSION: ExtensionPermission = {
    ...UNSPLASH_ORIGIN_PERMISSION,
    data_collection: ["authenticationInfo"],
};

export const requestUnsplashAccess = (): Promise<boolean> =>
    requestExtensionPermission(UNSPLASH_PERMISSION);

export const removeUnsplashAccess = (): Promise<boolean> =>
    removeExtensionPermission(UNSPLASH_ORIGIN_PERMISSION);

export const hasWebsiteActivityAccess = async (): Promise<boolean> => {
    if (isLocalPreview()) {
        return true;
    }

    const browserPermissions = getFirefoxPermissions();
    if (!browserPermissions) {
        return true;
    }
    if (!browserPermissions.contains) {
        return false;
    }
    return browserPermissions.contains({
        data_collection: ["websiteActivity"],
    });
};

export const requestWebsiteActivityAccess = async (): Promise<boolean> => {
    const granted = await requestExtensionPermission({
        data_collection: ["websiteActivity"],
    });
    websiteActivityAccess.set(granted);
    return granted;
};

export const removeWebsiteActivityAccess = async (): Promise<boolean> => {
    const removed = await removeExtensionPermission({
        data_collection: ["websiteActivity"],
    });
    websiteActivityAccess.set(false);
    return removed;
};
