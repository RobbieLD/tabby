import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type Icon from '$lib/models/icon';
import { encodeImage } from '$lib/utils/encoders';

const readIcons = () => {
    let icons: Icon[] = [];

    if (browser) {
        icons = JSON.parse(window.localStorage.getItem('icons') || '[]');

        console.log(icons)
    }

    const { subscribe, update } = writable<Icon[]>(icons);

    return {
        subscribe,
        remove: (title: string) => update(items => items.filter(i => i.title !== title)),
        add: (title: string, url: string, files: FileList) => {
            
            return encodeImage(files, (encodedIcon) => {
                const newIcon: Icon = {
                    title: title,
                    url: url,
                    icon: encodedIcon?.toString() || ''
                }

                return update(items => {
                    items.push(newIcon);

                    if (browser) {
                        window.localStorage.setItem('icons', JSON.stringify(items));
                    }

                    return items;
                });

            });
        }
    }
}

export const icons = readIcons();