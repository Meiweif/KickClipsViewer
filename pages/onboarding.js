import { t, loadLanguage, setLanguage, getLanguage } from '../lib/i18n.js';
import { checkChannelOnKick } from '../lib/validate-channel.js';
import {
  normalizeChannel,
  applyChannelInputSanitize,
  applyChannelPaste,
  finalizeChannelInput
} from '../lib/channel-input.js';

const langButtons = document.querySelectorAll('.lang-btn');
const analyticsToggle = document.getElementById('analytics-toggle');
const learnMoreBtn = document.getElementById('learn-more-btn');
const saveBtn = document.getElementById('save-btn');
const stepSetup = document.getElementById('step-setup');
const stepChannel = document.getElementById('step-channel');
const channelInput = document.getElementById('channel-input');
const channelError = document.getElementById('channel-error');
const continueBtn = document.getElementById('continue-btn');

function updateLangButtons() {
  const current = getLanguage();
  langButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.lang === current);
  });
}

function applyTranslations() {
  document.documentElement.lang = getLanguage();
  document.getElementById('welcome-title').textContent = t('onboardingWelcome');
  document.getElementById('welcome-subtitle').textContent = t('onboardingSubtitle');
  document.getElementById('language-label').textContent = t('language');
  document.getElementById('analytics-note').textContent = t('onboardingAnalyticsNote');
  document.getElementById('badge-anonymous').textContent = t('analyticsAnonymous');
  document.getElementById('badge-counters').textContent = t('analyticsCountersOnly');
  document.getElementById('badge-consent').textContent = t('analyticsByConsent');
  document.getElementById('badge-disable').textContent = t('analyticsCanDisable');
  document.getElementById('analytics-label').textContent = t('analyticsLabel');
  learnMoreBtn.textContent = t('analyticsLearnMore');
  saveBtn.textContent = t('onboardingSave');
  document.getElementById('channel-step-text').textContent = t('onboardingChannelStep');
  document.getElementById('channel-label').textContent = t('channelLabel');
  channelInput.placeholder = t('channelPlaceholder');
  continueBtn.textContent = t('onboardingContinue');
  updateLangButtons();
}

function showChannelError(message) {
  channelError.textContent = message;
  channelError.classList.remove('hidden');
}

function hideChannelError() {
  channelError.classList.add('hidden');
}

langButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const lang = button.dataset.lang;
    if (!lang || lang === getLanguage()) {
      return;
    }

    await setLanguage(lang);
    applyTranslations();
  });
});

learnMoreBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/transparency.html') });
});

saveBtn.addEventListener('click', async () => {
  const analyticsEnabled = analyticsToggle.checked;

  await chrome.runtime.sendMessage({
    type: 'ANALYTICS_SET_ENABLED',
    enabled: analyticsEnabled,
    fromOnboarding: true
  });

  await chrome.storage.local.set({ onboardingComplete: true });

  stepSetup.classList.add('hidden');
  stepChannel.classList.remove('hidden');
  channelInput.focus();
});

continueBtn.addEventListener('click', async () => {
  hideChannelError();
  const channel = normalizeChannel(channelInput.value);

  if (!channel) {
    showChannelError(t('channelRequired'));
    channelInput.focus();
    return;
  }

  continueBtn.disabled = true;

  try {
    const response = await checkChannelOnKick(channel);

    if (!response?.ok) {
      showChannelError(response?.error || t('channelNotFound', { channel }));
      channelInput.focus();
      return;
    }

    await chrome.storage.local.set({ lastChannel: channel });
    await chrome.runtime.sendMessage({ type: 'ANALYTICS_TRACK_CHANNEL', channel });

    window.location.href = chrome.runtime.getURL(
      `pages/tracking.html?channel=${encodeURIComponent(channel)}`
    );
  } finally {
    continueBtn.disabled = false;
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
    continueBtn.click();
  }
});

async function initOnboarding() {
  await loadLanguage();
  applyTranslations();

  const data = await chrome.storage.local.get(['analyticsEnabled']);
  analyticsToggle.checked = data.analyticsEnabled === true;
}

initOnboarding();
