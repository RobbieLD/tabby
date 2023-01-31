export const encodeImage = (files: FileList, done: (result: string | ArrayBuffer | null) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => done(reader.result);
    reader.onerror = (error) => console.error(error);
    reader.readAsDataURL(files[0]);
}