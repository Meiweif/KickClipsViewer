import { t } from '../lib/i18n.js';
import { checkChannelOnKick } from '../lib/validate-channel.js';
import {
  normalizeChannel,
  applyChannelInputSanitize,
  applyChannelPaste,
  finalizeChannelInput
} from '../lib/channel-input.js';

const channelInput = document.getElementById('channel-input');
const openClipsBtn = document.getElementById('open-clips-btn');
const channelError = document.getElementById('channel-error');

function showChannelError(message) {
  channelError.textContent = message;
  channelError.classList.remove('hidden');
}

function hideChannelError() {
  channelError.classList.add('hidden');
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

  openClipsBtn.disabled = true;
  showChannelError(t('channelValidating'));

  try {
    const response = await checkChannelOnKick(channel);

    if (!response?.ok) {
      showChannelError(response?.error || t('channelNotFound', { channel }));
      channelInput.focus();
      return;
    }

    hideChannelError();
    await chrome.storage.local.set({ lastChannel: channel });
    openTrackingPage(channel);
  } finally {
    openClipsBtn.disabled = false;
  }
});

channelInput.addEventListener('paste', (event) => {
  const text = event.clipboardData?.getData('text') || '';

  if (applyChannelPaste(channelInput, text)) {
    event.preventDefault();
    hideChannelError();
  }
});

channelInput.addEventListener('input', () => {
  applyChannelInputSanitize(channelInput);
  hideChannelError();
});

channelInput.addEventListener('blur', () => {
  finalizeChannelInput(channelInput);
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
