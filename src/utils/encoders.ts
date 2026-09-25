const readFile = (file: File, asDataUrl: boolean): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("The selected file could not be read."));
                return;
            }
            resolve(reader.result);
        };
        reader.onerror = () =>
            reject(reader.error || new Error("The selected file could not be read."));

        if (asDataUrl) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    });

export const encodeImage = (file: File): Promise<string> =>
    readFile(file, true);

export const parseIcons = async (file: File): Promise<unknown> =>
    JSON.parse(await readFile(file, false)) as unknown;
