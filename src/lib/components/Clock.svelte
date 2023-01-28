<script lang="ts">
    import { time, date } from '$lib/stores/calendar'
</script>

<div class="clock">
    <div class="time">{$time}</div>
    <div class="date">{@html $date}</div>
</div>

<style>
.clock {
    grid-area: clock;
    margin-right: 1em;
    color: white;
    display: grid;
    justify-self: right;
    grid-template-rows: min-content;
    align-content: end;
}

.time {
    font-size: 6em;
    font-weight: bold;
    margin-bottom: -0.2em;
    margin-top: -0.2em;
}

.date {
    font-variant: small-caps;
    text-align: justify;
}

.date:after {
    content: "";
    width: 100%;
    display: inline-block;
}

</style>
