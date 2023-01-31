import { writable } from 'svelte/store';
import type Icon from '../models/icon';
import { encodeImage, parseIcons } from '../utils/encoders';

const readIcons = () => {
    const loadedIcons = JSON.parse(window.localStorage.getItem('icons') || '[]');

    const { subscribe, update, set } = writable<Icon[]>(loadedIcons);

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
        },
        export: () => {
            const raw = window.localStorage.getItem('icons');
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(raw));
            element.setAttribute('download', 'tabby.json');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        },
        import: (event) => {
            parseIcons(event.target.files, (data) => {
                window.localStorage.setItem('icons', data.toString());
                const inputIcons = JSON.parse(data.toString());
                set(inputIcons);
            });
        }
    }
}

export const icons = readIcons();
