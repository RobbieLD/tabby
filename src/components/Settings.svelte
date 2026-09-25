<script lang="ts">
    import { background } from "../stores/background";
    import { icons } from "../stores/icons";
    import { azureDevOpsSettings } from "../stores/azure-devops";
    import { weatherLocation } from "../stores/weather";
    import { normalizeOrganization } from "../services/azure-devops.service";
    import { findWeatherLocation } from "../services/weather.service";
    import { isLocalPreview } from "../utils/environment";
    import {
        removeAzureDevOpsAccess,
        removeWeatherAccess,
        removeUnsplashAccess,
        requestAzureDevOpsAccess,
        requestWeatherAccess,
        requestUnsplashAccess,
    } from "../services/extension-permissions";

    let showSettingsPanel = false;
    let settingsDialog: HTMLDialogElement;
    let removeIconTitle = "";
    let newIconTitle = "";
    let newIconUrl = "";
    let files: FileList | null = null;
    let unsplashKey = window.localStorage.getItem("unsplash") || "";
    let organization = $azureDevOpsSettings.organization;
    let personalAccessToken = $azureDevOpsSettings.pat;
    let showAssignedPanel = $azureDevOpsSettings.enabled;
    let weatherCity = $weatherLocation?.name || "";
    let shortcutMessage = "";
    let shortcutMessageIsError = false;
    let backgroundMessage = "";
    let backgroundMessageIsError = false;
    let adoMessage = "";
    let adoMessageIsError = false;
    let weatherMessage = "";
    let weatherMessageIsError = false;

    const messageFromError = (error: unknown): string =>
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

    function openSettings(): void {
        settingsDialog.showModal();
        showSettingsPanel = true;
    }

    function closeSettings(): void {
        settingsDialog.close();
        showSettingsPanel = false;
    }

    function onSettingsClose(): void {
        showSettingsPanel = false;
    }

    async function saveIcon(): Promise<void> {
        shortcutMessage = "";
        shortcutMessageIsError = false;

        try {
            await icons.add(newIconTitle, newIconUrl, files?.[0]);
            shortcutMessage = `${newIconTitle.trim()} was added to your shortcuts.`;
            newIconTitle = "";
            newIconUrl = "";
            files = null;
        } catch (error) {
            shortcutMessage = messageFromError(error);
            shortcutMessageIsError = true;
        }
    }

    function removeIcon(): void {
        if (!removeIconTitle) {
            return;
        }

        try {
            icons.remove(removeIconTitle);
            shortcutMessage = `${removeIconTitle} was removed from your shortcuts.`;
            shortcutMessageIsError = false;
            removeIconTitle = "";
        } catch (error) {
            shortcutMessage = messageFromError(error);
            shortcutMessageIsError = true;
        }
    }

    function exportIcons(): void {
        try {
            icons.export();
            shortcutMessage = "Your shortcuts were exported.";
            shortcutMessageIsError = false;
        } catch (error) {
            shortcutMessage = messageFromError(error);
            shortcutMessageIsError = true;
        }
    }

    async function importIcons(event: Event): Promise<void> {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        try {
            await icons.import(file);
            shortcutMessage = "Your shortcuts were imported.";
            shortcutMessageIsError = false;
            removeIconTitle = "";
        } catch (error) {
            shortcutMessage = messageFromError(error);
            shortcutMessageIsError = true;
        } finally {
            input.value = "";
        }
    }

    async function saveAzureDevOpsSettings(): Promise<void> {
        adoMessage = "";
        adoMessageIsError = false;

        try {
            const normalizedOrganization = normalizeOrganization(organization);
            const normalizedPat = personalAccessToken.trim();
            if (normalizedOrganization && normalizedPat && showAssignedPanel) {
                const granted = await requestAzureDevOpsAccess();
                if (!granted) {
                    throw new Error(
                        "Azure DevOps access was not granted, so the panel settings were not saved."
                    );
                }
            }

            const savedSettings = azureDevOpsSettings.save({
                organization: normalizedOrganization,
                pat: normalizedPat,
                enabled: showAssignedPanel,
            });
            organization = savedSettings.organization;
            personalAccessToken = savedSettings.pat;

            if (
                !savedSettings.enabled ||
                !savedSettings.organization ||
                !savedSettings.pat
            ) {
                try {
                    await removeAzureDevOpsAccess();
                } catch (error) {
                    adoMessage =
                        "Settings were saved, but Azure DevOps access could not be revoked: " +
                        messageFromError(error);
                    adoMessageIsError = true;
                    return;
                }
            }

            if (!savedSettings.organization || !savedSettings.pat) {
                adoMessage =
                    "Settings saved. Enter both an organization and a PAT to show the panel.";
            } else if (!savedSettings.enabled) {
                adoMessage = "Settings saved. The assigned work panel is turned off.";
            } else {
                adoMessage = "Settings saved. Your assigned work panel is ready.";
            }
        } catch (error) {
            adoMessage = messageFromError(error);
            adoMessageIsError = true;
        }
    }

    async function clearAzureDevOpsSettings(): Promise<void> {
        try {
            azureDevOpsSettings.clear();
            organization = "";
            personalAccessToken = "";
            showAssignedPanel = true;
        } catch (error) {
            adoMessage = messageFromError(error);
            adoMessageIsError = true;
            return;
        }

        try {
            const permissionRemoved = await removeAzureDevOpsAccess();
            adoMessage = permissionRemoved
                ? "Azure DevOps settings were removed and site access was revoked."
                : "Azure DevOps settings and the saved PAT were removed.";
            adoMessageIsError = false;
        } catch (error) {
            adoMessage =
                "The saved PAT was removed, but Azure DevOps access could not be revoked: " +
                messageFromError(error);
            adoMessageIsError = true;
        }
    }

    async function saveWeatherLocation(): Promise<void> {
        weatherMessage = "";
        weatherMessageIsError = false;
        const previousLocation = $weatherLocation;
        let requestedAccess = false;

        try {
            const city = weatherCity.trim();
            if (city.length < 2) {
                throw new Error("Enter a city or town name.");
            }

            if (isLocalPreview()) {
                weatherLocation.save({
                    name: city,
                    latitude: 47.6062,
                    longitude: -122.3321,
                });
                weatherMessage = "Preview location saved. Sample weather is shown locally.";
                return;
            }

            const granted = await requestWeatherAccess();
            if (!granted) {
                throw new Error(
                    "Open-Meteo access was not granted, so the weather location was not saved."
                );
            }
            requestedAccess = true;

            const location = await findWeatherLocation(city);
            weatherLocation.save(location);
            weatherCity = location.name;
            weatherMessage = `Weather is now set to ${location.name}.`;
        } catch (error) {
            weatherMessage = messageFromError(error);
            if (requestedAccess && !previousLocation) {
                try {
                    await removeWeatherAccess();
                } catch (permissionError) {
                    weatherMessage +=
                        " Open-Meteo access could not be revoked: " +
                        messageFromError(permissionError);
                }
            }
            weatherMessageIsError = true;
        }
    }

    async function clearWeatherLocation(): Promise<void> {
        try {
            weatherLocation.clear();
            weatherCity = "";
        } catch (error) {
            weatherMessage = messageFromError(error);
            weatherMessageIsError = true;
            return;
        }

        try {
            const permissionRemoved = await removeWeatherAccess();
            weatherMessage = permissionRemoved
                ? "Weather location removed and Open-Meteo access revoked."
                : "Weather location removed.";
            weatherMessageIsError = false;
        } catch (error) {
            weatherMessage =
                "Weather location removed, but Open-Meteo access could not be revoked: " +
                messageFromError(error);
            weatherMessageIsError = true;
        }
    }

    async function saveBackgroundKey(): Promise<void> {
        backgroundMessage = "";
        backgroundMessageIsError = false;

        try {
            const key = unsplashKey.trim();
            if (key) {
                const granted = await requestUnsplashAccess();
                if (!granted) {
                    throw new Error(
                        "Unsplash access was not granted, so the background key was not saved."
                    );
                }
                await background.configure(key);
                backgroundMessage = "Background key saved. Darker photos are preferred.";
                return;
            }

            await background.configure("");
            try {
                await removeUnsplashAccess();
            } catch (error) {
                backgroundMessage =
                    "Backgrounds were turned off, but Unsplash access could not be revoked: " +
                    messageFromError(error);
                backgroundMessageIsError = true;
                return;
            }
            backgroundMessage =
                "Backgrounds are off. Your shortcuts and panels will keep working.";
        } catch (error) {
            backgroundMessage = messageFromError(error);
            backgroundMessageIsError = true;
        }
    }

    async function refreshBackground(): Promise<void> {
        backgroundMessage = "";
        backgroundMessageIsError = false;

        try {
            if (!unsplashKey.trim()) {
                throw new Error("Add an Unsplash access key before refreshing the background.");
            }
            const granted = await requestUnsplashAccess();
            if (!granted) {
                throw new Error(
                    "Unsplash access was not granted, so the background could not be refreshed."
                );
            }
            await background.refresh();
            backgroundMessage = "Background refreshed.";
        } catch (error) {
            backgroundMessage = messageFromError(error);
            backgroundMessageIsError = true;
        }
    }
