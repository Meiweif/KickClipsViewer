# 🍏 Kick Clips Viewer

A handy Chrome extension to browse all clips from a [Kick.com](https://kick.com) channel on a dedicated page with convenient pagination, search, sorting, a built-in player, and downloads.

Supports **English** 🇬🇧 and **Russian** 🇷🇺 UI.

---

## ✨ Features

- 🚀 **Full load** — fetches every clip on the channel via the Kick API with automatic pagination handling.
- 🗂️ **Flexible sorting**
  - Oldest → Newest
  - Newest → Oldest
  - Most viewed
  - Least viewed
- 🔍 **Smart search** — instantly filter clips by title, creator, or category.
- 🎬 **Built-in HLS player** — watch clips directly inside the extension with video quality selection.
- 📥 **Direct downloads** — download clips at the highest available quality in one click.
- 👤 **Creator profile card** — displays streamer information in a draggable popup.
- 🛑 **Load control** — cancel long loading operations at any time.
- 🌐 **English & Russian interface** — switch languages from the popup, onboarding, or Settings.
- ⚙️ **Settings panel** — manage language, channel, and analytics preferences without leaving the clips page.
- 🛡️ **Optional anonymous analytics** — disabled by default. Includes a built-in Transparency Report and Privacy Policy.

---

## 🛠️ Installation

### ✅ Method 1 — Chrome Web Store (Recommended)

1. Open the extension page:

   https://chrome.google.com/webstore/detail/meoibohhadloigepepfdnmgbelhlocgp

2. Click **Add to Chrome**.
3. Confirm the installation.

> **Note**
>
> This is the easiest and safest installation method. Updates may appear slightly later because of Chrome Web Store moderation.

---

### ⚡ Method 2 — Manual Installation

1. Open:

   ```
   chrome://extensions/
   ```

2. Enable **Developer mode** (top-right corner).
3. Click **Load unpacked**.
4. Select the **KickClipsViewer** folder.

> **Important**
>
> Manual installation usually receives updates faster than the Chrome Web Store version.

---

## 💡 Usage

On the first launch, a short onboarding wizard lets you choose your preferred language and analytics settings.

### Method 1 — Popup

1. Click the extension icon.
2. Enter a Kick channel name (for example, `Meiweif`) or paste a full Kick channel URL.
3. Click **Open Clips**.

---

### Method 2 — Direct Link

Open the clips page directly:

```text
chrome-extension://<EXTENSION_ID>/pages/tracking.html?channel=CHANNEL_NAME
```

> **Important**
>
> Replace:
>
> - `<EXTENSION_ID>` with your extension ID (available at `chrome://extensions/`)
> - `CHANNEL_NAME` with the desired Kick channel slug.

---

## 🔑 API

The extension uses the public Kick JSON endpoints:

```
kick.com/api/v2/...
```

No API key, developer account, or registration is required.

---

## 🔒 Privacy

- Preferences are stored locally using Chrome Storage.
- Saved settings include:
  - Language
  - Last opened channel
  - Analytics preference
- Anonymous analytics are **disabled by default** and only enabled with explicit user consent.

For more information, see:

- `PRIVACY_POLICY.md`
- Built-in **Transparency Report** inside the extension.

---

## 📦 Latest Release

**Version 1.2.0**

### What's new

- 🌐 English & Russian localization
- 🚀 First-launch onboarding
- ⚙️ Settings page
- 🛡️ Optional anonymous analytics
- 🔒 Built-in Privacy Policy & Transparency Report

---

## ✉️ Contact

Found a bug or have a suggestion?

Please open an **Issue** in this GitHub repository.

---

## 📄 License

This project is distributed under the MIT License unless stated otherwise.
