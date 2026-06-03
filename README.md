# KickClips

Chrome extension to browse all clips from a [Kick.com](https://kick.com) channel with pagination, search, sorting, a built-in player, and downloads.

## Installation

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `KickClips` folder

## Usage

1. Click the extension icon
2. Enter a Kick channel slug (e.g. `xqc`)
3. Click **Open clips**

Or open directly:

`pages/tracking.html?channel=channel_name`

## Features

- Load all channel clips via the Kick API with pagination
- Sort: oldest / newest / popular / least views
- Search by title, creator, and category
- Built-in HLS player with quality selection
- Download clips at the highest available quality
- Creator profile card with a draggable popover
- Cancel long-running loads with in-extension confirmation

## API

The extension uses public Kick JSON endpoints (`kick.com/api/v2/...`). No API keys are required.
