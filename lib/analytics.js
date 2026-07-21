export const ANALYTICS_BASE = 'http://193.17.180.163:8080';
export const EXTENSION_ID = 'kick-clips-viewer';

const UUID_KEY = 'installUuid';
const ENABLED_KEY = 'analyticsEnabled';
const QUEUE_KEY = 'analyticsQueue';
const LAST_FLUSH_KEY = 'analyticsLastFlush';
const INSTALL_REPORTED_KEY = 'installReported';
const ONBOARDING_KEY = 'onboardingComplete';

const DEFAULT_FLUSH_HOURS = 6;

export const EVENT = {
  INSTALL: 'in',
  POPUP: 'po',
  TRACKING: 'tp',
  CHANNEL: 'cv',
  REFRESH: 'rf',
  LANGUAGE: 'lc',
  SETTINGS: 'sc',
  OPT_IN: 'ao',
  OPT_OUT: 'ax'
};

function randomUuid() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
    return value.toString(16);
  });
}

export async function ensureInstallUuid() {
  const data = await chrome.storage.local.get([UUID_KEY]);
  if (data[UUID_KEY]) {
    return data[UUID_KEY];
  }

  const uuid = randomUuid();
  await chrome.storage.local.set({ [UUID_KEY]: uuid });
  return uuid;
}

export async function isAnalyticsEnabled() {
  const data = await chrome.storage.local.get([ENABLED_KEY]);
  return data[ENABLED_KEY] === true;
}

export async function setAnalyticsEnabled(enabled) {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled });
}

export async function isOnboardingComplete() {
  const data = await chrome.storage.local.get([ONBOARDING_KEY]);
  return data[ONBOARDING_KEY] === true;
}

export async function setOnboardingComplete(complete = true) {
  await chrome.storage.local.set({ [ONBOARDING_KEY]: complete });
}

async function readQueue() {
  const data = await chrome.storage.local.get([QUEUE_KEY]);
  const queue = data[QUEUE_KEY];
  if (!queue || typeof queue !== 'object') {
    return { e: {}, channels: {} };
  }

  return {
    e: queue.e && typeof queue.e === 'object' ? { ...queue.e } : {},
    channels: queue.channels && typeof queue.channels === 'object' ? { ...queue.channels } : {}
  };
}

async function writeQueue(queue) {
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

async function incrementQueueEvent(key, amount = 1) {
  const queue = await readQueue();
  queue.e[key] = (queue.e[key] || 0) + amount;
  await writeQueue(queue);
}

async function incrementQueueChannel(channel, amount = 1) {
  const normalized = String(channel || '').trim().toLowerCase();
  if (!normalized) {
    return;
  }

  const queue = await readQueue();
  queue.channels[normalized] = (queue.channels[normalized] || 0) + amount;
  await writeQueue(queue);
}

export async function trackEvent(eventKey, amount = 1) {
  if (!eventKey || amount <= 0) {
    return;
  }

  const enabled = await isAnalyticsEnabled();
  if (!enabled) {
    return;
  }

  await incrementQueueEvent(eventKey, amount);
  scheduleFlushSoon();
}

export async function trackChannelView(channel) {
  const enabled = await isAnalyticsEnabled();
  if (!enabled) {
    return;
  }

  await incrementQueueEvent(EVENT.CHANNEL, 1);
  await incrementQueueChannel(channel, 1);
  scheduleFlushSoon();
}

let flushTimer = null;

function scheduleFlushSoon() {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAnalytics().catch(() => {});
  }, 5000);
}

async function fetchServerConfig() {
  try {
    const response = await fetch(`${ANALYTICS_BASE}/api/config`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      return { collect: false, flush_interval_hours: DEFAULT_FLUSH_HOURS };
    }

    return response.json();
  } catch {
    return { collect: false, flush_interval_hours: DEFAULT_FLUSH_HOURS };
  }
}

async function getExtensionVersion() {
  return chrome.runtime.getManifest().version || '0.0.0';
}

async function getLanguageCode() {
  const data = await chrome.storage.local.get(['language']);
  return data.language === 'ru' ? 'ru' : 'en';
}

export async function sendInstallPing({ analyticsEnabled = false } = {}) {
  const data = await chrome.storage.local.get([INSTALL_REPORTED_KEY]);
  if (data[INSTALL_REPORTED_KEY]) {
    return;
  }

  const uuid = await ensureInstallUuid();
  const payload = {
    id: EXTENSION_ID,
    v: await getExtensionVersion(),
    uuid,
    t: Date.now(),
    lang: await getLanguageCode(),
    analytics: analyticsEnabled === true,
    install: true,
    e: {},
    channels: {}
  };

  try {
    const config = await fetchServerConfig();
    if (!config.collect) {
      return;
    }

    const response = await fetch(`${ANALYTICS_BASE}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      await chrome.storage.local.set({ [INSTALL_REPORTED_KEY]: true });
    }
  } catch {
    // retry on next startup
  }
}

export async function flushAnalytics({ forceOptOut = false, forceOptIn = false } = {}) {
  const config = await fetchServerConfig();
  if (!config.collect) {
    return;
  }

  const uuid = await ensureInstallUuid();
  const enabled = await isAnalyticsEnabled();
  const queue = await readQueue();
  const hasEvents = Object.keys(queue.e).length > 0 || Object.keys(queue.channels).length > 0;

  if (!forceOptOut && !forceOptIn && !enabled && !hasEvents) {
    return;
  }

  const payload = {
    id: EXTENSION_ID,
    v: await getExtensionVersion(),
    uuid,
    t: Date.now(),
    lang: await getLanguageCode(),
    analytics: enabled,
    opt_out: forceOptOut,
    opt_in: forceOptIn,
    e: queue.e,
    channels: queue.channels
  };

  try {
    const response = await fetch(`${ANALYTICS_BASE}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return;
    }

    await writeQueue({ e: {}, channels: {} });
    await chrome.storage.local.set({ [LAST_FLUSH_KEY]: Date.now() });
  } catch {
    // keep queue for retry
  }
}

export async function handleAnalyticsOptIn(enabled, { fromOnboarding = false } = {}) {
  const previouslyEnabled = await isAnalyticsEnabled();
  await setAnalyticsEnabled(enabled);

  if (enabled && !previouslyEnabled) {
    await incrementQueueEvent(EVENT.OPT_IN, 1);
    await flushAnalytics({ forceOptIn: true });
    return;
  }

  if (!enabled && previouslyEnabled) {
    await incrementQueueEvent(EVENT.OPT_OUT, 1);
    await flushAnalytics({ forceOptOut: true });
    await writeQueue({ e: {}, channels: {} });
    return;
  }

  if (fromOnboarding && !enabled) {
    await sendInstallPing({ analyticsEnabled: false });
  }
}

export async function setupAnalyticsAlarms() {
  const config = await fetchServerConfig();
  const hours = Number(config.flush_interval_hours) || DEFAULT_FLUSH_HOURS;
  const periodMinutes = Math.max(60, Math.round(hours * 60));

  chrome.alarms.create('analytics-flush', { periodInMinutes: periodMinutes });
}

export function initAnalyticsAlarmsListener() {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'analytics-flush') {
      flushAnalytics().catch(() => {});
    }
  });
}

export async function bootstrapAnalytics() {
  await ensureInstallUuid();
  await sendInstallPing({ analyticsEnabled: await isAnalyticsEnabled() });
  await setupAnalyticsAlarms();
}
