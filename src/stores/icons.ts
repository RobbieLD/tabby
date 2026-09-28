import { writable } from 'svelte/store';
import type Icon from '../models/icon';
import { encodeImage, parseIcons } from '../utils/encoders';
import { findFavicon } from '../services/favicon.service';
import { normalizeWebUrl } from '../utils/urls';

const validateIcons = (value: unknown): Icon[] => {
    if (!Array.isArray(value)) {
        throw new Error("The selected file must contain a list of shortcuts.");
    }

    return value.map((entry, index) => {
        if (typeof entry !== "object" || entry === null) {
            throw new Error(`Shortcut ${index + 1} is invalid.`);
        }

        const candidate = entry as {
            title?: unknown;
            url?: unknown;
            icon?: unknown;
        };
        if (
            typeof candidate.title !== "string" ||
            typeof candidate.url !== "string" ||
            typeof candidate.icon !== "string"
        ) {
            throw new Error(`Shortcut ${index + 1} is missing required fields.`);
        }

        return {
            title: candidate.title,
            url: normalizeWebUrl(candidate.url),
            icon: candidate.icon,
        };
    });
};

const readIcons = (): Icon[] => {
    const storedIcons = window.localStorage.getItem("icons");
    if (!storedIcons) {
        return [];
    }

    try {
        return validateIcons(JSON.parse(storedIcons) as unknown);
    } catch (error) {
        console.error("Saved shortcuts could not be loaded.", error);
        return [];
    }
};

const createIcons = () => {
    const { subscribe, update, set } = writable<Icon[]>(readIcons());

    return {
        subscribe,
        remove: (title: string) =>
            update((items) => {
                const updatedIcons = items.filter((icon) => icon.title !== title);
                window.localStorage.setItem("icons", JSON.stringify(updatedIcons));
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
                window.localStorage.setItem("icons", JSON.stringify(updatedIcons));
                return updatedIcons;
            }),
        add: async (title: string, url: string, file?: File) => {
            const cleanTitle = title.trim();
            if (!cleanTitle) {
                throw new Error("Enter a name for this shortcut.");
            }

            const cleanUrl = normalizeWebUrl(url);
            const image = file ? await encodeImage(file) : findFavicon(cleanUrl);

            return update((items) => {
                if (
                    items.some(
                        (item) => item.title.toLowerCase() === cleanTitle.toLowerCase()
                    )
                ) {
                    throw new Error("A shortcut with this name already exists.");
                }

                const updatedIcons = [
                    ...items,
                    { title: cleanTitle, url: cleanUrl, icon: image },
                ];
                window.localStorage.setItem("icons", JSON.stringify(updatedIcons));
                return updatedIcons;
            });
        },
        export: () => {
            const raw = window.localStorage.getItem("icons") || "[]";
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(raw));
            element.setAttribute('download', 'tabby.json');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();
            document.body.removeChild(element);
        },
        import: async (file: File) => {
            const importedIcons = validateIcons(await parseIcons(file));
            const data = JSON.stringify(importedIcons);
            window.localStorage.setItem("icons", data);
            set(importedIcons);
        }
    }
}

export const icons = createIcons();
