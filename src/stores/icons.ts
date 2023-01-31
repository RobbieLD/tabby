import { writable } from 'svelte/store';
import type Icon from '../models/icon';
import { encodeImage } from '../utils/encoders';

const readIcons = () => {
    const loadedIcons = JSON.parse(window.localStorage.getItem('icons') || '[]');

    const { subscribe, update } = writable<Icon[]>(loadedIcons);

    return {
        subscribe,
        remove: (title: string) => update(items => items.filter(i => i.title !== title)),
        add: (title: string, url: string, files: FileList) => {

            return encodeImage(files, (encodedIcon) => {
                const newIcon: Icon = {
                    title,
                    url,
                    icon: encodedIcon?.toString() || ''
                }

                return update(items => {
                    items.push(newIcon);
                    window.localStorage.setItem('icons', JSON.stringify(items));
                    return items;
                });

            });
        }
    }
}

export const icons = readIcons();
