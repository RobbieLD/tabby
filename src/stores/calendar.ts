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
    $time => convertDay($time.getDay()) + ' ' +
        $time.getDate() + '<span style="font-variant: super;">' +
        convertOrdinal($time.getDate()) + '</span> of ' +
        convertMonth($time.getMonth()) + ' ' + $time.getFullYear()
);
