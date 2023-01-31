<script lang="ts">
    import { background } from "../stores/background";
    import { icons } from "../stores/icons";

    const saveIcon = () => icons.add(newIconTitle, newIconUrl, files);
    const removeIcon = () => icons.remove(removeIconTitle);

    let showSettingsPanel = false;
    let removeIconTitle = "";
    let newIconTitle = "";
    let newIconUrl = "";
    let files;
</script>

<div class="info">
    <div class="image-credit">{$background.description}</div>
    <img
        src="images/settings.png"
        class="settings-icon"
        alt="settings"
        on:click={() => (showSettingsPanel = true)}
        on:keypress={() => (showSettingsPanel = true)}
    />
</div>

<div
    class="{!showSettingsPanel ? 'settings-modal--closed' : ''} settings-modal"
>
    <div class="settings-close">
        <span class="version">Version __VERSION__</span>
        <img
            src="images/close.png"
            class="settings-cancel"
            on:click={() => (showSettingsPanel = false)}
            on:keypress={() => (showSettingsPanel = false)}
            alt="close"
        />
    </div>
    <div class="settings-title">Add New Icon</div>
    <div>
        <input
            type="text"
            bind:value={newIconUrl}
            placeholder="URL"
        />
    </div>
    <div>
        <input
            type="text"
            bind:value={newIconTitle}
            placeholder="Title"
        />
    </div>
    <div>
        <input
            type="file"
            bind:files
            accept="image/png, image/jpeg"
            placeholder="Icon File"
        />
    </div>
    <div>
        <input
            type="button"
            on:click={saveIcon}
            value="Add"
        />
    </div>
    <div class="settings-divider"></div>
    <div class="settings-title">Remove Icon</div>
    <div>
        <select bind:value={removeIconTitle} class="settings-icons-selector">
            <option value="" disabled selected>Select Icon</option>
            {#each $icons as icon}
                <option>{icon.title}</option>
            {/each}
        </select>
    </div>
    <div>
        <input
            type="button"
            value="Remove"
            on:click={removeIcon}
        />
    </div>
    <div class="settings-divider"></div>
    <div class="settings-title">Refresh Background</div>
    <div>
        <input
            type="button"
            value="Refresh"
            on:click={background.refresh}
        />
    </div>
    <div class="settings-divider"></div>
    <div class="settings-title">Export Icons</div>
    <div>
        <input
            type="button"
            value="Export"
            on:click={icons.export}
        />
    </div>
    <div class="settings-divider"></div>
    <div class="settings-title">Import Import</div>
    <div>
        <input
            type="file"
            accept="application/json"
            placeholder="Config File"
            on:change={icons.import}
        />
    </div>
</div>

<style>

    .version {
        font-size: 0.7em;
    }

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
        background: #ffffff63;
        backdrop-filter: blur(20px);
        padding: 1em;
        transition: 0.5s ease-in-out;
        box-shadow: #00000021 -10px 0px 5px;
    }

    .settings-modal--closed {
        transform: translate(100%);
    }

    .settings-title {
        font-size: 1.2em;
        margin-bottom: 1em;
        margin-top: 1em;
    }

    .settings-divider {
        border-top: solid black 1px;
        margin-top: 1em;
    }

    .settings-cancel {
        width: 1em;
        cursor: pointer;
        justify-self: end;
    }

    .settings-close {
        display: grid;
        grid-auto-flow: column;
    }

    input, select {
        border: none;
        padding: 0.5em;
        background-color: #ffffff70;
        width: 100%;
        margin-bottom: 1em;
    }

    input:hover {
        background-color: white;
    }

    input[type="file"]::file-selector-button {
        display: none;
    }

    input:focus {
        outline: none !important;
    }
</style>
