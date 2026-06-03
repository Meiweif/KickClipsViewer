import { t } from '../lib/i18n.js';

const channelInput = document.getElementById('channel-input');
const openClipsBtn = document.getElementById('open-clips-btn');
const channelError = document.getElementById('channel-error');

const CHANNEL_INPUT_PATTERN = /[^a-zA-Z0-9_]/g;

function showChannelError(message) {
  channelError.textContent = message;
  channelError.classList.remove('hidden');
}

function hideChannelError() {
  channelError.classList.add('hidden');
}

function normalizeChannel(value) {
  return value.trim().replace(/^@/, '').toLowerCase();
}

function sanitizeChannelInput(input) {
  const filtered = input.value.replace(CHANNEL_INPUT_PATTERN, '');
  if (filtered !== input.value) {
    input.value = filtered;
  }
}

function openTrackingPage(channel) {
  const url = chrome.runtime.getURL(`pages/tracking.html?channel=${encodeURIComponent(channel)}`);
  chrome.tabs.create({ url });
}

function applyPopupTranslations() {
  document.getElementById('popup-title').textContent = t('popupTitle');
  document.getElementById('popup-subtitle').textContent = t('popupSubtitle');
  document.getElementById('channel-label').textContent = t('channelLabel');
  channelInput.placeholder = t('channelPlaceholder');
  openClipsBtn.textContent = t('openClips');
  document.getElementById('popup-hint').textContent = t('popupHint');
}

openClipsBtn.addEventListener('click', async () => {
  hideChannelError();
  const channel = normalizeChannel(channelInput.value);

  if (!channel) {
    showChannelError(t('channelRequired'));
    channelInput.focus();
    return;
  }

  await chrome.storage.local.set({ lastChannel: channel });
  openTrackingPage(channel);
});

channelInput.addEventListener('input', () => {
  sanitizeChannelInput(channelInput);
});

channelInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    openClipsBtn.click();
  }
});

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  if (response?.ok) {
    channelInput.value = response.lastChannel || '';
  }
}

applyPopupTranslations();
loadSettings().catch(() => {});
