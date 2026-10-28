<script lang="ts">
    export let title: string;
</script>

<section class="panel">
    <header class="panel-header">
        <div class="panel-heading">
            <h2>{title}</h2>
            <slot name="heading-details" />
        </div>
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
        min-width: 0;
        color: rgb(var(--theme-text-primary-rgb, 245, 247, 250));
    }

    .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        padding: 0.7rem 1rem;
        border-radius: 0;
        background: rgba(0, 0, 0, 0.55);
    }

    .panel-heading {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        min-width: 0;
    }

    h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 650;
    }

    .panel-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .panel-body {
        min-width: 0;
        padding: 0 1rem 1rem;
    }
</style>
