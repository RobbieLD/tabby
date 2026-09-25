<script lang="ts">
    export let title: string;
</script>

<section class="panel">
    <header class="panel-header">
        <h2>{title}</h2>
        <div class="panel-actions">
            <slot name="actions" />
        </div>
    </header>
    <div class="panel-body">
        <slot />
    </div>
</section>

<style>
    .panel {
        display: flex;
        flex-direction: column;
        min-height: 0;
        color: #1e2b32;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(255, 255, 255, 0.66);
        border-radius: 0.8rem;
        box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.16);
        backdrop-filter: blur(20px);
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid rgba(30, 43, 50, 0.12);
    }

    h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 650;
    }

    .panel-actions {
        display: flex;
        align-items: center;
    }

    .panel-body {
        min-height: 0;
        padding: 0.75rem 1rem 1rem;
    }
</style>
