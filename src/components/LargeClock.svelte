<script lang="ts" module>
    import {
        getMoonIllumination,
        getMoonPosition,
        getMoonTimes,
        getTimes,
    } from "suncalc";
    import type { PaletteSwatchName } from "../services/image-text-palette.service";

    interface Point {
        x: number;
        y: number;
    }

    interface Coordinates {
        latitude: number;
        longitude: number;
    }

    interface CalendarDial {
        monthRotations: number[];
        yearProgressPath: string;
        monthProgressPath: string;
        dayOfMonth: string;
        dayOfYear: string;
        weekNumber: string;
        weekArrowPath: string;
    }

    interface SunState {
        angle: number;
        sunrise: Date | null;
        sunset: Date | null;
    }

    interface MoonEvent {
        type: "rise" | "set";
        time: Date;
    }

    interface MoonState {
        angle: number;
        rotation: number;
        lunaShadowPath: string;
        moonShadowPath: string;
        rise: Date | null;
        set: Date | null;
        description: string;
    }

    interface WindArrow {
        x: string;
        y: string;
        title: string;
    }

    interface MiniClock {
        transform: string;
        title: string;
        hourAngle: number | null;
        minuteAngle: number | null;
    }

    type Swatches = Record<PaletteSwatchName, string>;
    type WeatherIcon =
        | "clear"
        | "few-clouds"
        | "scattered-clouds"
        | "broken-clouds"
        | "shower-rain"
        | "rain"
        | "thunderstorm"
        | "snow"
        | "mist";
    type Line = readonly [number, number, number, number];

    let nextInstanceId = 0;

    const MINUTE_MS = 60 * 1000;
    const DAY_MS = 24 * 60 * MINUTE_MS;
    // Rotating the sun or moon to 270° moves it below the horizon, where the sun mask hides it.
    const HIDDEN_ANGLE = 270;
    const MAX_ARC_ANGLE = 359.99;
    const MIN_TEMPERATURE = -10;
    const MAX_TEMPERATURE = 35;
    const MAX_WIND_STRENGTH = 6;
    const MIN_WIND_ARROW_LENGTH = 8;
    const PREVIEW_LOCATION: Coordinates = { latitude: 51.5072, longitude: -0.1276 };
    const MAX_PRESSURE = 1050;
    const MIN_PRESSURE = 950;
    const MAX_HUMIDITY = 100;
    const MIN_HUMIDITY = 0;

    // Colours sampled from the original StartPage clock, used until a background palette is available.
    const DEFAULT_SWATCHES: Swatches = {
        vibrant: "51, 136, 189",
        muted: "89, 124, 164",
        darkVibrant: "20, 87, 152",
        darkMuted: "44, 73, 101",
        lightVibrant: "161, 186, 210",
        lightMuted: "212, 220, 232",
    };
    const SWATCH_FALLBACKS: Record<PaletteSwatchName, PaletteSwatchName[]> = {
        vibrant: ["lightVibrant", "darkVibrant", "muted"],
        muted: ["darkMuted", "lightMuted", "vibrant"],
        darkVibrant: ["darkMuted", "vibrant"],
        darkMuted: ["darkVibrant", "muted"],
        lightVibrant: ["lightMuted", "vibrant"],
        lightMuted: ["lightVibrant", "muted"],
    };
    const SWATCH_NAMES = Object.keys(DEFAULT_SWATCHES) as PaletteSwatchName[];

    const MONTH_NAMES = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    const WEEKDAYS = [
        { letter: "M", offset: 280, weekend: false },
        { letter: "T", offset: 5, weekend: false },
        { letter: "W", offset: 40, weekend: false },
        { letter: "T", offset: 75, weekend: false },
        { letter: "F", offset: 110, weekend: false },
        { letter: "S", offset: 145, weekend: true },
        { letter: "S", offset: 180, weekend: true },
    ];
    const COMPASS_POINTS = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
    ];

    const DAYS_OF_WEEK_REGION =
        "M -300 0 A 300 300 0 0 0 0 300 L 0 275 A 50 50 0 0 1 0 175 L 0 150 A 150 150 0 0 1 -150 0 L -175 0 A 50 50 0 0 1 -275 0 z";
    const DAYS_OF_MONTH_REGION =
        "M 300 0 A 300 300 0 0 1 0 300 L 0 275 A 50 50 0 0 0 0 175 L 0 150 A 150 150 0 0 0 150 0 L 175 0 A 50 50 0 0 0 275 0 z";

    const DIAL_JUNCTIONS: readonly Line[] = [
        [0, 150, 0, 175],
        [0, 275, 0, 300],
        [150, 0, 175, 0],
        [275, 0, 300, 0],
        [-300, 0, -275, 0],
        [-175, 0, -150, 0],
    ];
    const TEMPERATURE_TICKS: readonly Line[] = [
        [-12, 150, -14, 175],
        [-23, 148, -28, 183],
        [-22, 275, -24, 299],
        [-40, 255, -47, 296],
        [-35, 146, -70, 292],
        [-46, 143, -93, 285],
        [-57, 139, -115, 277],
        [-68, 134, -136, 267],
        [-78, 128, -157, 256],
        [-88, 121, -176, 243],
        [-97, 114, -195, 228],
        [-106, 106, -212, 212],
        [-114, 97, -228, 195],
        [-121, 88, -243, 176],
        [-128, 78, -256, 157],
        [-134, 68, -267, 136],
        [-139, 57, -277, 115],
        [-143, 46, -285, 93],
        [-146, 35, -292, 70],
        [-148, 23, -180, 30],
        [-260, 40, -296, 47],
        [-269, 21, -299, 24],
        [-150, 12, -180, 15],
    ];
    const HUMIDITY_MAJOR_TICKS: readonly Line[] = [
        [177, 31, 190, 34],
        [169, 62, 211, 77],
        [156, 90, 195, 113],
        [138, 116, 172, 145],
        [116, 138, 145, 172],
        [90, 156, 113, 195],
        [62, 169, 77, 211],
        [31, 177, 32, 190],
    ];
    const HUMIDITY_MINOR_TICKS: readonly Line[] = [
        [193, 52, 217, 58],
        [181, 85, 204, 95],
        [164, 115, 184, 129],
        [141, 141, 159, 159],
        [115, 164, 129, 184],
        [85, 181, 95, 204],
        [52, 193, 58, 217],
    ];
    const PRESSURE_MINOR_TICKS: readonly Line[] = [
        [217, 58, 241, 65],
        [204, 95, 227, 106],
        [184, 129, 205, 143],
        [159, 159, 177, 177],
        [129, 184, 143, 205],
        [95, 204, 106, 227],
        [58, 217, 65, 241],
    ];
    const PRESSURE_MAJOR_TICKS: readonly Line[] = [
        [255, 45, 271, 48],
        [211, 77, 258, 94],
        [195, 113, 238, 138],
        [172, 145, 211, 177],
        [145, 172, 177, 211],
        [113, 195, 138, 238],
        [77, 211, 94, 258],
        [44, 250, 48, 271],
    ];
    const RADAR_RADII = [25, 50, 75, 100, 125];

    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
    const clamp = (value: number, minimum: number, maximum: number): number =>
        Math.min(Math.max(value, minimum), maximum);
    const normaliseDegrees = (degrees: number): number => ((degrees % 360) + 360) % 360;
    const formatNumber = (value: number): string =>
        (Math.round(value * 100) / 100 || 0).toString();

    const pointOnCircle = (
        degrees: number,
        offset: number,
        radius: number,
        centreX = 0,
        centreY = 0
    ): Point => {
        const radians = toRadians(degrees - offset);
        return {
            x: Math.cos(radians) * radius + centreX,
            y: Math.sin(radians) * radius + centreY,
        };
    };
    const formatPoint = ({ x, y }: Point): string => `${formatNumber(x)} ${formatNumber(y)}`;

    // The original face used the commercial Manygo Serif font, which can't be redistributed. These
    // slab-serif glyphs are Tabby's own drawings; only the advance widths match the original so the
    // numerals keep their original positions on the dial.
    const NUMERAL_GLYPHS: Record<string, { advance: number; d: string }> = {
        I: {
            advance: 156,
            d: "M17 -760L139 -760L139 -738L123 -738Q109 -738 109 -724L109 -36Q109 -22 123 -22L139 -22L139 0L17 0L17 -22L33 -22Q47 -22 47 -36L47 -724Q47 -738 33 -738L17 -738Z",
        },
        V: {
            advance: 253,
            d: "M8 -760L130 -760L130 -738L114 -738Q100 -738 101.2 -724.1L145 -234.8L188.8 -724.1Q190 -738 176 -738L164 -738L164 -760L242 -760L242 -738L230 -738Q216 -738 214.8 -724.1L150 0L104 0L39.2 -724.1Q38 -738 24 -738L8 -738Z",
        },
        X: {
            advance: 264,
            d: "M6 -760L128 -760L128 -738L112 -738Q98 -738 100.5 -724.2L225.5 -35.8Q228 -22 242 -22L258 -22L258 0L136 0L136 -22L152 -22Q166 -22 163.5 -35.8L38.5 -724.2Q36 -738 22 -738L6 -738ZM166 -760L244 -760L244 -738L232 -738Q218 -738 215 -724.3L65 -35.7Q62 -22 76 -22L88 -22L88 0L10 0L10 -22L22 -22Q36 -22 39 -35.7L189 -724.3Q192 -738 178 -738L166 -738Z",
        },
    };
    // Each numeral starts at the angle (clockwise from 3 o'clock) the original stylesheet rotated it to.
    const ROMAN_NUMERALS: [string, number][] = [
        ["XII", -99],
        ["I", -63],
        ["II", -35],
        ["III", -6],
        ["IV", 24],
        ["V", 57],
        ["VI", 84],
        ["VII", 111],
        ["VIII", 141],
        ["IX", 175],
        ["X", 206],
        ["XI", 231],
    ];
    const NUMERAL_SCALE = 0.18;
    const NUMERAL_PATH_RADIUS = 400;
    const NUMERAL_BASELINE_RADIUS = 305;

    // Lays the glyphs out the way the original text path did: advances are measured along the
    // r=400 path and the baseline is shifted 95 units inwards.
    const NUMERAL_PATHS: { d: string; transform: string }[] = [];
    ROMAN_NUMERALS.forEach(([numeral, startAngle]) => {
        const glyphs = Array.from(numeral, (letter) => NUMERAL_GLYPHS[letter]);
        let angle = startAngle;

        for (const glyph of glyphs) {
            const halfAdvance = toDegrees((glyph.advance * NUMERAL_SCALE) / 2 / NUMERAL_PATH_RADIUS);
            angle += halfAdvance;
            NUMERAL_PATHS.push({
                d: glyph.d,
                transform: `rotate(${formatNumber(angle)}) translate(${NUMERAL_BASELINE_RADIUS} 0) rotate(90) scale(${NUMERAL_SCALE}) translate(${-glyph.advance / 2} 0)`,
            });
            angle += halfAdvance;
        }
    });

    function resolveSwatches(
        palette: Record<PaletteSwatchName, string | null> | null | undefined
    ): Swatches {
        if (!palette) {
            return DEFAULT_SWATCHES;
        }

        const resolved = { ...DEFAULT_SWATCHES };
        for (const name of SWATCH_NAMES) {
            const swatch = [name, ...SWATCH_FALLBACKS[name]]
                .map((candidate) => palette[candidate])
                .find((value): value is string => Boolean(value));
            resolved[name] = swatch ?? DEFAULT_SWATCHES[name];
        }
        return resolved;
    }

    function getIsoWeek(year: number, month: number, day: number): number {
        const date = new Date(Date.UTC(year, month, day));
        const weekday = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - weekday);
        const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
        return Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
    }

    function getCalendarDial(calendarKey: number): CalendarDial {
        const year = Math.floor(calendarKey / 10000);
        const month = Math.floor(calendarKey / 100) % 100;
        const day = calendarKey % 100;
        const weekday = new Date(year, month, day).getDay();

        const dayOfYear = Math.round((Date.UTC(year, month, day) - Date.UTC(year, 0, 0)) / DAY_MS);
        const daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS);
        const yearAngle = Math.min((dayOfYear / daysInYear) * 360, MAX_ARC_ANGLE);
        const yearEnd = pointOnCircle(yearAngle, 90, 472);

        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const monthAngle = Math.min((day / daysInMonth) * 360, MAX_ARC_ANGLE);
        const monthLargeArc = monthAngle > 180 ? 1 : 0;

        const dayAngle = 20 + ((weekday + 6) % 7) * 40;

        return {
            // This version rotates the months so the current month is always at the top however it looks better if January is always at the top.
            // monthRotations: MONTH_NAMES.map((_, index) => -100 + 30 * ((index - month + 12) % 12)),
            monthRotations: MONTH_NAMES.map((_, index) => -98 + 30 * ((index + 12) % 12)),
            yearProgressPath: `M 0 -472 A 472 472 0 ${yearAngle > 180 ? 1 : 0} 1 ${formatPoint(yearEnd)}`,
            monthProgressPath: `M 225 -50 A 50 50 0 ${monthLargeArc} 1 ${formatPoint(
                pointOnCircle(monthAngle, 90, 50, 225, 0)
            )} L ${formatPoint(pointOnCircle(monthAngle, 90, 25, 225, 0))} A 25 25 0 ${monthLargeArc} 0 225 -25 z`,
            dayOfMonth: day.toString().padStart(2, "0"),
            dayOfYear: dayOfYear.toString().padStart(3, "0"),
            weekNumber: getIsoWeek(year, month, day).toString().padStart(2, "0"),
            weekArrowPath: `M ${formatPoint(pointOnCircle(dayAngle, 320, 5, -225, 0))} L ${formatPoint(
                pointOnCircle(dayAngle, 230, 30, -225, 0)
            )} L ${formatPoint(pointOnCircle(dayAngle, 140, 5, -225, 0))} z`,
        };
    }

    function getSunState(date: Date, observer: Coordinates | null): SunState {
        if (!observer) {
            return { angle: HIDDEN_ANGLE, sunrise: null, sunset: null };
        }

        const times = getTimes(date, observer.latitude, observer.longitude);
        const sunrise = times.sunrise;
        const sunset = times.sunset;
        let angle = HIDDEN_ANGLE;
        if (sunrise && sunset && date >= sunrise && date <= sunset) {
            angle =
                ((date.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime())) * 180;
        } else if (times.alwaysUp) {
            angle = 90;
        }

        return { angle, sunrise, sunset };
    }

    function getMoonEvents(date: Date, observer: Coordinates): MoonEvent[] {
        const events: MoonEvent[] = [];
        for (let dayOffset = -1; dayOffset <= 2; dayOffset += 1) {
            const times = getMoonTimes(
                new Date(date.getTime() + dayOffset * DAY_MS),
                observer.latitude,
                observer.longitude
            );
            if (times.rise) {
                events.push({ type: "rise", time: times.rise });
            }
            if (times.set) {
                events.push({ type: "set", time: times.set });
            }
        }

        events.sort((first, second) => first.time.getTime() - second.time.getTime());
        return events.filter((event, index) => {
            const previous = events[index - 1];
            return (
                !previous ||
                previous.type !== event.type ||
                event.time.getTime() - previous.time.getTime() > 30 * MINUTE_MS
            );
        });
    }

    function getMoonPhaseName(phase: number): string {
        if (phase < 0.03 || phase > 0.97) {
            return "New moon";
        }
        if (phase < 0.22) {
            return "Waxing crescent";
        }
        if (phase < 0.28) {
            return "First quarter";
        }
        if (phase < 0.47) {
            return "Waxing gibbous";
        }
        if (phase < 0.53) {
            return "Full moon";
        }
        if (phase < 0.72) {
            return "Waning gibbous";
        }
        if (phase < 0.78) {
            return "Last quarter";
        }
        return "Waning crescent";
    }

    function getMoonState(date: Date, observer: Coordinates | null): MoonState {
        const illumination = getMoonIllumination(date);
        const position = observer
            ? getMoonPosition(date, observer.latitude, observer.longitude)
            : null;
        const percent = illumination.fraction * 100;
        const terminator = Math.abs(percent - 50) / 50;
        const sweep = percent > 50 ? 0 : 1;
        // The shadow paths are lit on their right, so turn that side towards the bright limb.
        const rotation = normaliseDegrees(
            270 - (illumination.angle - (position?.parallacticAngle ?? 0))
        );
        const phase = {
            rotation,
            lunaShadowPath: `M -300 -150 L 0 -150 A ${formatNumber(terminator * 150)} 150 0 0 ${sweep} 0 150 L -300 150 z`,
            moonShadowPath: `M -40 18 L -40 -18 L 0 -18 A ${formatNumber(terminator * 18)} 18 0 0 ${sweep} 0 18 z`,
            description: `${getMoonPhaseName(illumination.phase)}, ${Math.round(percent)}% illuminated`,
        };
        if (!observer || !position) {
            return { ...phase, angle: HIDDEN_ANGLE, rise: null, set: null };
        }

        const time = date.getTime();
        const events = getMoonEvents(date, observer);
        const previous = events.filter((event) => event.time.getTime() <= time);
        const upcoming = events.filter((event) => event.time.getTime() > time);
        const lastEvent = previous[previous.length - 1];
        const isUp = lastEvent
            ? lastEvent.type === "rise"
            : upcoming.length > 0
              ? upcoming[0].type === "set"
              : position.altitude > 0;
        const findLast = (type: MoonEvent["type"]): Date | null =>
            [...previous].reverse().find((event) => event.type === type)?.time ?? null;
        const findNext = (type: MoonEvent["type"]): Date | null =>
            upcoming.find((event) => event.type === type)?.time ?? null;

        if (!isUp) {
            return { ...phase, angle: HIDDEN_ANGLE, rise: findNext("rise"), set: findLast("set") };
        }

        const rise = findLast("rise");
        const set = findNext("set");
        const angle =
            rise && set
                ? ((time - rise.getTime()) / (set.getTime() - rise.getTime())) * 180
                : 90;
        return { ...phase, angle, rise, set };
    }

    function getMiniClock(
        transform: string,
        label: string,
        time: Date | null,
        now: Date,
        hasObserver: boolean
    ): MiniClock {
        if (!time) {
            return {
                transform,
                title: hasObserver
                    ? `${label} unavailable`
                    : `${label}: choose a weather location in Settings`,
                hourAngle: null,
                minuteAngle: null,
            };
        }

        const clockTime = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const day =
            time.toDateString() === now.toDateString()
                ? ""
                : ` ${time.toLocaleDateString([], { weekday: "short" })}`;
        return {
            transform,
            title: `${label}${day} ${clockTime}`,
            hourAngle: ((time.getHours() % 12) / 12) * 360,
            minuteAngle: (time.getMinutes() / 60) * 360,
        };
    }

    const getTemperatureAngle = (temperature: number): number =>
        clamp(
            (90 * (temperature - MIN_TEMPERATURE)) / (MAX_TEMPERATURE - MIN_TEMPERATURE),
            0,
            90
        );

    function getTemperatureRangePath(minimum: number | null, maximum: number | null): string {
        if (minimum === null || maximum === null) {
            return "";
        }

        const minimumAngle = getTemperatureAngle(Math.min(minimum, maximum));
        const maximumAngle = getTemperatureAngle(Math.max(minimum, maximum));
        return `M ${formatPoint(pointOnCircle(maximumAngle, 270, 150))} A 150 150 0 0 0 ${formatPoint(
            pointOnCircle(minimumAngle, 270, 150)
        )} L ${formatPoint(pointOnCircle(minimumAngle, 270, 300))} A 300 300 0 0 1 ${formatPoint(
            pointOnCircle(maximumAngle, 270, 300)
        )} z`;
    }

    function getHumidityPointerPath(humidity: number): string {
        const angle = 95 - clamp(humidity, 0, 100) * 0.9;
        return `M ${formatPoint(pointOnCircle(angle + 5, 0, 150))} L ${formatPoint(
            pointOnCircle(angle, 0, 195)
        )} L ${formatPoint(pointOnCircle(angle - 5, 0, 150))} z`;
    }

    function getPressurePointerPath(pressure: number): string {
        const angle = 95 - (clamp(pressure, MIN_PRESSURE, MAX_PRESSURE) - MIN_PRESSURE) * 0.9;
        return `M ${formatPoint(pointOnCircle(angle - 2.5, 0, 300))} L ${formatPoint(
            pointOnCircle(angle, 0, 255)
        )} L ${formatPoint(pointOnCircle(angle + 2.5, 0, 300))} z`;
    }

    function getWindArrow(speed: number, direction: number | null): WindArrow | null {
        if (direction === null) {
            return null;
        }

        const metresPerSecond = Math.max(speed, 0) / 3.6;
        const strength =
            metresPerSecond > 0 ? clamp(Math.log2(metresPerSecond), 0, MAX_WIND_STRENGTH) : 0;
        const length = Math.max(
            (strength / MAX_WIND_STRENGTH) * 150,
            MIN_WIND_ARROW_LENGTH
        );
        // The arrow points downwind, so turn the "from" bearing by 90° into SVG angles.
        const radians = toRadians(direction + 90);
        const compassPoint = COMPASS_POINTS[Math.round(normaliseDegrees(direction) / 22.5) % 16];
        return {
            x: formatNumber(Math.cos(radians) * length),
            y: formatNumber(Math.sin(radians) * length),
            title: `Wind ${Math.round(speed)} km/h from ${compassPoint} (${Math.round(direction)}°)`,
        };
    }

    // Picks the OpenWeatherMap icon the original clock would have shown for each WMO weather code.
    function getWeatherIcon(weatherCode: number): WeatherIcon {
        if (weatherCode === 0) {
            return "clear";
        }
        if (weatherCode === 1) {
            return "few-clouds";
        }
        if (weatherCode === 2) {
            return "scattered-clouds";
        }
        if (weatherCode === 45 || weatherCode === 48) {
            return "mist";
        }
        if ((weatherCode >= 51 && weatherCode <= 57) || (weatherCode >= 80 && weatherCode <= 82)) {
            return "shower-rain";
        }
        if (weatherCode >= 61 && weatherCode <= 65) {
            return "rain";
        }
        if ((weatherCode >= 66 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) {
            return "snow";
        }
        if (weatherCode >= 95 && weatherCode <= 99) {
            return "thunderstorm";
        }
        return "broken-clouds";
    }

    // Flat weather icons drawn to match the look and placement of the OpenWeatherMap icons the
    // original clock displayed in its weather gauge.
    const RAIN_DROPS: Point[] = [
        { x: -12, y: 8 },
        { x: -15, y: 17.5 },
        { x: -7.5, y: 15 },
        { x: 3, y: 13 },
        { x: -9, y: 22 },
        { x: -1, y: 22 },
    ];
    const MIST_LINES: { x1: number; x2: number; y: number }[] = [
        { x1: -10, x2: 5, y: -15 },
        { x1: -22.5, x2: 8, y: -8.5 },
        { x1: -11, x2: 25.5, y: -2.5 },
        { x1: -25.5, x2: 11, y: 3.5 },
        { x1: -17.5, x2: 19.5, y: 9.5 },
        { x1: -11, x2: 11, y: 15.5 },
    ];
    const SNOWFLAKE_ANGLES = [-90, -30, 30, 90, 150, 210];
    const SNOWFLAKE_PATH = [
        `M ${SNOWFLAKE_ANGLES.map((angle) => formatPoint(pointOnCircle(angle, 0, 3.5))).join(" L ")} Z`,
        ...SNOWFLAKE_ANGLES.map((angle) => {
            const barbBase = pointOnCircle(angle, 0, 12.5);
            return [
                `M ${formatPoint(pointOnCircle(angle, 0, 3.5))} L ${formatPoint(pointOnCircle(angle, 0, 19))}`,
                `M ${formatPoint(pointOnCircle(angle - 50, 0, 7, barbBase.x, barbBase.y))}`,
                `L ${formatPoint(barbBase)}`,
                `L ${formatPoint(pointOnCircle(angle + 50, 0, 7, barbBase.x, barbBase.y))}`,
            ].join(" ");
        }),
    ].join(" ");
    const LIGHTNING_PATH = "M -13 4.5 L -5.5 4.5 L -9.5 12.5 L -5 12.5 L -18 27 L -13.5 16 L -17.5 16 Z";
</script>

<script lang="ts">
    import { onMount } from "svelte";
    import { describeWeather } from "../services/weather.service";
    import { background } from "../stores/background";
    import { currentWeather, weatherLocation } from "../stores/weather";
    import { isLocalPreview } from "../utils/environment";

    const idPrefix = `large-clock-${nextInstanceId++}`;
    const id = (name: string): string => `${idPrefix}-${name}`;
    const url = (name: string): string => `url(#${id(name)})`;
    const usePreviewLocation = isLocalPreview();

    let now = new Date();

    onMount(() => {
        let timer = 0;
        const tick = (): void => {
            now = new Date();
            timer = window.setTimeout(tick, 1010 - (Date.now() % 1000));
        };
        const resync = (): void => {
            if (!document.hidden) {
                window.clearTimeout(timer);
                tick();
            }
        };

        tick();
        document.addEventListener("visibilitychange", resync);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", resync);
        };
    });

    $: swatches = resolveSwatches($background.textPalette?.swatches);

    $: secondAngle = now.getSeconds() * 6;
    $: minuteAngle = now.getMinutes() * 6 + Math.floor(now.getSeconds() / 10);
    $: hourAngle = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;

    $: calendarKey = now.getFullYear() * 10000 + now.getMonth() * 100 + now.getDate();
    $: calendar = getCalendarDial(calendarKey);

    $: observer = ($weatherLocation ??
        (usePreviewLocation ? PREVIEW_LOCATION : null)) as Coordinates | null;
    $: minuteKey = Math.floor(now.getTime() / MINUTE_MS);
    $: minuteDate = new Date(minuteKey * MINUTE_MS);
    $: sun = getSunState(minuteDate, observer);
    $: moon = getMoonState(minuteDate, observer);
    $: sunRadians = toRadians(sun.angle - 180);
    $: sunX = Math.round(Math.cos(sunRadians) * 250);
    $: sunY = Math.round(Math.sin(sunRadians) * 250);
    $: sunCoreGreen = 240 - Math.round(190 * Math.abs(sunX / 250));
    $: moonTransform = `rotate(${formatNumber(moon.angle)}) translate(-180 0) rotate(${formatNumber(
        -moon.angle
    )}) rotate(${formatNumber(moon.rotation)})`;
    $: miniClocks = [
        getMiniClock("rotate(19) translate(-250 0) rotate(-19)", "Sunrise", sun.sunrise, minuteDate, Boolean(observer)),
        getMiniClock("rotate(19) translate(-175 0) rotate(-19)", "Moonrise", moon.rise, minuteDate, Boolean(observer)),
        getMiniClock("rotate(-19) translate(250 0) rotate(19)", "Sunset", sun.sunset, minuteDate, Boolean(observer)),
        getMiniClock("rotate(-19) translate(175 0) rotate(19)", "Moonset", moon.set, minuteDate, Boolean(observer)),
    ];

    $: weather = $currentWeather;
    $: temperatureAngle = weather ? getTemperatureAngle(weather.temperature) : 0;
    $: minTemperatureAngle = weather ? getTemperatureAngle(weather.minimumTemperature || 0) : 0;
    $: maxTemperatureAngle = weather ? getTemperatureAngle(weather.maximumTemperature || 0) : 0;
    $: temperatureNeedleOuter = pointOnCircle(temperatureAngle, 270, 270);
    $: temperatureNeedleInner = pointOnCircle(temperatureAngle, 270, 150);
    $: temperatureRangePath = weather
        ? getTemperatureRangePath(weather.minimumTemperature, weather.maximumTemperature)
        : "";
    $: humidity = weather?.humidity ?? null;
    $: pressure = weather?.pressure ?? null;
    $: wind = weather ? getWindArrow(weather.windSpeed, weather.windDirection) : null;
    $: weatherIcon = weather ? getWeatherIcon(weather.weatherCode) : null;
    $: weatherTitle = weather
        ? describeWeather(weather.weatherCode)
        : "Choose a weather location in Settings to show the current conditions";
    $: isDaytime = observer
        ? sun.angle !== HIDDEN_ANGLE
        : now.getHours() >= 6 && now.getHours() < 18;
