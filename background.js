import {
  getChannelBySlug,
  getChannelClipsPage,
  getClipById,
  fetchUsersByIds,
  fetchUsersByLogins
} from './lib/kick-api.js';
import { getClipPlaybackSources, fetchUserVerified } from './lib/clip-player.js';

const clipCache = new Map();
const profileCache = new Map();
const pendingProfileKeys = new Set();

function storeProfile(profile) {
  if (!profile) {
    return;
  }

  if (profile.id) {
    profileCache.set(String(profile.id), profile);
  }

  if (profile.login) {
    profileCache.set(`slug:${profile.login.toLowerCase()}`, profile);
  }
}

function getCachedProfile(key) {
  if (!key) {
    return null;
  }

  return profileCache.get(key) || null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CHANNEL') {
    getChannelBySlug(message.login)
      .then((broadcaster) => sendResponse({ ok: true, broadcaster }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_CHANNEL_CLIPS') {
    getChannelClipsPage(message.slug, message.cursor, message.broadcasterUserId || '')
      .then((page) => sendResponse({ ok: true, ...page }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_CLIP_META') {
    getClipById(message.clipId, message.channelSlug || '', message.broadcasterUserId || '')
      .then((clip) => sendResponse({ ok: true, clip }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_CLIP_SOURCES') {
    getClipPlaybackSources(message.clipId, message.videoUrl)
      .then((sources) => sendResponse({ ok: true, sources }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_USER_VERIFIED') {
    fetchUserVerified(message.login, message.channelSlug)
      .then((verified) => sendResponse({ ok: true, verified }))
      .catch(() => sendResponse({ ok: true, verified: false }));
    return true;
  }

  if (message.type === 'GET_USER_PROFILES') {
    loadUserProfiles(
      message.userIds || [],
      message.userLogins || [],
      message.channelSlug || '',
      message.idToLogin || {}
    )
      .then((profiles) => sendResponse({ ok: true, profiles }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_CACHED_CLIPS') {
    const login = message.channel?.trim().toLowerCase();
    if (message.forceRefresh && login) {
      clipCache.delete(login);
    }
    if (login && clipCache.has(login) && !message.forceRefresh) {
      sendResponse({ ok: true, cached: true, ...clipCache.get(login) });
    } else {
      sendResponse({ ok: true, cached: false });
    }
    return false;
  }

  if (message.type === 'SAVE_CLIPS_CACHE') {
    const login = message.channel?.trim().toLowerCase();
    if (login) {
      clipCache.set(login, message.payload);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['lastChannel'], (data) => {
      sendResponse({
        ok: true,
        lastChannel: data.lastChannel || ''
      });
    });
    return true;
  }

  return false;
});

async function loadUserProfiles(userIds, userLogins, channelSlug, idToLogin) {
  const result = {};
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const uniqueLogins = [...new Set(userLogins.map((l) => l.toLowerCase()).filter(Boolean))];

  const requestedKeys = [
    ...uniqueIds,
    ...uniqueLogins.map((login) => `slug:${login}`)
  ];

  requestedKeys.forEach((key) => {
    const cached = getCachedProfile(key);
    if (cached) {
      result[key] = cached;
      if (cached.id) {
        result[cached.id] = cached;
      }
      if (cached.login) {
        result[`slug:${cached.login.toLowerCase()}`] = cached;
      }
    }
  });

  const missingIds = uniqueIds.filter((id) => !getCachedProfile(id) && !pendingProfileKeys.has(id));
  const missingLogins = uniqueLogins.filter((login) => {
    const key = `slug:${login}`;
    return !getCachedProfile(key) && !pendingProfileKeys.has(key);
  });

  if (!missingIds.length && !missingLogins.length) {
    return result;
  }

  missingIds.forEach((id) => pendingProfileKeys.add(id));
  missingLogins.forEach((login) => pendingProfileKeys.add(`slug:${login}`));

  try {
    const [byId, byLogin] = await Promise.all([
      missingIds.length
        ? fetchUsersByIds(missingIds, channelSlug, idToLogin)
        : Promise.resolve({}),
      missingLogins.length
        ? fetchUsersByLogins(missingLogins, channelSlug)
        : Promise.resolve({})
    ]);

    Object.values({ ...byId, ...byLogin }).forEach((profile) => {
      storeProfile(profile);
      result[profile.id] = profile;
      if (profile.login) {
        result[`slug:${profile.login.toLowerCase()}`] = profile;
      }
    });
  } finally {
    missingIds.forEach((id) => pendingProfileKeys.delete(id));
    missingLogins.forEach((login) => pendingProfileKeys.delete(`slug:${login}`));
  }

  return result;
}
