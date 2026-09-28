<script lang="ts">
    function openSettings(): void {
        window.dispatchEvent(new Event("open-settings"));
    }
</script>

<section class="welcome-panel" aria-labelledby="welcome-title">
    <p class="eyebrow">WELCOME TO TABBY</p>
    <h1 id="welcome-title">Your new tab, your way.</h1>
    <p class="welcome-copy">
        Start by adding the websites you visit most. Shortcuts, backgrounds, weather,
        and optional work panels can all be configured in Settings.
    </p>
    <ol>
        <li>Open Settings below.</li>
        <li>Add a shortcut for your first website.</li>
        <li>Set a background or browser-location weather whenever you like.</li>
    </ol>
    <button class="welcome-action" type="button" on:click={openSettings}>
        Open settings
    </button>
</section>

<style>
    .welcome-panel {
        grid-area: welcome;
        align-self: center;
        justify-self: center;
        box-sizing: border-box;
        width: min(34rem, calc(100% - 4rem));
        padding: clamp(1.5rem, 4vw, 2.75rem);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 1rem;
        color: #f5f8fb;
        background: rgba(9, 18, 28, 0.58);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.18);
        backdrop-filter: blur(14px);
    }

    .eyebrow {
        margin: 0 0 0.65rem;
        color: #b7d9e8;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
    }

    h1 {
        margin: 0;
        font-size: clamp(1.6rem, 4vw, 2.25rem);
        line-height: 1.15;
    }

    .welcome-copy {
        margin: 0.85rem 0 0;
        color: rgba(245, 248, 251, 0.84);
        line-height: 1.55;
    }

    ol {
        display: grid;
        gap: 0.4rem;
        margin: 1rem 0 1.25rem;
        padding-left: 1.3rem;
        color: rgba(245, 248, 251, 0.9);
        line-height: 1.5;
    }

    .welcome-action {
        min-height: 2.6rem;
        padding: 0.55rem 0.95rem;
        border: 0;
        border-radius: 0.45rem;
        color: #10212c;
        background: #d8edf5;
        cursor: pointer;
        font: inherit;
        font-weight: 650;
    }

    .welcome-action:hover {
        background: white;
    }

    .welcome-action:focus-visible {
        outline: 2px solid white;
        outline-offset: 3px;
    }

    @media (max-width: 820px) {
        .welcome-panel {
            width: calc(100% - 2rem);
            margin: 1rem;
        }
    }
</style>
