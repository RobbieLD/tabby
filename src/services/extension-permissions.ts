import { isLocalPreview } from "../utils/environment";

interface HostPermission {
    origins: string[];
}

interface FirefoxPermissions {
    request(permission: HostPermission): Promise<boolean>;
    remove(permission: HostPermission): Promise<boolean>;
}

interface ChromePermissions {
    request(
        permission: HostPermission,
        callback: (granted: boolean) => void
    ): void;
    remove(
        permission: HostPermission,
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
    browser?: { permissions?: FirefoxPermissions };
    chrome?: ChromeExtensionApi;
}

const requestHostAccess = (permission: HostPermission): Promise<boolean> => {
    const extensionWindow = window as ExtensionWindow;
    if (extensionWindow.browser?.permissions) {
        return extensionWindow.browser.permissions.request(permission);
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
        chromeApi.permissions?.request(permission, (granted) => {
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

const removeHostAccess = (permission: HostPermission): Promise<boolean> => {
    const extensionWindow = window as ExtensionWindow;
    if (extensionWindow.browser?.permissions) {
        return extensionWindow.browser.permissions.remove(permission);
    }

    const chromeApi = extensionWindow.chrome;
    if (!chromeApi?.permissions) {
        return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
        chromeApi.permissions?.remove(permission, (removed) => {
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
    requestHostAccess({ origins: ["https://dev.azure.com/*"] });

export const removeAzureDevOpsAccess = (): Promise<boolean> =>
    removeHostAccess({ origins: ["https://dev.azure.com/*"] });

const OPEN_METEO_PERMISSION: HostPermission = {
    origins: [
        "https://api.open-meteo.com/*",
        "https://geocoding-api.open-meteo.com/*",
    ],
};

export const requestWeatherAccess = (): Promise<boolean> =>
    requestHostAccess(OPEN_METEO_PERMISSION);

export const removeWeatherAccess = (): Promise<boolean> =>
    removeHostAccess(OPEN_METEO_PERMISSION);

const UNSPLASH_PERMISSION: HostPermission = {
    origins: ["https://api.unsplash.com/*"],
};

export const requestUnsplashAccess = (): Promise<boolean> =>
    requestHostAccess(UNSPLASH_PERMISSION);

export const removeUnsplashAccess = (): Promise<boolean> =>
    removeHostAccess(UNSPLASH_PERMISSION);
