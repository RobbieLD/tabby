<script lang="ts">
    import SportsWidget from "./SportsWidget.svelte";
    import { sportsSettings } from "../stores/sports";
</script>

{#if $sportsSettings.football || $sportsSettings.cricket}
    <div class="sports-widgets" role="group" aria-label="Sports widgets">
        {#if $sportsSettings.football}
            {#key $sportsSettings.football.id}
                <SportsWidget team={$sportsSettings.football} />
            {/key}
        {/if}
        {#if $sportsSettings.cricket}
            {#key $sportsSettings.cricket.id}
                <SportsWidget team={$sportsSettings.cricket} />
            {/key}
        {/if}
    </div>
{/if}

<style>
    .sports-widgets {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
    }

    @media (max-width: 820px) {
        .sports-widgets {
            flex-wrap: nowrap;
            justify-content: flex-start;
        }
    }
</style>
