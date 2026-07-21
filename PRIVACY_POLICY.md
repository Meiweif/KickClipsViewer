# Privacy Policy for Kick Clips Viewer

This Privacy Policy describes how the **Kick Clips Viewer** browser extension (“KickClips”, “we”) handles information when you browse Kick channel clips. Your privacy is critically important to us, and we are committed to ensuring a safe and transparent experience.

A Russian version is available inside the extension (`pages/privacy.html`).

---

## 📋 Summary

* The extension fetches **public** Kick clip data to work.
* We do **not** ask for your Kick password or your Kick account login.
* **Optional anonymous analytics** is **off by default** until you enable it.
* We may record **Kick channel slugs** used to browse clips (e.g. `Meiweif`), but **not** the identity of the person who installed the extension.
* A full **Transparency Report** is built into the extension.

---

## 💾 1. Data Stored on Your Device

Using Chrome’s local storage, the extension may store:

* UI language preference (English or Russian)
* Last channel name you entered (for convenience)
* Anonymous analytics preference (on/off)
* A random **install UUID** used only for anonymous counters (not linked to your Kick account)
* Queued analytics counters waiting to be sent
* Whether onboarding was completed

This data stays on your device unless you enable analytics and a batch is sent to our server.

---

## 🔒 2. Data Collection and Transmission

* **No Personal Identity Collection:** We do not collect your Kick username, email, passwords, chat messages, or general browsing history outside this extension.
* **Optional Analytics (Opt-In):** Anonymous usage counters are collected **only if you enable** “Share anonymous analytics” in onboarding or Settings. Off by default.
* **What May Be Sent (if opted in):** install UUID, extension version, UI language, event counts, and Kick channel slugs used to open the clips page.
* **Analytics Server:** If analytics is enabled, batched counters are sent to our private analytics server over HTTPS/HTTP. Data is not sold or shared with advertising networks.

---

## 📊 3. Install Counting

When you first run the extension after installation, one install event may be sent so we can measure total installs. If you later **disable** analytics in Settings, we stop collecting further data and your install is excluded from our visible statistics until you enable analytics again.

---

## 🛠️ 4. Use of Permissions

The extension requests specific browser permissions solely to enable its features:

* `storage` — Used to save language, last channel, analytics preference, install UUID, and queued counters locally on your device.
* `alarms` — Used to schedule periodic sending of anonymous analytics batches **only when you have opted in** (e.g. every 6 hours).
* **Host Permissions** — Used to communicate with:
  * **Kick.com** and related CDNs — to fetch public channel information, clip lists, and playback sources (core functionality).
  * **Our analytics server** — only when you have opted in to anonymous analytics.

---

## 🌐 5. Third-Party Services

While using this extension:

* Data requests for clips are sent directly to the public **Kick API**. Any interactions with Kick services are governed by Kick’s official Privacy Policy.
* If you opt in to analytics, batched counters are sent to **our analytics server**. There is no public statistics dashboard.
* Clicking on any clip card or link will securely redirect you to the official Kick website.

We do not use third-party advertising analytics SDKs (Google Analytics, Mixpanel, etc.).

---

## 🗄️ 6. Data Retention

Aggregated analytics counters may be kept for up to **12 months** to compare trends across releases. If you opt out, your UUID is marked as opted out and excluded from aggregate reports.

---

## ✅ 7. Your Choices

* Enable or disable anonymous analytics in onboarding or **Settings** at any time.
* Read the in-extension **Transparency Report** and **Privacy Policy**.
* Uninstall the extension to remove locally stored preferences.

---

## 🔄 8. Changes to This Policy

We reserve the right to update this Privacy Policy as the extension evolves. Any updates will be committed directly to this GitHub repository and reflected in the in-extension Transparency Report. We encourage users to frequently check this page for any changes.

---

## ✉️ 9. Contact

If you have any questions or feedback regarding this Privacy Policy, please open an **Issue** directly in this repository.
