import type Icon from '../models/icon';

export const encodeImage = (files: FileList, done: (result: string | ArrayBuffer) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => done(reader.result);
    reader.onerror = (error) => console.error(error);
    reader.readAsDataURL(files[0]);
}

export const parseIcons = (files: FileList, done: (data: string | ArrayBuffer) => void) => {
    const reader = new FileReader();
    reader.onload = () => done(reader.result);
    reader.onerror = (error) => console.error(error);
    reader.readAsText(files[0]);
}
