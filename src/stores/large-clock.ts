import { writable } from "svelte/store";

const CLOCK_ENABLED_KEY = "large-clock-enabled";
const DEFAULT_CLOCK_ENABLED = true;

const readClockEnabled = (): boolean => {
    const storedValue = window.localStorage.getItem(CLOCK_ENABLED_KEY);
    if (storedValue === null) {
        return DEFAULT_CLOCK_ENABLED;
    }
    if (storedValue === "true") {
        return true;
    }
    if (storedValue === "false") {
        return false;
    }

    console.error("The saved large-clock setting has an invalid value.");
    window.localStorage.removeItem(CLOCK_ENABLED_KEY);
    return DEFAULT_CLOCK_ENABLED;
};

const clockEnabledStore = writable(readClockEnabled());

export const largeClockEnabled = {
    subscribe: clockEnabledStore.subscribe,
    save: (enabled: boolean): void => {
        if (typeof enabled !== "boolean") {
            throw new Error("Choose whether the large clock should be shown.");
        }

        window.localStorage.setItem(CLOCK_ENABLED_KEY, String(enabled));
        clockEnabledStore.set(enabled);
    },
};