</script>

<svelte:window on:open-settings={openSettings} />

<div class="info">
    <div class="image-credit">
        <span class="background-description">
            {$background.error || $background.description}
        </span>
        {#if !$background.error && $background.photographerName && $background.photographerUrl}
            <span class="photo-attribution">
                Photo by
                <a
                    href={$background.photographerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {$background.photographerName}
                </a>
                on
                <a
                    href="https://unsplash.com/?utm_source=tabby&utm_medium=referral"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Unsplash
                </a>
            </span>
        {/if}
    </div>
    <button
        class="settings-trigger"
        type="button"
        aria-label="Open settings"
        aria-expanded={showSettingsPanel}
        aria-controls="settings-panel"
        on:click={openSettings}
    >
        <img src="images/settings.png" alt="" />
    </button>
</div>

<dialog
    id="settings-panel"
    class="settings-modal"
    bind:this={settingsDialog}
    aria-labelledby="settings-heading"
    on:close={onSettingsClose}
>
    <div class="settings-header">
        <div>
            <h1 id="settings-heading">Make Tabby yours</h1>
            <p>Manage your shortcuts, background, and optional panels.</p>
        </div>
        <button
            class="close-button"
            type="button"
            aria-label="Close settings"
            on:click={closeSettings}
        >
            Close
        </button>
    </div>

    <div class="settings-content">
        <section class="settings-section" aria-labelledby="shortcuts-heading">
            <h2 id="shortcuts-heading">Shortcuts</h2>
            <p class="section-description">
                Add a website to the menu bar. Tabby finds its favicon automatically;
                upload an image if you prefer to use a local icon.
            </p>

            <form on:submit|preventDefault={saveIcon}>
                <label class="field">
                    Name
                    <input
                        type="text"
                        bind:value={newIconTitle}
                        placeholder="For example, Calendar"
                        maxlength="80"
                        required
                    />
                </label>
                <label class="field">
                    Website URL
                    <input
                        type="url"
                        bind:value={newIconUrl}
                        placeholder="https://example.com"
                        required
                    />
                </label>
                <label class="field">
                    Local icon image <span class="optional">(optional)</span>
                    <input type="file" bind:files accept="image/*" />
                </label>
                <p class="field-hint">
                    Automatic favicons are provided by Google. A local image is saved in
                    this browser and used instead.
                </p>
                <button class="button button-primary" type="submit">
                    Add shortcut
                </button>
            </form>

            <div class="manage-shortcuts">
                <label class="field">
                    Remove a shortcut
                    <select bind:value={removeIconTitle} disabled={$icons.length === 0}>
                        <option value="" disabled>Select a shortcut</option>
                        {#each $icons as icon}
                            <option value={icon.title}>{icon.title}</option>
                        {/each}
                    </select>
                </label>
                <button
                    class="button"
                    type="button"
                    on:click={removeIcon}
                    disabled={!removeIconTitle}
                >
                    Remove
                </button>
            </div>

            <div class="button-row">
                <button class="button" type="button" on:click={exportIcons}>
                    Export shortcuts
                </button>
                <label class="button file-button">
                    Import shortcuts
                    <input
                        type="file"
                        accept="application/json,.json"
                        on:change={importIcons}
                    />
                </label>
            </div>
            {#if shortcutMessage}
                <p
                    class:error={shortcutMessageIsError}
                    class="form-message"
                    aria-live="polite"
                >
                    {shortcutMessage}
                </p>
            {/if}
        </section>

        <section class="settings-section" aria-labelledby="background-heading">
            <h2 id="background-heading">Background</h2>
            <p class="section-description">
                Use your Unsplash access key for daily landscape backgrounds. Saving
                the key requests Unsplash API access. Tabby prefers photos with a black
                dominant color when available; leave this blank to turn backgrounds off.
            </p>
            <label class="field">
                Unsplash access key
                <input
                    type="password"
                    bind:value={unsplashKey}
                    autocomplete="off"
                    placeholder="Paste your Unsplash access key"
                />
            </label>
            <div class="button-row">
                <button class="button button-primary" type="button" on:click={saveBackgroundKey}>
                    Save key
                </button>
                <button class="button" type="button" on:click={refreshBackground}>
                    Refresh photo
                </button>
            </div>
            {#if backgroundMessage}
                <p
                    class:error={backgroundMessageIsError}
                    class="form-message"
                    aria-live="polite"
                >
                    {backgroundMessage}
                </p>
            {/if}
            {#if $background.error && !backgroundMessageIsError}
                <p class="form-message error" role="alert">{$background.error}</p>
            {/if}
        </section>

        <section class="settings-section" aria-labelledby="weather-heading">
            <h2 id="weather-heading">Weather</h2>
            <p class="section-description">
                Set a city to show current weather in the top-right corner. Temperatures
                are in Celsius and wind speeds are in km/h.
            </p>
            <form on:submit|preventDefault={saveWeatherLocation}>
                <label class="field">
                    City or town
                    <input
                        type="text"
                        bind:value={weatherCity}
                        placeholder="For example, London, United Kingdom"
                        maxlength="100"
                        autocomplete="off"
                    />
                </label>
                <p class="field-hint">
                    Saving requests access to Open-Meteo. Your city is sent to find its
                    coordinates, then those coordinates are used to fetch weather. The
                    location is stored in this browser; no GPS permission or API key is
                    required.
                </p>
                <div class="button-row">
                    <button class="button button-primary" type="submit">
                        Save weather location
                    </button>
                    <button
                        class="button"
                        type="button"
                        on:click={clearWeatherLocation}
                        disabled={!$weatherLocation}
                    >
                        Clear location
                    </button>
                </div>
            </form>
            {#if weatherMessage}
                <p
                    class:error={weatherMessageIsError}
                    class="form-message"
                    aria-live="polite"
                >
                    {weatherMessage}
                </p>
            {/if}
        </section>

        <section class="settings-section" aria-labelledby="panels-heading">
            <h2 id="panels-heading">Optional panels</h2>
            <p class="section-description">
                Configure optional panels to keep your workspace organized. More panels
                can be added here in the future.
            </p>

            <form on:submit|preventDefault={saveAzureDevOpsSettings}>
                <h3>Azure DevOps</h3>
                <p class="section-description">
                    Show your open work items assigned to you. Both fields are required.
                </p>
                <label class="field">
                    Organization
                    <input
                        type="text"
                        bind:value={organization}
                        placeholder="For example, contoso"
                        autocomplete="organization"
                    />
                </label>
                <label class="field">
                    Personal access token (PAT)
                    <input
                        type="password"
                        bind:value={personalAccessToken}
                        autocomplete="new-password"
                        placeholder="Paste your Azure DevOps PAT"
                    />
                </label>
                <p class="field-hint">
                    Create a PAT with <strong>Work Items (Read)</strong> access. It is stored
                    only in this browser profile and sent only to Azure DevOps.
                    Browser access to dev.azure.com is requested when you save an enabled panel.
                </p>
                <label class="checkbox-field">
                    <input type="checkbox" bind:checked={showAssignedPanel} />
                    Show the assigned work panel
                </label>
                <div class="button-row">
                    <button class="button button-primary" type="submit">
                        Save panel settings
                    </button>
                    <button class="button" type="button" on:click={clearAzureDevOpsSettings}>
                        Remove PAT
                    </button>
                </div>
            </form>
            {#if adoMessage}
                <p
                    class:error={adoMessageIsError}
                    class="form-message"
                    aria-live="polite"
                >
                    {adoMessage}
                </p>
            {/if}
        </section>

        <footer class="settings-footer">
            <span>Version __VERSION__</span>
            <span>Settings are saved in this browser.</span>
        </footer>
    </div>
</dialog>

<style>
    .info {
        grid-area: info;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 0.75rem;
        color: white;
        font-size: 0.75rem;
        backdrop-filter: blur(20px);
    }

    .image-credit {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
    }

    .background-description {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .photo-attribution {
        flex: 0 0 auto;
        white-space: nowrap;
    }

    .image-credit a {
        color: inherit;
    }

    .settings-trigger {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
    }

    .settings-trigger:hover,
    .settings-trigger:focus-visible {
        background: rgba(255, 255, 255, 0.18);
    }

    .settings-trigger img {
        width: 1.4rem;
    }

    .settings-modal {
        position: fixed;
        inset: 0 0 0 auto;
        width: min(34rem, 100vw);
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        margin: 0 0 0 auto;
        padding: 0;
        overflow-y: auto;
        border: 0;
        color: #26353b;
        background: rgba(248, 250, 250, 0.96);
        box-shadow: -0.8rem 0 2.5rem rgba(0, 0, 0, 0.22);
        backdrop-filter: blur(24px);
    }

    .settings-modal::backdrop {
        background: rgba(7, 17, 22, 0.4);
        backdrop-filter: blur(2px);
    }

    .settings-header {
        position: sticky;
        z-index: 1;
        top: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid rgba(38, 53, 59, 0.12);
        background: rgba(248, 250, 250, 0.96);
    }

    .settings-header h1 {
        margin: 0;
        font-size: 1.35rem;
    }

    .settings-header p {
        margin: 0.35rem 0 0;
        color: #5c6d73;
        font-size: 0.88rem;
        line-height: 1.4;
    }

    .settings-content {
        padding: 0 1.5rem 1.5rem;
    }

    .settings-section {
        padding: 1.25rem 0;
        border-bottom: 1px solid rgba(38, 53, 59, 0.14);
    }

    .settings-section h2 {
        margin: 0;
        font-size: 1.1rem;
    }

    .settings-section h3 {
        margin: 1rem 0 0;
        font-size: 0.95rem;
    }

    .section-description,
    .field-hint {
        color: #5c6d73;
        font-size: 0.82rem;
        line-height: 1.5;
    }

    .section-description {
        margin: 0.4rem 0 0.9rem;
    }

    .field {
        display: block;
        margin: 0.85rem 0 0;
        font-size: 0.85rem;
        font-weight: 600;
    }

    .field input,
    .field select {
        display: block;
        box-sizing: border-box;
        width: 100%;
        margin-top: 0.35rem;
        padding: 0.65rem 0.7rem;
        border: 1px solid #c4ced1;
        border-radius: 0.45rem;
        color: #26353b;
        background: rgba(255, 255, 255, 0.82);
        font: inherit;
        font-weight: 400;
    }

    .field input[type="file"] {
        padding: 0.4rem;
    }

    .field input[type="file"]::file-selector-button {
        margin-right: 0.55rem;
        padding: 0.4rem 0.6rem;
        border: 0;
        border-radius: 0.3rem;
        background: #e7edef;
        cursor: pointer;
    }

    .field input:focus-visible,
    .field select:focus-visible,
    button:focus-visible,
    .file-button:focus-within {
        outline: 2px solid #236f8b;
        outline-offset: 2px;
    }

    .optional {
        color: #69787d;
        font-weight: 400;
    }

    .field-hint {
        margin: 0.4rem 0 0.75rem;
    }

    .button-row,
    .manage-shortcuts {
        display: flex;
        align-items: end;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 0.9rem;
    }

    .manage-shortcuts .field {
        flex: 1 1 12rem;
        margin: 0;
    }

    .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.5rem;
        padding: 0.55rem 0.8rem;
        border: 1px solid #c4ced1;
        border-radius: 0.45rem;
        color: #26353b;
        background: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        text-decoration: none;
    }

    .button:hover,
    .close-button:hover {
        background: white;
    }

    .button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    .button-primary {
        border-color: #205f79;
        color: white;
        background: #205f79;
    }

    .button-primary:hover {
        background: #194c61;
    }

    .file-button {
        position: relative;
        overflow: hidden;
    }

    .file-button input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
    }

    .checkbox-field {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        margin-top: 0.9rem;
        font-size: 0.85rem;
    }

    .checkbox-field input {
        width: 1rem;
        height: 1rem;
        accent-color: #205f79;
    }

    .close-button {
        flex: 0 0 auto;
        min-height: 2.25rem;
        padding: 0.4rem 0.65rem;
        border: 1px solid #c4ced1;
        border-radius: 0.45rem;
        color: #26353b;
        background: rgba(255, 255, 255, 0.65);
        cursor: pointer;
        font: inherit;
        font-size: 0.82rem;
    }

    .form-message {
        margin: 0.7rem 0 0;
        color: #23614b;
        font-size: 0.82rem;
        line-height: 1.45;
    }

    .form-message.error {
        color: #9d2c2c;
    }

    .settings-footer {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding-top: 1rem;
        color: #64747a;
        font-size: 0.72rem;
    }

    @media (max-width: 520px) {
        .settings-content {
            padding-right: 1rem;
            padding-left: 1rem;
        }

        .settings-header {
            padding-right: 1rem;
            padding-left: 1rem;
        }
    }
</style>
