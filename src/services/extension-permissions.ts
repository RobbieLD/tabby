import { isLocalPreview } from "../utils/environment";

interface ExtensionPermission {
    origins?: string[];
    permissions?: string[];
}

interface FirefoxPermissions {
    request(permission: ExtensionPermission): Promise<boolean>;
    remove(permission: ExtensionPermission): Promise<boolean>;
}

interface ChromePermissions {
    request(
        permission: ExtensionPermission,
        callback: (granted: boolean) => void
    ): void;
    remove(
        permission: ExtensionPermission,
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

const requestExtensionPermission = (
    permission: ExtensionPermission
): Promise<boolean> => {
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

const removeExtensionPermission = (
    permission: ExtensionPermission
): Promise<boolean> => {
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
    requestExtensionPermission({ origins: ["https://dev.azure.com/*"] });

export const removeAzureDevOpsAccess = (): Promise<boolean> =>
    removeExtensionPermission({ origins: ["https://dev.azure.com/*"] });

const WEATHER_PERMISSION: ExtensionPermission = {
    origins: ["https://api.open-meteo.com/*"],
    permissions: ["geolocation"],
};

export const requestWeatherAccess = (): Promise<boolean> =>
    requestExtensionPermission(WEATHER_PERMISSION);

export const removeWeatherAccess = (): Promise<boolean> =>
    removeExtensionPermission(WEATHER_PERMISSION);

const UNSPLASH_PERMISSION: ExtensionPermission = {
    origins: ["https://api.unsplash.com/*"],
};

export const requestUnsplashAccess = (): Promise<boolean> =>
    requestExtensionPermission(UNSPLASH_PERMISSION);

export const removeUnsplashAccess = (): Promise<boolean> =>
    removeExtensionPermission(UNSPLASH_PERMISSION);
