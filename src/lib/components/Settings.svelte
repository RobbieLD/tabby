<script lang="ts">
    import settings from '$lib/images/settings.png';
    import close from '$lib/images/close.png';
    import { background } from '$lib/stores/background';
    import { icons } from '$lib/stores/icons';

    const saveIcon = () => icons.add(newIconTitle, newIconUrl, files);
    const removeIcon = () => icons.remove(removeIconTitle);

    // TODO: Use svelte motion to animate this
    let showSettingsPanel = false;
    let removeIconTitle = ''
    let newIconTitle = '';
    let newIconUrl = '';
    let files: FileList;
</script>

<div class="info">
    <div class="image-credit">{ $background.description }</div>
    <img src={settings} class="settings-icon" alt="settings" on:click={() => showSettingsPanel = true} on:keypress={() => showSettingsPanel = true}>
</div>

<div class="{showSettingsPanel ? 'settings-modal--open' : 'settings-modal--closed'} settings-modal" >
    <div class="settings-close">
        <img src={close} class="settings-cancel" on:click={() => showSettingsPanel = false} on:keypress={() => showSettingsPanel = false} alt="close" />
    </div>
    <div class="settings-title">
        Add New Icon
    </div>
    <div>
        <input type="text" bind:value={newIconUrl} placeholder="URL" class="settings-input">
    </div>
    <div>
        <input type="text" bind:value={newIconTitle} placeholder="Title" class="settings-input">
    </div>
    <div>
        <input type="file" bind:files accept="image/png, image/jpeg" placeholder="Icon File" class="settings-input">
    </div>
    <div class="settings-controls">
        <input type="button" on:click={saveIcon} value="Save" class="settings-button">
    </div>
    <div class="settings-title">
        Remove Icon
    </div>
    <div>
        <select bind:value={removeIconTitle} class="settings-icons-selector">
            {#each $icons as icon}
                <option>{icon.title}</option>
            {/each}
        </select>
    </div>
    <div class="settings-controls">
        <input type="button" value="Remove" on:click={removeIcon} class="settings-button">
    </div>
    <div class="settings-title">
        Refresh Background
    </div>
    <div class="settings-controls">
        <input type="button" value="Refresh" on:click={background.refresh} class="settings-button">
    </div>
</div>

<style>

.info {
    grid-area: info;
    color: white;
    padding: 0.5em;
    display: grid;
    grid-auto-flow: column;
    font-size: 0.7em;
    backdrop-filter: blur(20px);
}

.settings-icon {
    width: 1.5em;
    cursor: pointer;
    margin-right: 0.5em;
    justify-self: end;
}

.settings-modal {
    position: fixed;
    z-index: 1;
    overflow: auto;
    top: 0;
    right: 0;
    height: 100%;
    background: white;
    border-left: solid 2px black;
    padding: 1em;
    display: none;
}

.settings-modal--closed {
    display: none;
}

.settings-modal--open {
    display: initial;
}

.settings-title {
    font-size: 1.5em;
    margin-bottom: 1em;
    margin-top: 1em;
}

.settings-button {
    width: 5em;
    margin-left: 0.5em;
}

.settings-controls {
    justify-content: right;
    display: grid;
    grid-auto-flow: column;
}

.settings-input {
    width: 20em;
    margin-bottom: 1em;
}

.settings-cancel {
    width: 1em;
    cursor: pointer;
}

.settings-close {
    display: flex;
    justify-content: end;
}

</style>
