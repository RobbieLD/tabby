import { get, writable } from "svelte/store";
import type { SportsKind, SportsSettings, SportsTeam } from "../models/sports";

const SPORTS_SETTINGS_KEY = "sports-teams";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isSportsTeam = (value: unknown): value is SportsTeam => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === "number" &&
        Number.isSafeInteger(value.id) &&
        value.id > 0 &&
        typeof value.name === "string" &&
        value.name.trim().length > 0 &&
        (value.sport === "football" || value.sport === "cricket") &&
        (value.countryName === null || typeof value.countryName === "string") &&
        (value.gender === null || typeof value.gender === "string") &&
        typeof value.national === "boolean"
    );
};

const isSportsSettings = (value: unknown): value is SportsSettings =>
    isRecord(value) &&
    (value.football === null ||
        (isSportsTeam(value.football) && value.football.sport === "football")) &&
    (value.cricket === null ||
        (isSportsTeam(value.cricket) && value.cricket.sport === "cricket"));

const emptySettings = (): SportsSettings => ({
    football: null,
    cricket: null,
});

const readSettings = (): SportsSettings => {
    const storedSettings = window.localStorage.getItem(SPORTS_SETTINGS_KEY);
    if (!storedSettings) {
        return emptySettings();
    }

    try {
        const parsed: unknown = JSON.parse(storedSettings);
        if (!isSportsSettings(parsed)) {
            throw new Error("The saved sports settings have an invalid format.");
        }
        return parsed;
    } catch (error) {
        console.error("The saved sports settings could not be loaded.", error);
        window.localStorage.removeItem(SPORTS_SETTINGS_KEY);
        return emptySettings();
    }
};

const settingsStore = writable<SportsSettings>(readSettings());

export const sportsSettings = {
    subscribe: settingsStore.subscribe,
    save: (sport: SportsKind, team: SportsTeam): void => {
        if (!isSportsTeam(team) || team.sport !== sport) {
            throw new Error("Choose a valid team for this sport.");
        }

        const updatedSettings = {
            ...get(settingsStore),
            [sport]: team,
        };
        window.localStorage.setItem(
            SPORTS_SETTINGS_KEY,
            JSON.stringify(updatedSettings)
        );
        settingsStore.set(updatedSettings);
    },
    clear: (sport: SportsKind): void => {
        const updatedSettings = {
            ...get(settingsStore),
            [sport]: null,
        };
        if (!updatedSettings.football && !updatedSettings.cricket) {
            window.localStorage.removeItem(SPORTS_SETTINGS_KEY);
        } else {
            window.localStorage.setItem(
                SPORTS_SETTINGS_KEY,
                JSON.stringify(updatedSettings)
            );
        }
        settingsStore.set(updatedSettings);
    },
};
