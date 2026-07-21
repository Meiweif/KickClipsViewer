import { t, loadLanguage, setLanguage, getLanguage } from '../lib/i18n.js';
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
const langButtons = document.querySelectorAll('.lang-btn');

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

function trackChannelAnalytics(channel) {
  if (!channel) {
    return;
  }

  chrome.runtime.sendMessage({ type: 'ANALYTICS_TRACK_CHANNEL', channel }).catch(() => {});
}

function updateLangButtons() {
  const current = getLanguage();
  langButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.lang === current);
  });
}

function applyPopupTranslations() {
  document.documentElement.lang = getLanguage();
  document.getElementById('popup-title').textContent = t('popupTitle');
  document.getElementById('popup-subtitle').textContent = t('popupSubtitle');
  document.getElementById('channel-label').textContent = t('channelLabel');
  channelInput.placeholder = t('channelPlaceholder');
  openClipsBtn.textContent = t('openClips');
  document.getElementById('language-label').textContent = t('language');
  document.getElementById('popup-hint').textContent = t('popupHint');
  updateLangButtons();
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
    trackChannelAnalytics(channel);
    openTrackingPage(channel);
  } catch (error) {
    showChannelError(error?.message || t('loadError'));
  } finally {
    openClipsBtn.disabled = false;
  }
});

langButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const lang = button.dataset.lang;
    if (!lang || lang === getLanguage()) {
      updateLangButtons();
      return;
    }

    await setLanguage(lang);
    applyPopupTranslations();
  });
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

async function initPopup() {
  await loadLanguage();
  applyPopupTranslations();
  chrome.runtime.sendMessage({ type: 'ANALYTICS_TRACK', event: 'po' }).catch(() => {});
  await loadSettings().catch(() => {});
}

initPopup();
