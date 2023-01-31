<script lang="ts">
    import Clock from "./components/Clock.svelte";
    import Settings from "./components/Settings.svelte";
    import { background } from "./stores/background";
    import { icons } from "./stores/icons";

    // This is fine to be fire and forget because the page reactivity will
    // reflect the changes to the response once it's loaded
    background.init();
</script>

<div class="main" style="background-image:{$background.url}">
    <Clock />
    <div class="content">
        {#each $icons as icon}
            <a
                target="_blank"
                rel="noreferrer"
                href={icon.url}
                title={icon.title}
            >
                <img src={icon.icon} alt={icon.title} class="icon" />
            </a>
        {/each}
    </div>
    <Settings />
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: system-ui, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Helvetica Neue", Arial, sans-serif;
        background-size: cover;
    }

    .main {
        display: grid;
        grid-template-areas:
            "content content content"
            " . . clock"
            "info info info";

        grid-template-columns: auto 1fr auto;
        grid-template-rows: auto 1fr auto;

        height: 100vh;
        background-size: cover;
    }

    .icon {
        max-width: 2em;
        filter: grayscale(100%);
        cursor: pointer;
        transition: transform 0.2s;
    }

    .icon:hover {
        filter: none;
        transform: scale(2) translateY(0.5em);
    }

    .content {
        grid-area: content;
        align-self: center;
        display: grid;
        grid-auto-flow: column;
        gap: 1em;
        padding-left: 1em;
        padding-right: 1em;
        padding-top: 0.5em;
        backdrop-filter: blur(20px);
        grid-template-columns: repeat(auto-fill, minmax(2em, 1fr));
    }
</style>
