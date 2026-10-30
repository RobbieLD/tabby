import { Vibrant } from "node-vibrant/browser";

const PALETTE_IMAGE_WIDTH = 400;

export type PaletteSwatchName =
    | "vibrant"
    | "muted"
    | "darkVibrant"
    | "darkMuted"
    | "lightVibrant"
    | "lightMuted";

export interface BackgroundTextPalette {
    primaryRgb: string;
    secondaryRgb: string;
    accentRgb: string;
    swatches: Record<PaletteSwatchName, string | null>;
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
    const toOptionalRgbChannels = (swatch: { rgb: number[] } | null | undefined) =>
        swatch ? toRgbChannels(swatch.rgb) : null;

    return {
        primaryRgb: toRgbChannels(primary.rgb),
        secondaryRgb: toRgbChannels(secondary.rgb),
        accentRgb: toRgbChannels(accent.rgb),
        swatches: {
            vibrant: toOptionalRgbChannels(palette.Vibrant),
            muted: toOptionalRgbChannels(palette.Muted),
            darkVibrant: toOptionalRgbChannels(palette.DarkVibrant),
            darkMuted: toOptionalRgbChannels(palette.DarkMuted),
            lightVibrant: toOptionalRgbChannels(palette.LightVibrant),
            lightMuted: toOptionalRgbChannels(palette.LightMuted),
        },
    };
}
