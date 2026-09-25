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
        min-width: 0;
        color: #f5f7fa;
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0 0 0.75rem;
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
        padding-top: 0.75rem;
    }
</style>
