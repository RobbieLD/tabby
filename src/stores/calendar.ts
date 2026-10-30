import { readable, derived } from 'svelte/store';
import { convertOrdinal, convertDay, convertMonth } from '../utils/converters';

const MINUTE_MS = 60 * 1000;

// Ticks on each minute boundary and re-syncs when the tab becomes visible after throttling.
export const now = readable(new Date(), (set) => {
    let timer = 0;
    const tick = () => {
        const current = new Date();
        set(current);
        window.clearTimeout(timer);
        timer = window.setTimeout(
            tick,
            MINUTE_MS - (current.getSeconds() * 1000 + current.getMilliseconds())
        );
    };
    const onVisibilityChange = () => {
        if (!document.hidden) {
            tick();
        }
    };

    tick();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
        window.clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
});

export const time = derived(
    now,
    $time => $time.getHours().toString().padStart(2, '0') + ":" + $time.getMinutes().toString().padStart(2, '0')
);

export const date = derived(
    now,
    $time => ({
        weekday: convertDay($time.getDay()),
        day: $time.getDate(),
        ordinal: convertOrdinal($time.getDate()),
        month: convertMonth($time.getMonth()),
        year: $time.getFullYear(),
    })
);
