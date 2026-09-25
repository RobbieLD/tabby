# <img src="public/images/favicon.png" height="23"> Tabby
Tabby is a customizable new-tab page for Firefox and Chrome, built because I couldn't find one that I wanted already available.
![Screen Shot](docs/screen-shot.png)
![Screen Shot Menu](docs/screen-shot_menu.png)

## Features 
- Stores uploaded shortcut icons locally in browser storage.
- Finds site favicons automatically when adding a shortcut; a local image can be uploaded instead.
- Uses Unsplash for optional photo backgrounds.
- Add and remove shortcuts for apps and websites.
- Background URLs are cached for an hour to avoid excess API usage.
- Settings let you configure backgrounds, manage shortcuts, and manually refresh the photo.
- Import and export icon lists.
- Optional Azure DevOps panel lists your open assigned work items with direct links.
- Supports both Chrome and Firefox.

## Installation
There are two release channels you can install this extension from which are described below.

### Sideloaded builds
__Firefox__: The development extension can be installed from the release page by downloading [tabby-firefox-dev.xpi](https://github.com/RobbieLD/tabby/releases/latest/download/tabby-firefox-dev.xpi). As it is not signed by Mozilla, it can only be installed in the [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/) or another experimental Firefox release after setting `xpinstall.signatures.required` to `false` in `about:config`.

__Chrome__: Download the [latest Chromium release zip](https://github.com/RobbieLD/tabby/releases/latest/download/tabby-chromium-release.zip), extract it, enable Developer mode on the extensions page, and choose **Load unpacked**. Unpacked extensions do not update automatically.

### Stable
The stable Firefox release is available from the [Firefox Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/tabby/). A Chrome Web Store listing is not available yet; use the Chromium release archive above.

## Usage
To use Unsplash backgrounds, add an API access key from the [Unsplash Dev Portal](https://unsplash.com/developers) in Settings. Backgrounds are optional.

To show the Azure DevOps panel, enter your organization name (the part after `dev.azure.com/`) and a personal access token in Settings. Create a PAT with the **Work Items (Read)** scope and an expiry that suits you. The browser asks for Azure DevOps access only when you save a complete, enabled panel configuration. The PAT is stored in the extension's local browser storage and is sent only to Azure DevOps. Remove it from Settings at any time to hide the panel, delete the saved token, and revoke that access. The panel shows up to 100 of your most recently changed, open work items.

Automatic shortcut icons use Google's S2 favicon service and send the site's origin to Google. If you prefer not to use the service, upload a local image when adding the shortcut; uploaded images remain in local browser storage.

## Development
The code is written in [Svelte](https://svelte.dev/). Use Node.js 20 or newer, clone the repository, and run `yarn install`. Start the development server with `yarn dev`, build with `yarn build`, or check TypeScript with `yarn typecheck`.

## Contributing
Contributions in the form of PRs are welcome. This started as a little project for me to make something I wanted but since I've gone to all that work I figured I'd put it on the Mozilla add-on hubs so other's could use it too. There's a lot of features around customisation which could be added but I haven't bothered with at the moment since it's how I want it, but I'll probably get to some of them in the future. 
