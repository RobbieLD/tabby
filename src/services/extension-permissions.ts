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

const azureDevOpsHostPermission: HostPermission = {
    origins: ["https://dev.azure.com/*"],
};

export const requestAzureDevOpsAccess = (): Promise<boolean> => {
    const extensionWindow = window as ExtensionWindow;
    if (extensionWindow.browser?.permissions) {
        return extensionWindow.browser.permissions.request(azureDevOpsHostPermission);
    }

    const chromeApi = extensionWindow.chrome;
    if (!chromeApi?.permissions) {
        return Promise.reject(
            new Error("Open Tabby as a Chrome or Firefox extension to enable this panel.")
        );
    }

    return new Promise((resolve, reject) => {
        chromeApi.permissions?.request(azureDevOpsHostPermission, (granted) => {
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

export const removeAzureDevOpsAccess = (): Promise<boolean> => {
    const extensionWindow = window as ExtensionWindow;
    if (extensionWindow.browser?.permissions) {
        return extensionWindow.browser.permissions.remove(azureDevOpsHostPermission);
    }

    const chromeApi = extensionWindow.chrome;
    if (!chromeApi?.permissions) {
        return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
        chromeApi.permissions?.remove(azureDevOpsHostPermission, (removed) => {
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
