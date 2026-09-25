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
    }

    .panel-rail--left {
        grid-area: sidebar;
        width: max-content;
        max-width: calc(100vw - 25rem);
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
</style>
