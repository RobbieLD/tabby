import { Vibrant } from "node-vibrant/browser";

const PALETTE_IMAGE_WIDTH = 400;

export interface BackgroundTextPalette {
    primaryRgb: string;
    secondaryRgb: string;
    accentRgb: string;
}

function getPaletteImageUrl(imageUrl: string): string {
    const paletteImageUrl = new URL(imageUrl);
    paletteImageUrl.searchParams.delete("auto");
    paletteImageUrl.searchParams.set("cs", "srgb");
    paletteImageUrl.searchParams.set("dpr", "1");
    paletteImageUrl.searchParams.set("fit", "max");
    paletteImageUrl.searchParams.set("fm", "jpg");
    paletteImageUrl.searchParams.set("q", "90");
    paletteImageUrl.searchParams.set("w", PALETTE_IMAGE_WIDTH.toString());
    return paletteImageUrl.toString();
}

export async function getBackgroundTextPalette(
    imageUrl: string
): Promise<BackgroundTextPalette | null> {
    const palette = await Vibrant.from(getPaletteImageUrl(imageUrl))
        .quality(1)
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
