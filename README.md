# 🍏 Kick Clips Viewer 

A handy Chrome extension to browse all clips from a [Kick.com](https://kick.com) channel on a dedicated page with convenient pagination, search, sorting, a built-in player, and downloads.

---

## ✨ Features

* 🚀 **Full load** — fetches every clip on the channel via the Kick API with automatic pagination handling.
* 🗂️ **Flexible sorting:**
  * Oldest first / Newest first
  * Most popular / Least views
* 🔍 **Smart search** — instant filtering by clip title, creator, and category.
* 🎬 **Built-in HLS player** — watch clips directly inside the extension with video quality selection.
* 📥 **Direct downloads** — download clips at the highest available quality in one click.
* 👤 **Creator profile card** — displays streamer details within a convenient, draggable popover.
* 🛑 **Load control** — cancel long-running loading processes at any time with an in-extension confirmation.

---

## 🛠️ Installation

1. Open `chrome://extensions/` in your browser.
2. In the top-right corner, enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `KickClips` folder on your computer.

---

## 💡 Usage

### Method 1. Via the popup
1. Click the extension icon in the browser toolbar.
2. Enter a Kick channel slug (for example, `Kick`).
3. Click **Open clips**.

### Method 2. Direct link
You can open the clips page directly at:
```text
chrome-extension://<EXTENSION_ID>/pages/tracking.html?channel=CHANNEL_NAME
```

> [!IMPORTANT]
> Replace `CHANNEL_NAME` with the streamer’s login slug and `<EXTENSION_ID>` with your extension’s unique ID (you can copy it on `chrome://extensions/`).

---

## 🔑 API Reference

> [!NOTE]
> The extension uses public Kick JSON endpoints (`kick.com/api/v2/...`). **No developer API keys or registration are required** to use this extension.
