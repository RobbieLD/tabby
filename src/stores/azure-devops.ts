import { writable } from "svelte/store";
import {
    normalizeOrganization,
} from "../services/azure-devops.service";

export interface AzureDevOpsSettings {
    organization: string;
    pat: string;
    enabled: boolean;
}

const STORAGE_KEY = "azure-devops-settings";
const DEFAULT_SETTINGS: AzureDevOpsSettings = {
    organization: "",
    pat: "",
    enabled: true,
};

const isSettings = (value: unknown): value is AzureDevOpsSettings => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as {
        organization?: unknown;
        pat?: unknown;
        enabled?: unknown;
    };
    return (
        typeof candidate.organization === "string" &&
        typeof candidate.pat === "string" &&
        typeof candidate.enabled === "boolean"
    );
};

const readSettings = (): AzureDevOpsSettings => {
    const storedSettings = window.localStorage.getItem(STORAGE_KEY);
    if (!storedSettings) {
        return { ...DEFAULT_SETTINGS };
    }

    try {
        const parsed: unknown = JSON.parse(storedSettings);
        if (!isSettings(parsed)) {
            throw new Error("The saved Azure DevOps settings have an invalid format.");
        }

        return {
            organization: normalizeOrganization(parsed.organization),
            pat: parsed.pat,
            enabled: parsed.enabled,
        };
    } catch (error) {
        console.error("Azure DevOps settings could not be loaded.", error);
        return { ...DEFAULT_SETTINGS };
    }
};

const { subscribe, set } = writable<AzureDevOpsSettings>(readSettings());

export const azureDevOpsSettings = {
    subscribe,
    save: (settings: AzureDevOpsSettings): AzureDevOpsSettings => {
        const nextSettings: AzureDevOpsSettings = {
            organization: normalizeOrganization(settings.organization),
            pat: settings.pat.trim(),
            enabled: settings.enabled,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
        set(nextSettings);
        return nextSettings;
    },
    clear: (): void => {
        window.localStorage.removeItem(STORAGE_KEY);
        set({ ...DEFAULT_SETTINGS });
    },
};
