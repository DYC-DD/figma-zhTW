<div align="center">

![](./assets/icons/icon128.png)

# Figma zh-TW

[![Attribution](https://img.shields.io/badge/Based%20on-figmaCN-555?style=flat)](./docs/ATTRIBUTION.md)

</div>

This is a Chrome browser extension that provides Traditional Chinese (zh-TW) localization for parts of the [Figma](https://www.figma.com/) web interface.

## Installation

- **Developer installation:**

  1. Download or clone this project.

     ```bash
     git clone git@github.com:DYC-DD/figma-zhTW.git
     ```

  2. Open Chrome and go to `chrome://extensions`.
  3. Enable "Developer mode" in the top-right corner.
  4. Click "Load unpacked".
  5. Select this project folder.

After installation, open or refresh [Figma](https://www.figma.com/) in Chrome to use the extension.

## Usage

The extension works automatically on Figma pages.

> [!NOTE]
>
> If some text remains in English, it may not have a matching translation entry yet, or Figma may have changed the original UI wording.

## Permissions

This extension uses the following Chrome extension behavior:

- `content_scripts`: Loads translation data and the content script on Figma pages.
- `matches`: Restricts operation to `*://*.figma.com/*`.

> [!IMPORTANT]
>
> This extension does not:
>
> - collect personal data
> - store browsing history
> - send data to any server
> - access pages outside Figma-related domains
> - modify your Figma files, teams, billing, or account settings

## Attribution

This project is based on [figmaCN](https://github.com/Figma-Cool/figmaCN) and provides a Traditional Chinese localization with additional improvements.

For details, please refer to [ATTRIBUTION](./docs/ATTRIBUTION.md).

## Changelog

For the full update history, please refer to the [CHANGELOG](./docs/CHANGELOG.md).

## License

[GPL-3.0 License](./LICENSE)
