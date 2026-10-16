<script lang="ts">
    export let side: "left" | "right";
</script>

<aside
    class="panel-rail"
    class:panel-rail--left={side === "left"}
    class:panel-rail--right={side === "right"}
    aria-label="Optional panels"
>
    <slot />
</aside>

<style>
    .panel-rail {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
        margin: 2em;
        padding: 1rem;
        color: white;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(16px);
        overflow-x: hidden;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(198, 237, 249, 0.48) rgba(0, 0, 0, 0.12);
    }

    .panel-rail:hover {
        scrollbar-color: rgba(198, 237, 249, 0.72) rgba(0, 0, 0, 0.18);
    }

    .panel-rail::-webkit-scrollbar {
        width: 0.7rem;
    }

    .panel-rail::-webkit-scrollbar-track {
        border-radius: 0.5rem;
        background: rgba(0, 0, 0, 0.12);
    }

    .panel-rail::-webkit-scrollbar-thumb {
        border: 0.2rem solid transparent;
        border-radius: 0.5rem;
        background-color: rgba(198, 237, 249, 0.48);
        background-clip: padding-box;
    }

    .panel-rail::-webkit-scrollbar-thumb:hover {
        background-color: rgba(198, 237, 249, 0.72);
    }

    .panel-rail::-webkit-scrollbar-thumb:active {
        background-color: rgba(198, 237, 249, 0.9);
    }

    .panel-rail--left {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-content: start;
        column-gap: 2rem;
        row-gap: 1.5rem;
        grid-area: sidebar;
        width: max-content;
        max-width: calc(100vw - 25rem);
        padding: 0;
        background: transparent;
        backdrop-filter: none;
    }

    .panel-rail--right {
        grid-area: right-panels;
    }

    @media (max-width: 820px) {
        .panel-rail {
            overflow: visible;
        }

        .panel-rail--left {
            width: auto;
            max-width: none;
        }
    }

    @media (max-width: 600px) {
        .panel-rail--left {
            grid-template-columns: minmax(0, 1fr);
        }
    }

    @media (forced-colors: active) {
        .panel-rail {
            scrollbar-color: auto;
        }
    }
</style>
