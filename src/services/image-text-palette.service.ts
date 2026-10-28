import { Vibrant } from "node-vibrant/browser";

export interface BackgroundTextPalette {
    primaryRgb: string;
    secondaryRgb: string;
    accentRgb: string;
}

export async function getBackgroundTextPalette(
    imageUrl: string
): Promise<BackgroundTextPalette | null> {
    const palette = await Vibrant.from(imageUrl)
        .maxDimension(200)
        .getPalette();
    const primary =
        palette.LightVibrant ??
        palette.LightMuted ??
        palette.Vibrant ??
        palette.Muted;
    if (!primary) {
        return null;
    }

    const secondary = palette.LightMuted ?? palette.LightVibrant ?? primary;
    const accent = palette.LightVibrant ?? palette.Vibrant ?? primary;
    const toRgbChannels = (rgb: number[]): string =>
        rgb.map((channel) => Math.round(channel)).join(", ");

    return {
        primaryRgb: toRgbChannels(primary.rgb),
        secondaryRgb: toRgbChannels(secondary.rgb),
        accentRgb: toRgbChannels(accent.rgb),
    };
}
