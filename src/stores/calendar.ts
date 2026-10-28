import { readable, derived } from 'svelte/store';
import { convertOrdinal, convertDay, convertMonth } from '../utils/converters';

export const now = readable(
    new Date(),
    // Start
    (set) => {
        const interval = setInterval(() => {
            set(new Date());
        }, 60000);
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
