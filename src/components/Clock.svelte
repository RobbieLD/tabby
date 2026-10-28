<script lang="ts">
    import { time, date } from "../stores/calendar";
</script>

<div class="clock">
    <div class="time">{$time}</div>
    <div class="date">
        <div>{$date.weekday} {$date.day}<sup>{$date.ordinal}</sup></div>
        <div>{$date.month} {$date.year}</div>
    </div>
</div>

<style>
    .clock {
        --clock-time-height: 1.5rem;
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        gap: 0.45rem;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        text-align: right;
    }

    .time {
        height: var(--clock-time-height);
        font-size: var(--clock-time-height);
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
    }

    .date {
        display: grid;
        align-content: center;
        width: max-content;
        height: var(--clock-time-height);
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.82);
        font-size: 0.7rem;
        font-variant: small-caps;
        line-height: 1;
        text-align: center;
        white-space: nowrap;
    }

    .date sup {
        font-size: 0.65em;
        line-height: 0;
        vertical-align: super;
    }

    @media (max-width: 520px) {
        .clock {
            justify-self: start;
            text-align: left;
        }
    }
</style>
