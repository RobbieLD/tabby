import { get, writable } from 'svelte/store';
import type Icon from '../models/icon';
import { encodeImage, parseIcons } from '../utils/encoders';
import { findFavicon } from '../services/favicon.service';
import { normalizeWebUrl } from '../utils/urls';

const ICONS_KEY = "icons";
const ICONS_BACKUP_KEY = "icons-backup";

interface ValidatedIcons {
    icons: Icon[];
    skipped: number;
}

const validateIcon = (entry: unknown): Icon | null => {
    if (typeof entry !== "object" || entry === null) {
        return null;
    }

    const candidate = entry as {
        title?: unknown;
        url?: unknown;
        icon?: unknown;
    };
    if (
        typeof candidate.title !== "string" ||
        !candidate.title.trim() ||
        typeof candidate.url !== "string" ||
        typeof candidate.icon !== "string"
    ) {
        return null;
    }

    try {
        return {
            title: candidate.title,
            url: normalizeWebUrl(candidate.url),
            icon: candidate.icon,
        };
    } catch {
        return null;
    }
};

// Invalid entries and repeated titles are skipped individually so one bad shortcut can't hide the rest.
const validateIcons = (entries: unknown[]): ValidatedIcons => {
    const icons: Icon[] = [];
    const titles = new Set<string>();
    for (const entry of entries) {
        const icon = validateIcon(entry);
        if (icon && !titles.has(icon.title.toLowerCase())) {
            titles.add(icon.title.toLowerCase());
            icons.push(icon);
        }
    }

    return { icons, skipped: entries.length - icons.length };
};

const readIcons = (): Icon[] => {
    const storedIcons = window.localStorage.getItem(ICONS_KEY);
    if (!storedIcons) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(storedIcons);
        if (!Array.isArray(parsed)) {
            throw new Error("Saved shortcuts are not a list.");
        }

        const { icons, skipped } = validateIcons(parsed);
        if (skipped > 0) {
            // Keep the original data before the next edit overwrites it with the valid entries.
            window.localStorage.setItem(ICONS_BACKUP_KEY, storedIcons);
            console.warn(
                `${skipped} saved shortcut(s) could not be loaded. The original data was copied to "${ICONS_BACKUP_KEY}".`
            );
        }
        return icons;
    } catch (error) {
        window.localStorage.setItem(ICONS_BACKUP_KEY, storedIcons);
        console.error(
            `Saved shortcuts could not be loaded. The original data was copied to "${ICONS_BACKUP_KEY}".`,
            error
        );
        return [];
    }
};

const hasTitle = (items: Icon[], title: string): boolean =>
    items.some((item) => item.title.toLowerCase() === title.toLowerCase());

const createIcons = () => {
    const store = writable<Icon[]>(readIcons());
    const { subscribe, update, set } = store;

    const validate = (title: string, url: string): { title: string; url: string } => {
        const cleanTitle = title.trim();
        if (!cleanTitle) {
            throw new Error("Enter a name for this shortcut.");
        }

        const cleanUrl = normalizeWebUrl(url);
        if (hasTitle(get(store), cleanTitle)) {
            throw new Error("A shortcut with this name already exists.");
        }

        return { title: cleanTitle, url: cleanUrl };
    };

    return {
        subscribe,
        validate,
        remove: (title: string) =>
            update((items) => {
                const updatedIcons = items.filter((icon) => icon.title !== title);
                window.localStorage.setItem(ICONS_KEY, JSON.stringify(updatedIcons));
                return updatedIcons;
            }),
        reorder: (fromIndex: number, toIndex: number) =>
            update((items) => {
                if (
                    fromIndex < 0 ||
                    fromIndex >= items.length ||
                    toIndex < 0 ||
                    toIndex >= items.length ||
                    fromIndex === toIndex
                ) {
                    return items;
                }

                const updatedIcons = [...items];
                const [movedIcon] = updatedIcons.splice(fromIndex, 1);
                updatedIcons.splice(toIndex, 0, movedIcon);
                window.localStorage.setItem(ICONS_KEY, JSON.stringify(updatedIcons));
                return updatedIcons;
            }),
        add: async (title: string, url: string, file?: File) => {
            const shortcut = validate(title, url);
            const image = file ? await encodeImage(file) : findFavicon(shortcut.url);

            return update((items) => {
                // Check again in case another shortcut was saved while the icon was encoding.
                if (hasTitle(items, shortcut.title)) {
                    throw new Error("A shortcut with this name already exists.");
                }

                const updatedIcons = [
                    ...items,
                    { title: shortcut.title, url: shortcut.url, icon: image },
                ];
                window.localStorage.setItem(ICONS_KEY, JSON.stringify(updatedIcons));
                return updatedIcons;
            });
        },
        export: () => {
            const raw = window.localStorage.getItem(ICONS_KEY) || "[]";
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(raw));
            element.setAttribute('download', 'tabby.json');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();
            document.body.removeChild(element);
        },
        import: async (file: File): Promise<ValidatedIcons> => {
            let entries: unknown;
            try {
                entries = await parseIcons(file);
            } catch {
                throw new Error("The selected file is not a valid shortcuts export.");
            }
            if (!Array.isArray(entries)) {
                throw new Error("The selected file must contain a list of shortcuts.");
            }

            const result = validateIcons(entries);
            if (entries.length > 0 && result.icons.length === 0) {
                throw new Error("None of the shortcuts in the selected file are valid.");
            }

            window.localStorage.setItem(ICONS_KEY, JSON.stringify(result.icons));
            set(result.icons);
            return result;
        }
    }
}

export const icons = createIcons();