</script>

<div
    class="large-clock"
    style:--clock-vibrant={swatches.vibrant}
    style:--clock-muted={swatches.muted}
    style:--clock-dark-vibrant={swatches.darkVibrant}
    style:--clock-dark-muted={swatches.darkMuted}
    style:--clock-light-vibrant={swatches.lightVibrant}
    style:--clock-light-muted={swatches.lightMuted}
>
    <svg
        viewBox="-500 -500 1000 1000"
        role="img"
        aria-label="Clock with calendar, weather, sun, and moon dials"
    >
        <defs>
            <filter id={id("dropshadow")} width="130%" height="130%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="1" dy="1" result="offsetblur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>

            <marker
                id={id("arrow")}
                class="wind-marker"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
            >
                <path d="M 0 1 A 20 20 0 0 0 10 5 A 20 20 0 0 0 0 9 L 3 5 z" />
            </marker>

            <radialGradient id={id("sun-fill")}>
                <stop offset="27%" stop-color="rgb(242, {sunCoreGreen}, 10)" />
                <stop offset="93%" stop-color="rgb(252, 224, 56)" />
                <stop offset="100%" stop-color="rgb(241, 239, 104)" />
            </radialGradient>

            <radialGradient id={id("moon-fill")}>
                <stop offset="27%" stop-color="rgb(220, 220, 220)" />
                <stop offset="93%" stop-color="rgb(250, 250, 250)" />
                <stop offset="100%" stop-color="rgb(255, 255, 255)" />
            </radialGradient>

            <filter id={id("sun-glow")} x="-75%" y="-75%" width="300%" height="300%">
                <feMorphology operator="dilate" radius="4" in="SourceAlpha" result="thicken" />
                <feGaussianBlur in="thicken" stdDeviation="10" result="blurred" />
                <feFlood flood-color="rgb(241, 239, 104)" result="glow-colour" />
                <feComposite in="glow-colour" in2="blurred" operator="in" result="soft-glow" />
                <feMerge>
                    <feMergeNode in="soft-glow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>

            <filter id={id("moon-glow")} x="-75%" y="-75%" width="300%" height="300%">
                <feMorphology operator="dilate" radius="4" in="SourceAlpha" result="thicken" />
                <feGaussianBlur in="thicken" stdDeviation="10" result="blurred" />
                <feFlood flood-color="rgb(255, 255, 255)" result="glow-colour" />
                <feComposite in="glow-colour" in2="blurred" operator="in" result="soft-glow" />
                <feMerge>
                    <feMergeNode in="soft-glow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>

            <clipPath id={id("sun-mask")}>
                <path
                    d="M -300 0 L -275 0 A 50 50 0 0 1 -175 0 L 175 0 A 50 50 0 0 1 275 0 L 300 0 A 300 300 0 0 0 -300 0 z"
                />
            </clipPath>
            <clipPath id={id("luna-mask")}>
                <circle r="150" />
            </clipPath>
            <clipPath id={id("moon-mask")}>
                <circle r="18" />
            </clipPath>

            <path id={id("months-path")} d="M 460 0 A 460 460 0 0 1 -460 0 A 460 460 0 0 1 460 0" fill="none" />
            <path id={id("humidity-path")} d="M 0 150 A 150 150 0 0 0 150 0" fill="none" />
            <path id={id("pressure-path")} d="M 0 300 A 300 300 0 0 0 300 0" fill="none" />
            <path id={id("week-path")} d="M -275 0 A 50 50 0 0 1 -175 0 A 50 50 0 0 1 -275 0" fill="none" />
            <path
                id={id("day-of-year-path")}
                d="M 275 0 A 50 50 0 0 0 175 0 A 50 50 0 0 0 275 0"
                fill="none"
            />

            <mask
                id={id("days-of-week-mask")}
                maskUnits="userSpaceOnUse"
                x="-500"
                y="-500"
                width="1000"
                height="1000"
            >
                <path d={DAYS_OF_WEEK_REGION} fill="white" />
            </mask>
            <mask
                id={id("days-of-month-mask")}
                maskUnits="userSpaceOnUse"
                x="-500"
                y="-500"
                width="1000"
                height="1000"
            >
                <path d={DAYS_OF_MONTH_REGION} fill="white" />
            </mask>

            <g id={id("cloud")}>
                <rect x="-29" y="-1.5" width="58" height="20" rx="10" />
                <circle cx="-4" cy="-5.5" r="12.5" />
                <circle cx="14.5" cy="2" r="10" />
            </g>
        </defs>

        <path
            class="sun-background"
            d="M -300 0 A 300 300 0 0 1 300 0 L 275 0 A 50 50 0 0 0 175 0 L 150 0 A 150 150 0 0 0 -150 0 L -175 0 A 50 50 0 0 0 -275 0 z"
        />
        <path id={id("sun-track")} class="track" d="M -247 -47 A 250 250 0 0 1 247 -47" />
        <path id={id("luna-track")} class="track" d="M -179 -10 A 180 180 0 0 1 179 -10" />
        <path id={id("wind-track")} style="fill: none;" d="M -75 0 A 75 75 0 0 1 75 0" />

        <circle
            cx={sunX}
            cy={sunY}
            r="30"
            clip-path={url("sun-mask")}
            filter={url("sun-glow")}
            fill={url("sun-fill")}
        />

        <g clip-path={url("sun-mask")}>
            <g transform={moonTransform} filter={url("moon-glow")}>
                <title>{moon.description}</title>
                <circle r="18" clip-path={url("moon-mask")} fill={url("moon-fill")} />
                <path class="moon-shadow" d={moon.moonShadowPath} clip-path={url("moon-mask")} />
            </g>
        </g>

        <g class="numerals">
            {#each NUMERAL_PATHS as glyph}
                <path d={glyph.d} transform={glyph.transform} />
            {/each}
        </g>

        <g>
            <path class="year-progress" d={calendar.yearProgressPath} />
            <circle class="year-base" r="472" />
            {#each MONTH_NAMES as monthName, index}
                <text class="month-name" transform="rotate({calendar.monthRotations[index]})">
                    <textPath href="#{id('months-path')}">{monthName}</textPath>
                </text>
            {/each}
        </g>

        <circle class="dial" r="450" stroke-width="6" fill="none" />

        <g>
            <path class="temperature-quadrant" d={DAYS_OF_WEEK_REGION} />
            {#each TEMPERATURE_TICKS as [x1, y1, x2, y2]}
                <line class="temperature-tick" {x1} {y1} {x2} {y2} />
            {/each}
            {#if temperatureRangePath}
                <path
                    class="temperature-range"
                    mask={url("days-of-week-mask")}
                    d={temperatureRangePath}
                >
                    <title>Temperature</title>
                </path>
            {/if}
            {#if weather}
                <line
                    class="temperature-needle"
                    mask={url("days-of-week-mask")}
                    x1={formatNumber(temperatureNeedleOuter.x)}
                    y1={formatNumber(temperatureNeedleOuter.y)}
                    x2={formatNumber(temperatureNeedleInner.x)}
                    y2={formatNumber(temperatureNeedleInner.y)}
                />
                <text
                    class="temperature-label"
                    transform="rotate({formatNumber(temperatureAngle + 271)}) translate(-290 -10) rotate(90)"
                >
                    {Math.round(weather.temperature)}° C
                </text>
                <text
                    class="temperature-min-label"
                    transform="rotate({formatNumber(minTemperatureAngle + 265)}) translate(-290 -10) rotate(90)"
                >
                    {weather.minimumTemperature}° C
                </text>
                <text
                    class="temperature-max-label"
                    transform="rotate({formatNumber(maxTemperatureAngle + 281)}) translate(-290 -10) rotate(90)"
                >
                    {weather.maximumTemperature}° C
                </text>
            {/if}
        </g>

        <g>
            <path
                class="humidity-region"
                d="M 0 150 L 0 175 A 50 50 0 0 1 50 220 A 225 225 0 0 0 220 50 A 50 50 0 0 1 175 0 L 150 0 A 150 150 0 0 1 0 150 z"
            >
                <title>Humidity {Math.round(humidity || 0)}%</title>
            </path>
            {#each HUMIDITY_MAJOR_TICKS as [x1, y1, x2, y2]}
                <line class="tick-major" {x1} {y1} {x2} {y2} />
            {/each}
            {#each HUMIDITY_MINOR_TICKS as [x1, y1, x2, y2]}
                <line class="tick-minor" {x1} {y1} {x2} {y2} />
            {/each}
            {#if humidity !== null}
                <path
                    class="gauge-pointer"
                    mask={url("days-of-month-mask")}
                    d={getHumidityPointerPath(humidity)}
                />
                <text class="humidity-label">
                    <textPath href="#{id('humidity-path')}">
                        <tspan dx="{Math.round(((humidity - MIN_HUMIDITY) / (MAX_HUMIDITY - MIN_HUMIDITY) * 150) - 10)}" dy="20">{Math.round(humidity)}%</tspan>
                    </textPath>
                </text>
            {/if}
        </g>

        <g>
            <path
                class="pressure-region"
                d="M 0 275 L 0 300 A 300 300 0 0 0 300 0 L 275 0 A 50 50 0 0 1 220 50 A 225 225 0 0 1 50 220 A 50 50 0 0 1 0 275 z"
            >
                <title>Air Pressure {Math.round(pressure || 0)} hPa</title>
            </path>
            {#each PRESSURE_MINOR_TICKS as [x1, y1, x2, y2]}
                <line class="tick-minor" {x1} {y1} {x2} {y2} />
            {/each}
            {#each PRESSURE_MAJOR_TICKS as [x1, y1, x2, y2]}
                <line class="tick-major" {x1} {y1} {x2} {y2} />
            {/each}
            {#if pressure !== null}
                <path
                    class="gauge-pointer"
                    mask={url("days-of-month-mask")}
                    d={getPressurePointerPath(pressure)}
                />
                <text class="pressure-label">
                    <textPath href="#{id('pressure-path')}">
                        <tspan dx="{Math.round(((pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE) * 300) - 2)}" dy="-5">{Math.round(pressure)} hPa</tspan>
                    </textPath>
                </text>
            {/if}
        </g>

        <path
            class="luna-shadow"
            d={moon.lunaShadowPath}
            transform="rotate({formatNumber(moon.rotation)})"
            clip-path={url("luna-mask")}
        />

        <g class="luna-surface inner-dial">
            <circle class="dial" r="150" stroke-width="6" />
            <title>{moon.description}</title>
            <text class="wind-label">
                <textpath href="#{id('wind-track')}">
                    <tspan dy="-10" dx="30">{wind?.title} m/s</tspan>
                </textpath>
            </text>
        </g>
        <circle class="dial" r="300" stroke-width="6" fill="none" />
        {#each DIAL_JUNCTIONS as [x1, y1, x2, y2]}
            <line class="dial" {x1} {y1} {x2} {y2} stroke-width="6" />
        {/each}

        {#each RADAR_RADII as radius}
            <circle class="radar" r={radius} />
        {/each}
        <text class="compass-label" x="-10" y="-110">N</text>
        <text class="compass-label" x="-10" y="140">S</text>
        <text class="compass-label" x="-140" y="10">W</text>
        <text class="compass-label" x="110" y="10">E</text>

        {#if wind}
            <line class="wind-arrow" marker-end={url("arrow")} x1="0" y1="0" x2={wind.x} y2={wind.y}>
                <title>{wind.title}</title>
            </line>
        {/if}

        {#each miniClocks as miniClock}
            <g transform={miniClock.transform}>
                <title>{miniClock.title}</title>
                <circle class="mini-clock-face" r="15" />
                <circle class="mini-clock-ring" r="15" />
                {#if miniClock.hourAngle !== null && miniClock.minuteAngle !== null}
                    <line class="mini-clock-hand" y2="-12" transform="rotate({miniClock.minuteAngle})" />
                    <line class="mini-clock-hand" y2="-8" transform="rotate({miniClock.hourAngle})" />
                {/if}
                <circle class="mini-clock-dot" r="3" />
            </g>
        {/each}

        <g>
            <path class="month-progress" d={calendar.monthProgressPath}>
                <title>Day {calendar.monthProgressPath} of the month</title>
            </path>
            <text class="month-day" x="225" y="12" text-anchor="middle">{calendar.dayOfMonth}</text>
            <circle class="dial gauge" cx="-225" r="50" stroke-width="4" />
            <text class="day-of-year" text-anchor="middle">
                <textPath href="#{id('day-of-year-path')}" startOffset="75%">
                    <tspan dy="-6">{calendar.dayOfYear}</tspan>
                </textPath>
                <title>Day {calendar.dayOfYear} of the year</title>
            </text>
        </g>

        <g>
            <title>{weatherTitle}</title>
            <circle class="dial gauge" cy="225" r="50" stroke-width="4" />
            {#if weatherIcon}
                <g transform="translate(0 225)">
                    {#if weatherIcon === "clear"}
                        <circle class={isDaytime ? "icon-sun" : "icon-night"} r="24.5" />
                    {:else if weatherIcon === "few-clouds"}
                        <circle class={isDaytime ? "icon-sun" : "icon-night"} cx="17" cy="-5.5" r="15.5" />
                        <use class="icon-cloud" href="#{id('cloud')}" transform="translate(-3 3)" />
                    {:else if weatherIcon === "scattered-clouds"}
                        <use class="icon-cloud" href="#{id('cloud')}" />
                    {:else if weatherIcon === "broken-clouds"}
                        <use
                            class="icon-cloud-dark"
                            href="#{id('cloud')}"
                            transform="translate(11.8 -6.85) scale(0.765)"
                        />
                        <use class="icon-cloud" href="#{id('cloud')}" transform="translate(-5 3)" />
                    {:else if weatherIcon === "mist"}
                        {#each MIST_LINES as line}
                            <line class="icon-line" x1={line.x1} y1={line.y} x2={line.x2} y2={line.y} />
                        {/each}
                    {:else if weatherIcon === "snow"}
                        <path class="icon-line icon-snowflake" d={SNOWFLAKE_PATH} />
                    {:else if weatherIcon === "thunderstorm"}
                        <use
                            class="icon-cloud-dark"
                            href="#{id('cloud')}"
                            transform="translate(10.5 -12.8) scale(0.727)"
                        />
                        <use class="icon-cloud" href="#{id('cloud')}" transform="translate(-5.45 -3.4) scale(0.95)" />
                        <path class="icon-sun" d={LIGHTNING_PATH} />
                    {:else}
                        {#if weatherIcon === "rain"}
                            <circle class={isDaytime ? "icon-sun" : "icon-night"} cx="13.2" cy="-12" r="12.4" />
                            <use class="icon-cloud" href="#{id('cloud')}" transform="translate(-2.8 -5.2) scale(0.8)" />
                        {:else}
                            <use
                                class="icon-cloud-dark"
                                href="#{id('cloud')}"
                                transform="translate(8.2 -13.2) scale(0.604)"
                            />
                            <use class="icon-cloud" href="#{id('cloud')}" transform="translate(-5.1 -5.4) scale(0.79)" />
                        {/if}
                        <g transform={weatherIcon === "rain" ? "translate(2.5 0)" : undefined}>
                            {#each RAIN_DROPS as drop}
                                <line
                                    class="icon-line icon-drop"
                                    x1={drop.x + 0.6}
                                    y1={drop.y - 1}
                                    x2={drop.x - 0.6}
                                    y2={drop.y + 1}
                                />
                            {/each}
                        </g>
                    {/if}
                </g>
            {/if}
        </g>

        <g>
            <circle class="dial gauge" cx="225" r="50" stroke-width="4" />
            {#each WEEKDAYS as weekday}
                <text class="weekday" class:weekend={weekday.weekend}>
                    <textPath href="#{id('week-path')}" startOffset={weekday.offset}>
                        <tspan dy="18">{weekday.letter}</tspan>
                    </textPath>
                </text>
            {/each}
            <circle class="week-number-badge" cx="-225" cy="30" r="13" >
                <title>Week {calendar.weekNumber} of the year</title>
            </circle>
            <text class="week-number" x="-225" y="35" text-anchor="middle">{calendar.weekNumber}</text>
            <g filter={url("dropshadow")}>
                <circle class="week-pointer" cx="-225" r="10" />
                <path class="week-pointer" d={calendar.weekArrowPath} />
            </g>
        </g>

        <g transform="rotate({formatNumber(hourAngle)})" filter={url("dropshadow")}>
            <path
                class="hour-hand"
                d="M -3 0 A 20 200 0 0 1 -5 -200 A 3 99 0 0 0 -5 -250 L 5 -250 A 3 99 0 0 0 5 -200 A 20 200 0 0 1 5 0 z"
            />
            <path
                class="hour-hand"
                d="M -12 -255 A 22 22 0 1 0 12 -255 A 13 50 0 0 1 3 -300 L -3 -300 A 13 50 0 0 1 -12 -255 z"
            />
            <circle class="hour-hub" r="22" />
        </g>

        <g transform="rotate({minuteAngle})" filter={url("dropshadow")}>
            <path
                class="minute-hand"
                d="M -3 0 A 20 300 0 0 1 -5 -300 A 3 99 0 0 0 -5 -399 L 5 -399 A 3 99 0 0 0 5 -300 A 20 300 0 0 1 5 0 z"
            />
            <path
                class="minute-hand"
                d="M -12 -399 A 20 20 0 1 0 12 -399 A 13 50 0 0 1 2 -450 L -2 -450 A 13 50 0 0 1 -12 -399 z"
            />
            <circle class="minute-hub" r="18" />
        </g>

        <g transform="rotate({secondAngle})" filter={url("dropshadow")}>
            <path
                class="second-hand"
                d="M -12 -399 A 15 15 0 1 0 12 -399 A 15 50 0 0 1 0 -450 A 15 50 0 0 1 -12 -399 z"
                fill="none"
                stroke-width="4"
            />
            <line class="second-hand" y1="78" y2="-375" stroke-width="4" stroke-linecap="round" />
            <path class="second-hand-base" d="M 14 110 A 20 20 0 1 0 -14 110 A 16 14 0 1 1 14 110" />
            <circle class="second-hub" r="10" />
        </g>

        <circle class="dial" r="495" fill="none" stroke-width="10" />
    </svg>
</div>

<style>
    .large-clock {
        box-sizing: border-box;
        width: min(80vmin, 100cqw, 100cqh);
        aspect-ratio: 1;
        border-radius: 50%;
        background-color: rgba(var(--clock-muted), 0.2);
        box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        font-family: "Segoe UI", Tahoma, sans-serif;
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
    }

    .dial {
        stroke: rgb(var(--clock-muted));
    }

    .gauge {
        fill: rgba(255, 255, 255, 0.1);
    }

    .track {
        fill: none;
        stroke: rgba(0, 0, 0, 0.1);
        stroke-width: 1px;
    }

    .sun-background {
        fill: rgba(var(--clock-vibrant), 0.2);
    }

    .moon-shadow {
        fill: rgba(0, 0, 0, 0.2);
    }

    .numerals {
        fill: rgba(var(--clock-light-muted), 0.8);
    }

    .year-progress {
        fill: none;
        stroke: rgba(var(--clock-dark-vibrant), 0.8);
        stroke-width: 45;
    }

    .year-base {
        fill: none;
        stroke: rgba(var(--clock-dark-vibrant), 0.4);
        stroke-width: 45;
    }

    .month-name {
        fill: rgba(var(--clock-light-vibrant), 0.8);
        font-family: Consolas, Menlo, "DejaVu Sans Mono", "Liberation Mono", monospace;
        font-size: 39px;
        font-variant: small-caps;
    }

    .temperature-quadrant {
        fill: rgba(var(--clock-dark-vibrant), 0.4);
    }

    .temperature-tick {
        stroke: rgba(0, 0, 0, 0.1);
        stroke-width: 1px;
    }

    .temperature-range {
        fill: rgba(var(--clock-light-vibrant), 0.4);
    }

    .temperature-needle {
        stroke: rgb(var(--clock-dark-vibrant));
        stroke-width: 2px;
    }

    .temperature-label {
        fill: rgba(var(--clock-dark-muted), 0.8);
        font-size: 18px;
    }

    .temperature-min-label {
        fill: rgba(var(--clock-light-vibrant), 0.9);
        font-size: 18px;
    }

    .temperature-max-label {
        fill: rgba(var(--clock-light-vibrant), 0.9);
        font-size: 18px;
    }

    .humidity-region {
        fill: rgba(var(--clock-light-muted), 0.6);
    }

    .pressure-region {
        fill: rgba(var(--clock-dark-muted), 0.6);
    }

    .tick-major {
        stroke: rgba(0, 0, 0, 0.2);
        stroke-width: 2px;
    }

    .tick-minor {
        stroke: rgba(0, 0, 0, 0.1);
        stroke-width: 2px;
    }

    .gauge-pointer {
        fill: rgb(var(--clock-vibrant));
        stroke: none;
    }

    .humidity-label {
        fill: rgb(var(--clock-dark-vibrant));
        font-size: 18px;
    }

    .pressure-label {
        fill: rgb(var(--clock-light-vibrant));
        font-size: 18px;
    }

    .wind-label {
        fill: rgb(var(--clock-light-vibrant));
        font-size: 11px;
    }

    .luna-shadow {
        fill: rgba(0, 0, 0, 0.3);
    }

    .inner-dial {
        fill: rgba(var(--clock-light-vibrant), 0.2);
    }

    .radar {
        fill: none;
        stroke: rgba(0, 0, 0, 0.2);
        stroke-width: 1px;
    }

    .compass-label {
        fill: rgb(var(--clock-vibrant));
        font-family: Arial, Helvetica, sans-serif;
        font-size: 36px;
        font-weight: bold;
    }

    .wind-arrow {
        stroke: rgb(var(--clock-dark-vibrant));
        stroke-width: 4;
    }

    .wind-marker {
        fill: rgb(var(--clock-dark-vibrant));
    }

    .mini-clock-face {
        fill: rgba(var(--clock-dark-muted), 0.9);
        stroke: none;
    }

    .mini-clock-ring {
        fill: none;
        stroke: rgb(var(--clock-muted));
        stroke-width: 3px;
    }

    .mini-clock-hand {
        stroke: rgb(var(--clock-vibrant));
        stroke-width: 3px;
    }

    .mini-clock-dot {
        fill: rgb(var(--clock-vibrant));
        stroke: none;
    }

    .month-progress {
        fill: rgba(var(--clock-dark-vibrant), 0.8);
        stroke: none;
    }

    .month-day {
        fill: rgba(var(--clock-vibrant), 0.8);
        font-size: 36px;
    }

    .day-of-year {
        fill: rgba(var(--clock-vibrant), 0.8);
        font-size: 18px;
        letter-spacing: 5px;
    }

    .weekday {
        fill: rgba(var(--clock-dark-muted), 0.5);
        font-size: 14.4px;
        font-weight: bold;
    }

    .weekday.weekend {
        fill: rgba(var(--clock-dark-vibrant), 0.5);
    }

    .week-number-badge {
        fill: rgba(var(--clock-dark-vibrant), 0.5);
    }

    .week-number {
        fill: rgba(var(--clock-light-muted), 0.8);
        font-size: 14.4px;
        font-weight: bold;
    }

    .week-pointer {
        fill: rgb(var(--clock-vibrant));
        stroke: none;
    }

    .hour-hand {
        fill: rgb(var(--clock-muted));
        stroke: none;
    }

    .hour-hub {
        fill: rgb(var(--clock-light-muted));
    }

    .minute-hand {
        fill: rgb(var(--clock-light-muted));
        stroke: none;
    }

    .minute-hub {
        fill: rgb(var(--clock-muted));
    }

    .second-hand {
        stroke: rgb(var(--clock-vibrant));
    }

    .second-hand-base,
    .second-hub {
        fill: rgb(var(--clock-vibrant));
        stroke: none;
    }

    .icon-sun {
        fill: rgb(235, 110, 76);
    }

    .icon-night,
    .icon-cloud-dark {
        fill: rgb(72, 73, 75);
    }

    .icon-cloud {
        fill: rgb(242, 242, 241);
    }

    .icon-line {
        fill: none;
        stroke: rgb(72, 73, 75);
        stroke-width: 2.6px;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .icon-snowflake {
        stroke-width: 3.6px;
    }

    .icon-drop {
        stroke-width: 3px;
    }
</style>
