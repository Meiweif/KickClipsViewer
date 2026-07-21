import {
  sortClips,
  filterClips,
  clipNeedsCreatorEnrichment,
  getClipStorageKey,
  CLIPS_PAGE_LIMIT
} from '../lib/kick-api.js';
import { loadAllClips, isReliableClipsTotal } from '../lib/clip-loader.js';
import { VERIFIED_BADGE_URL, downloadHlsAsBlob } from '../lib/clip-player.js';
import { getCreatorStats, formatLongDate, getClipThumbUrl } from '../lib/creator-stats.js';
import { t, getLocale, getLanguage, loadLanguage, setLanguage, pluralizeClips } from '../lib/i18n.js';
import { checkChannelOnKick } from '../lib/validate-channel.js';
import {
  normalizeChannel,
  applyChannelInputSanitize,
  applyChannelPaste,
  finalizeChannelInput
} from '../lib/channel-input.js';

const PAGE_SIZE = 100;
const LOAD_CANCELLED = 'LOAD_CANCELLED';
let hlsInstance = null;

function tr(key, vars = {}) {
  return t(key, vars);
}

function trackAnalytics(event, amount = 1) {
  chrome.runtime.sendMessage({ type: 'ANALYTICS_TRACK', event, amount }).catch(() => {});
}

function trackChannelAnalytics(channel) {
  if (!channel) {
    return;
  }

  chrome.runtime.sendMessage({ type: 'ANALYTICS_TRACK_CHANNEL', channel }).catch(() => {});
}

const SORT_KEYS = {
  oldest: 'sortOldest',
  newest: 'sortNewest',
  popular: 'sortPopular',
  unpopular: 'sortUnpopular'
};

const params = new URLSearchParams(window.location.search);
let channel = normalizeChannel(params.get('channel') || '');

const pageTitle = document.getElementById('page-title');
const channelSubtitle = document.getElementById('channel-subtitle');
const channelAvatar = document.getElementById('channel-avatar');
const statusPanel = document.getElementById('status-panel');
const statusText = document.getElementById('status-text');
const statusSubtext = document.getElementById('status-subtext');
const contentPanel = document.getElementById('content-panel');
const loadingBanner = document.getElementById('loading-banner');
const loadingBannerSpinner = document.getElementById('loading-banner-spinner');
const loadingBannerText = document.getElementById('loading-banner-text');
const cancelLoadBtn = document.getElementById('cancel-load-btn');
const resumeLoadBtn = document.getElementById('resume-load-btn');
const errorPanel = document.getElementById('error-panel');
const errorText = document.getElementById('error-text');
const clipsBody = document.getElementById('clips-body');
const emptyState = document.getElementById('empty-state');
const pageInfoElements = document.querySelectorAll('.page-info');
const prevButtons = document.querySelectorAll('.prev-btn');
const nextButtons = document.querySelectorAll('.next-btn');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const sortTrigger = sortSelect.querySelector('.custom-select-trigger');
const sortValue = sortSelect.querySelector('.custom-select-value');
const sortMenu = sortSelect.querySelector('.custom-select-menu');
const sortOptions = sortSelect.querySelectorAll('.custom-select-option');
const refreshBtn = document.getElementById('refresh-btn');
const settingsBtn = document.getElementById('settings-btn');
const openSettingsBtn = document.getElementById('open-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsModalClose = document.getElementById('settings-modal-close');
const settingsChangeChannelBtn = document.getElementById('settings-change-channel-btn');
const settingsLangButtons = document.querySelectorAll('#settings-modal .lang-btn');
const settingsAnalyticsToggle = document.getElementById('settings-analytics-toggle');
const settingsLearnMoreBtn = document.getElementById('settings-learn-more');
const channelModal = document.getElementById('channel-modal');
const channelModalInput = document.getElementById('channel-modal-input');
const channelModalCancel = document.getElementById('channel-modal-cancel');
const channelModalSubmit = document.getElementById('channel-modal-submit');
const channelModalError = document.getElementById('channel-modal-error');
const clipModal = document.getElementById('clip-modal');
const clipModalTitle = document.getElementById('clip-modal-title');
const clipModalClose = document.getElementById('clip-modal-close');
const clipPlayer = document.getElementById('clip-player');
const clipPlayerLoading = document.getElementById('clip-player-loading');
const clipPlayerError = document.getElementById('clip-player-error');
const clipOpenLink = document.getElementById('clip-open-link');
const clipQualitySelect = document.getElementById('clip-quality-select');
const clipDownloadBtn = document.getElementById('clip-download-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmModalText = document.getElementById('confirm-modal-text');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalOk = document.getElementById('confirm-modal-ok');
const userPopover = document.getElementById('user-popover');
const userPopoverHeader = userPopover.querySelector('.user-popover-header');
const userPopoverClose = document.getElementById('user-popover-close');
const userPopoverAvatar = document.getElementById('user-popover-avatar');
const userPopoverTitle = document.getElementById('user-popover-title');
const userPopoverSubtitle = document.getElementById('user-popover-subtitle');
const userPopoverBody = document.getElementById('user-popover-body');

const state = {
  allClips: [],
  filteredClips: [],
  currentPage: 1,
  sort: 'oldest',
  search: '',
  broadcaster: null,
  broadcasterUserId: '',
  loading: false,
  tableRenderTimer: null,
  lastTableRenderAt: 0,
  enrichInFlight: new Set(),
  userProfiles: {},
  profileRefreshTimer: null,
  profileRefreshInFlight: false,
  pendingProfileIds: new Set(),
  verifiedPending: new Set(),
  verifiedQueueTimer: null,
  currentBlobUrl: null,
  clipLoadGeneration: 0,
  clipFetchController: null,
  clipSources: [],
  loadAbortController: null,
  popoverDrag: null,
  openPopoverCreatorId: null,
  confirmCallback: null,
  currentClipId: '',
  currentClipTitle: '',
  clipDownloadInFlight: false,
  currentClipVideoUrl: '',
  clipsTotalExpected: null,
  clipsTotalLocked: false,
  clipsLoadedCount: 0,
  clipModalOpen: false,
  tableRenderPending: false,
  creatorClipIndex: new Map(),
  creatorIndexTimer: null,
  clipsDataVersion: 0,
  filtersCacheVersion: -1,
  filtersCacheSort: '',
  filtersCacheSearch: '',
  loadCanResume: false,
  resumeCursor: null,
  pageNavScheduled: false,
  loadPaused: false,
  clipKeyIndex: new Map(),
  heavyWorkInProgress: false,
  deferredRefreshHandle: null

};

function touchClipsData() {
  state.clipsDataVersion += 1;
}

function clearLoadProgressTimers() {
  if (state.tableRenderTimer) {
    clearTimeout(state.tableRenderTimer);
    state.tableRenderTimer = null;
  }

  if (state.creatorIndexTimer) {
    clearTimeout(state.creatorIndexTimer);
    state.creatorIndexTimer = null;
  }

  if (state.deferredRefreshHandle != null) {
    if (typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(state.deferredRefreshHandle);
    } else {
      clearTimeout(state.deferredRefreshHandle);
    }
    state.deferredRefreshHandle = null;
  }
}

function rebuildClipKeyIndex() {
  const index = new Map();

  state.allClips.forEach((clip, clipIndex) => {
    index.set(getClipStorageKey(clip), clipIndex);
  });

  state.clipKeyIndex = index;
}

function replaceAllClips(clips) {
  state.allClips = clips;
  rebuildClipKeyIndex();
  touchClipsData();
}

function shouldWarnBeforeUnload() {
  return state.loading || state.loadCanResume || state.allClips.length > 0;
}

window.addEventListener('beforeunload', (event) => {
  if (!shouldWarnBeforeUnload()) {
    return;
  }

  event.preventDefault();
  event.returnValue = tr('leavePageConfirm');
});

function getProfileKey(clip) {
  if (clip.creator_id && clip.creator_slug) {
    return `id:${clip.creator_id}:${clip.creator_slug}`;
  }
  if (clip.creator_slug) {
    return `slug:${clip.creator_slug.toLowerCase()}`;
  }
  if (clip.creator_id) {
    return `id:${clip.creator_id}`;
  }
  if (clip.creator_name) {
    return `name:${clip.creator_name.toLowerCase()}`;
  }
  return '';
}

function sendRuntimeMessage(message, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(tr('loadClipError')));
    }, timeoutMs);

    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function fetchChannelClipsPage(slug, cursor) {
  const response = await sendRuntimeMessage({
    type: 'GET_CHANNEL_CLIPS',
    slug,
    cursor,
    broadcasterUserId: state.broadcasterUserId
  }, 45000);

  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to load clips');
  }

  return response;
}

function syncProfilesFromClips(clips) {
  for (const clip of clips) {
    const key = getProfileKey(clip);
    if (!key) {
      continue;
    }

    const existing = state.userProfiles[key];
    if (existing?.verifiedChecked) {
      continue;
    }

    state.userProfiles[key] = {
      id: clip.creator_id || key,
      login: clip.creator_slug || clip.creator_name,
      displayName: clip.creator_name || clip.creator_slug,
      avatar: clip.creator_avatar || existing?.avatar || '',
      createdAt: existing?.createdAt || '',
      isVerified: clip.creator_verified === true || existing?.isVerified === true,
      verifiedChecked: clip.creator_verified === true || existing?.verifiedChecked === true
    };
  }
}

function showStatus(message, subtext = '') {
  statusPanel.classList.remove('hidden');
  contentPanel.classList.add('hidden');
  errorPanel.classList.add('hidden');
  statusText.textContent = message;

  if (subtext) {
    statusSubtext.textContent = subtext;
    statusSubtext.classList.remove('hidden');
  } else {
    statusSubtext.classList.add('hidden');
  }
}

function showError(message) {
  statusPanel.classList.add('hidden');
  contentPanel.classList.add('hidden');
  errorPanel.classList.remove('hidden');
  errorText.textContent = message;
  hideLoadingBanner();
}

function showContent() {
  statusPanel.classList.add('hidden');
  errorPanel.classList.add('hidden');
  contentPanel.classList.remove('hidden');
}

function showLoadingBanner(message) {
  showActiveLoadBanner(message);
}

function hideLoadingBanner() {
  loadingBanner.classList.add('hidden');
}

function showActiveLoadBanner(message) {
  loadingBannerSpinner.classList.remove('hidden');
  cancelLoadBtn.classList.remove('hidden');
  resumeLoadBtn.classList.add('hidden');
  loadingBannerText.textContent = message;
  loadingBanner.classList.remove('hidden');
}

function showPausedLoadBanner() {
  const loaded = getLoadedClipsCount();
  loadingBannerSpinner.classList.add('hidden');
  cancelLoadBtn.classList.add('hidden');
  resumeLoadBtn.classList.remove('hidden');
  loadingBannerText.textContent = tr('loadPaused', { loaded: formatViews(loaded) });
  loadingBanner.classList.remove('hidden');
}

const TABLE_RENDER_INTERVAL_MS = 600;
const LOAD_PROGRESS_INTERVAL_MS = 400;
function getLoadedClipsCount() {
  if (state.loading) {
    return state.clipsLoadedCount || state.allClips.length;
  }
  return state.allClips.length;
}

function setClipsTotalExpected(total, lock = false) {
  if (total == null || total <= 0) {
    return;
  }

  state.clipsTotalExpected = Math.max(state.clipsTotalExpected || 0, total);
  if (lock) {
    state.clipsTotalLocked = true;
  }
}

function getProgressExpectedCount(loaded) {
  const hint = state.broadcaster?.clipsCount;

  if (state.loading || state.loadCanResume) {
    if (hint && hint > loaded) {
      return Math.max(hint, state.clipsTotalExpected || 0, loaded);
    }
    return Math.max(state.clipsTotalExpected || 0, loaded + CLIPS_PAGE_LIMIT);
  }

  return state.allClips.length;
}

function applyClipsTotalUpdate(apiTotal, loaded, hasMore, pageSize = 50) {
  if (!hasMore) {
    state.clipsTotalExpected = loaded;
    state.clipsTotalLocked = true;
    return;
  }

  if (apiTotal != null && isReliableClipsTotal(apiTotal, loaded)) {
    state.clipsTotalExpected = Math.max(state.clipsTotalExpected || 0, apiTotal);
    return;
  }

  if (state.clipsTotalLocked || !state.loading) {
    return;
  }

  const channelHint = state.broadcaster?.clipsCount;
  if (channelHint && isReliableClipsTotal(channelHint, loaded)) {
    state.clipsTotalExpected = Math.max(state.clipsTotalExpected || 0, channelHint);
    return;
  }

  const floor = loaded + Math.max(pageSize, 1);
  if (state.clipsTotalExpected == null || state.clipsTotalExpected < floor) {
    state.clipsTotalExpected = floor;
  }
}

function rebuildCreatorClipIndex() {
  const index = new Map();

  for (const clip of state.allClips) {
    const slugKey = (clip.creator_slug || '').toLowerCase();
    const idKey = clip.creator_id ? `id:${clip.creator_id}` : '';
    const nameKey = (clip.creator_name || '').toLowerCase();
    const keys = [slugKey, idKey, nameKey].filter(Boolean);

    for (const key of keys) {
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key).push(clip);
    }
  }

  state.creatorClipIndex = index;
}

function scheduleCreatorIndexRebuild() {
  if (state.loadPaused || state.allClips.length > 8000) {
    return;
  }

  if (state.loading && state.allClips.length > 3000) {
    return;
  }

  if (state.creatorIndexTimer) {
    clearTimeout(state.creatorIndexTimer);
  }

  const delay = state.allClips.length > 3000 ? 3000 : 500;

  state.creatorIndexTimer = setTimeout(() => {
    state.creatorIndexTimer = null;

    if (state.loadPaused || state.allClips.length > 8000) {
      return;
    }

    rebuildCreatorClipIndex();
  }, delay);
}

function scheduleDeferredTableRefresh() {
  if (state.deferredRefreshHandle != null) {
    cancelIdleCallback(state.deferredRefreshHandle);
  }

  const runRefresh = () => {
    state.deferredRefreshHandle = null;
    state.heavyWorkInProgress = true;

    try {
      applyFilters();
      renderTable({ paginationOnly: true, skipProfiles: true });
      updateBroadcasterInfo(getLoadedClipsCount());
    } finally {
      state.heavyWorkInProgress = false;
    }
  };

  if (typeof requestIdleCallback === 'function') {
    state.deferredRefreshHandle = requestIdleCallback(runRefresh, { timeout: 800 });
  } else {
    state.deferredRefreshHandle = setTimeout(runRefresh, 0);
  }
}

function getIndexedCreatorClips(creatorId, creatorSlug, creatorName) {
  const slugKey = (creatorSlug || '').toLowerCase();
  const idKey = creatorId ? `id:${creatorId}` : '';
  const nameKey = (creatorName || '').toLowerCase();

  return state.creatorClipIndex.get(slugKey)
    || state.creatorClipIndex.get(idKey)
    || state.creatorClipIndex.get(nameKey)
    || null;
}

function safeRenderTable(options = {}) {
  if (state.clipModalOpen) {
    state.tableRenderPending = true;
    return;
  }

  state.tableRenderPending = false;
  renderTable(options);
}

function buildIdToLoginMap(clips) {
  const map = {};

  for (const clip of clips) {
    if (clip.creator_id && clip.creator_slug) {
      map[clip.creator_id] = clip.creator_slug;
    }
  }

  return map;
}

function getLoadingBannerText() {
  const loaded = getLoadedClipsCount();
  const expected = getProgressExpectedCount(loaded);

  if ((state.loading || state.loadCanResume) && expected > loaded) {
    return tr('loadingRestProgress', {
      loaded: formatViews(loaded),
      expected: formatViews(expected)
    });
  }

  return tr('loadingRest');
}

function updateLoadProgressUi() {
  if (state.loadPaused) {
    return;
  }

  const loaded = getLoadedClipsCount();

  if (state.allClips.length > 5000) {
    const approxTotal = Math.max(loaded, state.filteredClips.length);
    const totalPages = Math.max(1, Math.ceil(approxTotal / PAGE_SIZE));
    updateBroadcasterInfo(loaded);
    updatePaginationControls(approxTotal, totalPages);
    showLoadingBanner(getLoadingBannerText());
    return;
  }

  applyFilters();
  const total = state.filteredClips.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  updateBroadcasterInfo(loaded);
  updatePaginationControls(total, totalPages);
  showLoadingBanner(getLoadingBannerText());
}

function scheduleTableUpdateDuringLoad(progress) {
  if (state.loadPaused) {
    return;
  }

  if (progress.loaded != null) {
    state.clipsLoadedCount = progress.loaded;
  }

  if (progress.clips) {
    replaceAllClips(progress.clips);
    state.clipsLoadedCount = progress.clips.length;
    scheduleCreatorIndexRebuild();
  } else if (progress.newClips?.length) {
    mergeLoadedClips(progress.newClips);
    scheduleCreatorIndexRebuild();
  }

  applyClipsTotalUpdate(
    progress.totalCount,
    progress.loaded ?? getLoadedClipsCount(),
    progress.hasMore !== false,
    progress.pageSize
  );

  const run = () => {
    if (progress.phase === 'partial') {
      showContent();
      showLoadingBanner(getLoadingBannerText());
      renderTable({ paginationOnly: state.allClips.length > 3000, skipProfiles: state.allClips.length > 3000 });
      return;
    }

    if (progress.phase === 'full') {
      showContent();
      updateLoadProgressUi();
    }
  };

  const now = Date.now();
  if (now - state.lastTableRenderAt >= LOAD_PROGRESS_INTERVAL_MS) {
    run();
    state.lastTableRenderAt = now;
    if (state.tableRenderTimer) {
      clearTimeout(state.tableRenderTimer);
      state.tableRenderTimer = null;
    }
    return;
  }

  if (!state.tableRenderTimer) {
    state.tableRenderTimer = setTimeout(() => {
      state.tableRenderTimer = null;
      run();
      state.lastTableRenderAt = Date.now();
    }, LOAD_PROGRESS_INTERVAL_MS - (now - state.lastTableRenderAt));
  }
}

function prefetchAllCreatorProfiles() {
  const visibleStart = (state.currentPage - 1) * PAGE_SIZE;
  const visible = state.filteredClips.slice(visibleStart, visibleStart + PAGE_SIZE);
  const source = visible.length ? visible : state.allClips.slice(0, PAGE_SIZE);

  const ids = [...new Set(source.map((clip) => clip.creator_id).filter(Boolean))];
  const logins = [...new Set(source.map((clip) => clip.creator_slug).filter(Boolean))];
  loadUserProfilesBatch(ids.slice(0, 12), logins.slice(0, 12), source);
}

function formatCreatedAt(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const datePart = date.toLocaleDateString(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timePart = date.toLocaleTimeString(getLocale(), {
    hour: 'numeric',
    minute: '2-digit'
  });

  return `<span class="clip-created"><span class="clip-created-date">${escapeHtml(datePart)}</span><span class="clip-created-time">${escapeHtml(timePart)}</span></span>`;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return tr('minSec', { mins, secs });
  }
  return tr('secOnly', { secs });
}

function formatViews(count) {
  return new Intl.NumberFormat(getLocale()).format(count);
}

function mergeLoadedClips(newClips) {
  if (!newClips?.length || state.loadPaused) {
    return;
  }

  for (const clip of newClips) {
    const key = getClipStorageKey(clip);
    const existingIndex = state.clipKeyIndex.get(key);

    if (existingIndex != null) {
      state.allClips[existingIndex] = clip;
    } else {
      state.clipKeyIndex.set(key, state.allClips.length);
      state.allClips.push(clip);
    }
  }

  state.clipsLoadedCount = state.allClips.length;
  touchClipsData();
}

function filtersNeedRefresh() {
  return state.filtersCacheVersion !== state.clipsDataVersion
    || state.filtersCacheSort !== state.sort
    || state.filtersCacheSearch !== state.search
    || (!state.search.trim() && state.filteredClips.length !== state.allClips.length);
}

function applyFilters() {
  const cacheHit = !filtersNeedRefresh();

  if (!cacheHit) {
    const base = sortClips(state.allClips, state.sort);
    state.filteredClips = filterClips(base, state.search);
    state.filtersCacheVersion = state.clipsDataVersion;
    state.filtersCacheSort = state.sort;
    state.filtersCacheSearch = state.search;
  }

  const totalPages = Math.max(1, Math.ceil(state.filteredClips.length / PAGE_SIZE));
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
}

function updatePaginationControls(total, totalPages) {
  const loaded = getLoadedClipsCount();
  const expected = getProgressExpectedCount(loaded);
  const showProgress = (state.loading || state.loadCanResume) && expected > loaded;

  const pageText = showProgress
    ? tr('pageInfoProgress', {
      page: state.currentPage,
      total: totalPages,
      loaded: formatViews(loaded),
      expected: formatViews(expected),
      clips: pluralizeClips(expected)
    })
    : tr('pageInfo', {
      page: state.currentPage,
      total: totalPages,
      count: formatViews(total),
      clips: pluralizeClips(total)
    });

  pageInfoElements.forEach((element) => {
    element.textContent = pageText;
  });

  prevButtons.forEach((button) => {
    button.disabled = state.currentPage <= 1;
  });

  nextButtons.forEach((button) => {
    button.disabled = state.currentPage >= totalPages;
  });
}

function getCreatorProfile(clip) {
  const key = getProfileKey(clip);
  if (!key) {
    return null;
  }

  return state.userProfiles[key] || null;
}

function renderCreatorCell(clip) {
  const profile = getCreatorProfile(clip);
  const displayName = clip.creator_name || clip.creator_slug || profile?.displayName || '—';
  const isVerified = profile?.isVerified === true || clip.creator_verified === true;

  const verifyMarkup = isVerified
    ? `<img class="verify-icon" src="${VERIFIED_BADGE_URL}" alt="Verified" width="16" height="16">`
    : '';

  return `
    <button
      type="button"
      class="creator-link"
      data-creator-id="${escapeAttr(clip.creator_id || '')}"
      data-creator-slug="${escapeAttr(clip.creator_slug || '')}"
      data-creator-name="${escapeAttr(clip.creator_name || clip.creator_slug || '')}"
    >
      ${verifyMarkup}<span>${escapeHtml(displayName)}</span>
    </button>
  `;
}

async function enrichClipCreator(clip) {
  const enrichKey = clip.id || getProfileKey(clip);
  if (!enrichKey || state.enrichInFlight.has(enrichKey)) {
    return;
  }

  state.enrichInFlight.add(enrichKey);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CLIP_META',
      clipId: clip.id,
      channelSlug: channel,
      broadcasterUserId: state.broadcasterUserId
    });

    if (response?.ok && response.clip) {
      clip.creator_id = response.clip.creator_id || clip.creator_id;
      clip.creator_name = response.clip.creator_name || clip.creator_name;
      clip.creator_slug = response.clip.creator_slug || clip.creator_slug;
      clip.creator_avatar = response.clip.creator_avatar || clip.creator_avatar;
      clip.creator_verified = response.clip.creator_verified ?? clip.creator_verified;
      syncProfilesFromClips([clip]);
    }
  } catch {
    // ignore
  } finally {
    state.enrichInFlight.delete(enrichKey);
  }
}

async function enrichPageClipsCreators(pageClips) {
  const need = pageClips.filter((clip) => (
    !clip._creatorEnriched
    && clipNeedsCreatorEnrichment(clip, state.broadcasterUserId)
  ));

  if (!need.length) {
    return false;
  }

  need.forEach((clip) => {
    clip._creatorEnriched = true;
  });

  await Promise.all(need.slice(0, 12).map((clip) => enrichClipCreator(clip)));
  return true;
}

async function refreshUserProfiles(pageClips, { allowRerender = true } = {}) {
  if (state.loading || state.clipModalOpen || state.heavyWorkInProgress || state.loadPaused) {
    return;
  }

  const changed = await enrichPageClipsCreators(pageClips);

  if (changed && allowRerender) {
    safeRenderTable({ paginationOnly: true });
  }

  const userIds = [...new Set(pageClips.map((clip) => clip.creator_id).filter(Boolean))];
  const userLogins = [...new Set(
    pageClips
      .filter((clip) => clip.creator_slug && !getCreatorProfile(clip)?.avatar)
      .map((clip) => clip.creator_slug)
  )];

  const missingIds = userIds.filter((id) => {
    const clip = pageClips.find((c) => c.creator_id === id);
    const key = clip ? getProfileKey(clip) : `id:${id}`;
    return !state.userProfiles[key]?.avatar && !state.pendingProfileIds.has(key);
  });

  const missingLogins = userLogins.filter((login) => {
    const key = `slug:${login.toLowerCase()}`;
    return !state.userProfiles[key]?.avatar && !state.pendingProfileIds.has(key);
  });

  if (missingIds.length || missingLogins.length) {
    if (state.profileRefreshTimer) {
      clearTimeout(state.profileRefreshTimer);
    }

    state.profileRefreshTimer = setTimeout(() => {
      loadUserProfilesBatch(
        missingIds.slice(0, 12),
        missingLogins.slice(0, 12),
        pageClips
      );
    }, 200);
  }

  if (!state.loading) {
    const missingVerified = pageClips
      .map((clip) => getProfileKey(clip))
      .filter((key) => {
        const profile = state.userProfiles[key];
        return profile && !profile.verifiedChecked && !state.verifiedPending.has(key);
      });

    if (missingVerified.length) {
      queueVerifiedChecks(missingVerified.slice(0, 8));
    }
  }
}

async function loadUserProfilesBatch(userIds, userLogins = [], sourceClips = []) {
  if (state.profileRefreshInFlight || state.clipModalOpen || state.loading) {
    return;
  }

  if (!userIds.length && !userLogins.length) {
    return;
  }

  state.profileRefreshInFlight = true;
  userIds.forEach((id) => state.pendingProfileIds.add(`id:${id}`));
  userLogins.forEach((login) => state.pendingProfileIds.add(`slug:${login.toLowerCase()}`));

  const idToLogin = buildIdToLoginMap(
    sourceClips.length ? sourceClips : state.allClips.slice(0, PAGE_SIZE)
  );

  try {
    const response = await sendRuntimeMessage({
      type: 'GET_USER_PROFILES',
      userIds,
      userLogins,
      channelSlug: channel,
      idToLogin
    }, 25000);

    if (response?.ok && response.profiles) {
      state.userProfiles = { ...state.userProfiles, ...response.profiles };
      safeRenderTable({ paginationOnly: true });

      if (!state.loading && !state.clipModalOpen) {
        const keys = [
          ...userIds.map((id) => `id:${id}`),
          ...userLogins.map((login) => `slug:${login.toLowerCase()}`)
        ];
        queueVerifiedChecks(keys.slice(0, 8));
      }
    }
  } catch {
    // ignore profile lookup errors
  } finally {
    userIds.forEach((id) => state.pendingProfileIds.delete(`id:${id}`));
    userLogins.forEach((login) => state.pendingProfileIds.delete(`slug:${login.toLowerCase()}`));
    state.profileRefreshInFlight = false;
  }
}

function queueVerifiedChecks(profileKeys) {
  if (state.loading || state.clipModalOpen || state.loadPaused) {
    return;
  }

  if (state.verifiedQueueTimer) {
    clearTimeout(state.verifiedQueueTimer);
  }

  state.verifiedQueueTimer = setTimeout(async () => {
    if (state.clipModalOpen || state.loading) {
      return;
    }

    for (const profileKey of profileKeys) {
      const profile = state.userProfiles[profileKey];
      if (!profile || profile.verifiedChecked || state.verifiedPending.has(profileKey)) {
        continue;
      }

      state.verifiedPending.add(profileKey);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_USER_VERIFIED',
          login: profile.login,
          channelSlug: channel
        });

        if (response?.ok) {
          state.userProfiles[profileKey] = {
            ...profile,
            isVerified: response.verified === true,
            verifiedChecked: true
          };
          safeRenderTable({ paginationOnly: true });
          refreshOpenPopoverVerified(profileKey);
        }
      } catch {
        // ignore
      } finally {
        state.verifiedPending.delete(profileKey);
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }, 300);
}

function renderPopoverClipBlock(label, clip) {
  const thumbUrl = getClipThumbUrl(clip, 120, 68);

  return `
    <div class="user-popover-section">
      <div class="user-popover-section-title">${label}</div>
      <button
        type="button"
        class="user-popover-clip-btn"
        data-clip-id="${escapeAttr(clip.id)}"
        data-clip-title="${escapeAttr(clip.title || tr('clipUntitled'))}"
        data-clip-url="${escapeAttr(clip.url)}"
        data-clip-video="${escapeAttr(clip.video_url || '')}"
      >
        <img class="user-popover-clip-thumb" src="${thumbUrl}" alt="" width="120" height="68">
        <div class="user-popover-clip-meta">
          <span class="user-popover-clip-title">${escapeHtml(clip.title || tr('clipUntitled'))}</span>
          <span class="user-popover-clip-info">${tr('viewsOnClip', {
            count: formatViews(clip.view_count),
            date: formatLongDate(clip.created_at, getLocale())
          })}</span>
        </div>
      </button>
    </div>
  `;
}

function positionUserPopover(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const popoverWidth = 360;
  let left = rect.left;
  let top = rect.bottom + 8;

  if (left + popoverWidth > window.innerWidth - 12) {
    left = window.innerWidth - popoverWidth - 12;
  }

  const popoverHeight = userPopover.offsetHeight;
  if (top + popoverHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - popoverHeight - 8);
  }

  userPopover.style.top = `${Math.max(12, top)}px`;
  userPopover.style.left = `${Math.max(12, left)}px`;
}

function openUserPopover(creatorId, creatorSlug, creatorName, anchorEl) {
  const clipLike = { creator_id: creatorId, creator_slug: creatorSlug, creator_name: creatorName };
  const profileKey = getProfileKey(clipLike);
  const profile = profileKey ? state.userProfiles[profileKey] : null;
  const indexedClips = getIndexedCreatorClips(creatorId, creatorSlug, creatorName);
  const stats = getCreatorStats(
    indexedClips || state.allClips,
    creatorId,
    creatorName,
    profile,
    creatorSlug
  );

  if (!stats) {
    return;
  }

  const displayName = creatorName || creatorSlug || profile?.displayName || stats.creatorName;
  const isVerified = profile?.isVerified === true;

  if (profile?.avatar) {
    userPopoverAvatar.src = profile.avatar;
    userPopoverAvatar.classList.remove('hidden');
  } else {
    userPopoverAvatar.removeAttribute('src');
    userPopoverAvatar.classList.add('hidden');
  }

  const verifyMarkup = isVerified
    ? `<img class="verify-icon" src="${VERIFIED_BADGE_URL}" alt="Verified" width="16" height="16">`
    : '';

  userPopoverTitle.innerHTML = `${verifyMarkup}<span>${escapeHtml(displayName)}</span>`;
  userPopoverSubtitle.textContent = '';
  userPopoverSubtitle.classList.add('hidden');
  userPopoverBody.innerHTML = `
    <p class="user-popover-count"><strong>${tr('clipCount')}</strong> ${stats.clipCount}</p>
    ${renderPopoverClipBlock(tr('topClip'), stats.topClip)}
    ${renderPopoverClipBlock(tr('lastClip'), stats.lastClip)}
  `;

  userPopoverBody.querySelectorAll('.user-popover-clip-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openClipModal(
        button.dataset.clipId,
        button.dataset.clipTitle,
        button.dataset.clipUrl,
        button.dataset.clipVideo
      );
    });
  });

  if (profileKey && profile && !profile.verifiedChecked && !state.clipModalOpen) {
    queueVerifiedChecks([profileKey]);
  }

  if (profileKey && !profile?.avatar && !state.clipModalOpen && !state.loading) {
    const sampleClips = indexedClips || state.allClips.slice(0, PAGE_SIZE);
    loadUserProfilesBatch(
      creatorId ? [creatorId] : [],
      creatorSlug ? [creatorSlug] : [],
      sampleClips
    );
  }

  state.openPopoverCreatorId = profileKey || null;
  userPopover.classList.remove('hidden');
  requestAnimationFrame(() => positionUserPopover(anchorEl));
}

function closeUserPopover() {
  userPopover.classList.add('hidden');
  userPopoverBody.innerHTML = '';
  state.openPopoverCreatorId = null;
}

function refreshOpenPopoverVerified(profileKey) {
  if (userPopover.classList.contains('hidden') || profileKey !== state.openPopoverCreatorId) {
    return;
  }

  const profile = state.userProfiles[profileKey];
  if (!profile) {
    return;
  }

  const verifyMarkup = profile.isVerified === true
    ? `<img class="verify-icon" src="${VERIFIED_BADGE_URL}" alt="Verified" width="16" height="16">`
    : '';

  const nameSpan = userPopoverTitle.querySelector('span');
  const displayName = nameSpan?.textContent || profile.displayName || profile.login || '—';
  userPopoverTitle.innerHTML = `${verifyMarkup}<span>${escapeHtml(displayName)}</span>`;
}

function renderTable({ paginationOnly = false, skipProfiles = false } = {}) {
  if (!paginationOnly || filtersNeedRefresh()) {
    applyFilters();
  }

  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageClipsPreview = state.filteredClips.slice(start, start + PAGE_SIZE);
  syncProfilesFromClips(pageClipsPreview);

  const total = state.filteredClips.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageClips = pageClipsPreview;

  clipsBody.innerHTML = '';

  if (pageClips.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  pageClips.forEach((clip, index) => {
    const row = document.createElement('tr');
    const globalIndex = start + index + 1;
    const thumbUrl = clip.thumbnail_url || '';

    row.innerHTML = `
      <td class="col-num">${globalIndex}</td>
      <td class="col-creator">${renderCreatorCell(clip)}</td>
      <td class="col-clip">
        <div class="clip-cell">
          <button
            type="button"
            class="clip-thumb-btn"
            data-clip-id="${escapeAttr(clip.id)}"
            data-clip-title="${escapeAttr(clip.title || tr('clipUntitled'))}"
            data-clip-url="${escapeAttr(clip.url)}"
            data-clip-video="${escapeAttr(clip.video_url || '')}"
            aria-label="${escapeAttr(tr('watchClip'))}"
          >
            <img class="clip-thumb" src="${thumbUrl}" alt="" loading="lazy" width="80" height="45">
          </button>
          <a class="clip-title-link" href="${clip.url}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(clip.title || tr('clipUntitled'))}
          </a>
        </div>
      </td>
      <td class="col-date">${formatCreatedAt(clip.created_at)}</td>
      <td class="col-views">${formatViews(clip.view_count)}</td>
      <td class="col-duration">${formatDuration(clip.duration)}</td>
    `;

    clipsBody.appendChild(row);
  });

  clipsBody.querySelectorAll('.clip-thumb-btn').forEach((button) => {
    button.addEventListener('click', () => {
      openClipModal(
        button.dataset.clipId,
        button.dataset.clipTitle,
        button.dataset.clipUrl,
        button.dataset.clipVideo
      );
    });
  });

  clipsBody.querySelectorAll('.creator-link').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openUserPopover(
        button.dataset.creatorId,
        button.dataset.creatorSlug,
        button.dataset.creatorName,
        button
      );
    });
  });

  updatePaginationControls(total, totalPages);

  if (!skipProfiles) {
    refreshUserProfiles(pageClips, { allowRerender: false });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}

function updateBroadcasterInfo(loadedCount) {
  if (!state.broadcaster) {
    return;
  }

  const expected = getProgressExpectedCount(loadedCount);
  const showProgress = (state.loading || state.loadCanResume) && expected > loadedCount;

  if (showProgress) {
    channelSubtitle.textContent = tr('channelTotalProgress', {
      login: state.broadcaster.login,
      loaded: formatViews(loadedCount),
      expected: formatViews(expected),
      clips: pluralizeClips(expected)
    });
  } else {
    channelSubtitle.textContent = tr('channelTotal', {
      login: state.broadcaster.login,
      count: formatViews(loadedCount),
      clips: pluralizeClips(loadedCount)
    });
  }

  if (state.broadcaster.profileImage) {
    channelAvatar.src = state.broadcaster.profileImage;
    channelAvatar.alt = state.broadcaster.displayName;
    channelAvatar.classList.remove('hidden');
  }
}

function goToPage(delta) {
  if (state.heavyWorkInProgress || state.pageNavScheduled) {
    return;
  }

  if (filtersNeedRefresh()) {
    applyFilters();
  }

  const totalPages = Math.max(1, Math.ceil(state.filteredClips.length / PAGE_SIZE));
  const nextPage = state.currentPage + delta;

  if (nextPage < 1 || nextPage > totalPages) {
    return;
  }

  state.currentPage = nextPage;
  state.pageNavScheduled = true;

  requestAnimationFrame(() => {
    state.pageNavScheduled = false;
    renderTable({ paginationOnly: true });
  });
}

function setSort(value) {
  state.sort = value;
  state.currentPage = 1;
  sortValue.textContent = tr(SORT_KEYS[value]);

  sortOptions.forEach((option) => {
    const selected = option.dataset.value === value;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-selected', selected ? 'true' : 'false');
  });

  closeSortMenu();
  renderTable();
}

function openSortMenu() {
  sortMenu.classList.remove('hidden');
  sortSelect.classList.add('open');
  sortTrigger.setAttribute('aria-expanded', 'true');
}

function closeSortMenu() {
  sortMenu.classList.add('hidden');
  sortSelect.classList.remove('open');
  sortTrigger.setAttribute('aria-expanded', 'false');
}

function openSettingsModal() {
  updateSettingsLangButtons();
  loadSettingsAnalyticsToggle();
  settingsModal.classList.remove('hidden');
}

async function loadSettingsAnalyticsToggle() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  if (settingsAnalyticsToggle) {
    settingsAnalyticsToggle.checked = response?.analyticsEnabled === true;
  }
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

function updateSettingsLangButtons() {
  const current = getLanguage();
  settingsLangButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.lang === current);
  });
}

async function applyLanguageChange(lang) {
  if (!lang || lang === getLanguage()) {
    updateSettingsLangButtons();
    return;
  }

  await setLanguage(lang);
  trackAnalytics('lc');
  trackAnalytics('sc');
  refreshAllTranslations();
}

function refreshAllTranslations() {
  applyPageTranslations();

  if (channel) {
    pageTitle.textContent = tr('pageClipsNamed', { channel });
    document.title = tr('pageTitleNamed', { channel });
  }

  if (!statusPanel.classList.contains('hidden') && channel) {
    statusText.textContent = tr('loadingClipsChannel', { channel });
    if (!statusSubtext.classList.contains('hidden')) {
      statusSubtext.textContent = tr('loadingClipsHint');
    }
  }

  if (state.broadcaster) {
    updateBroadcasterInfo(state.allClips.length);
  }

  if (state.loading || state.loadCanResume) {
    if (state.loadCanResume && !state.loading) {
      loadingBannerText.textContent = tr('loadPaused', {
        loaded: formatViews(state.allClips.length)
      });
    } else {
      loadingBannerText.textContent = getLoadingBannerText();
    }
  }

  if (!contentPanel.classList.contains('hidden')) {
    renderTable();
  }
}

function openChannelModal() {
  hideChannelModalError();
  channelModalInput.value = channel;
  channelModal.classList.remove('hidden');
  channelModalInput.focus();
  channelModalInput.select();
}

function closeChannelModal() {
  channelModal.classList.add('hidden');
  hideChannelModalError();
}

function showConfirmDialog(message, onConfirm, okLabel = tr('confirmStop')) {
  confirmModalText.textContent = message;
  confirmModalOk.textContent = okLabel;
  state.confirmCallback = onConfirm;
  confirmModal.classList.remove('hidden');
}

function closeConfirmDialog() {
  confirmModal.classList.add('hidden');
  state.confirmCallback = null;
}

function sanitizeFilename(title, clipId) {
  const base = String(title || clipId || 'clip')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120);

  return base || String(clipId || 'clip');
}

function setClipDownloadEnabled(enabled) {
  clipDownloadBtn.disabled = !enabled || state.clipDownloadInFlight;
}

async function downloadCurrentClip() {
  const source = state.clipSources[0];
  if (!source || state.clipDownloadInFlight) {
    return;
  }

  state.clipDownloadInFlight = true;
  setClipDownloadEnabled(false);
  clipDownloadBtn.textContent = tr('downloading');

  try {
    const blob = await downloadHlsAsBlob(source.url);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${sanitizeFilename(state.currentClipTitle, state.currentClipId)}.ts`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    clipDownloadBtn.textContent = error.message || 'Error';
    setTimeout(() => {
      clipDownloadBtn.textContent = tr('download');
    }, 2000);
  } finally {
    state.clipDownloadInFlight = false;
    setClipDownloadEnabled(state.clipSources.length > 0);
    if (state.clipDownloadInFlight) {
      clipDownloadBtn.textContent = tr('download');
    }
  }
}

function sanitizeChannelInput(input) {
  applyChannelInputSanitize(input);
}

function showChannelModalError(message) {
  channelModalError.textContent = message;
  channelModalError.classList.remove('hidden');
}

function hideChannelModalError() {
  channelModalError.classList.add('hidden');
  channelModalError.textContent = '';
}

async function submitChannelChange() {
  hideChannelModalError();
  const normalized = normalizeChannel(channelModalInput.value);

  if (!normalized) {
    showChannelModalError(tr('channelRequired'));
    channelModalInput.focus();
    return;
  }

  if (normalized === channel) {
    closeChannelModal();
    return;
  }

  channelModalSubmit.disabled = true;
  showChannelModalError(tr('channelValidating'));

  try {
    const response = await checkChannelOnKick(normalized);

    if (!response?.ok) {
      showChannelModalError(response?.error || tr('channelNotFound', { channel: normalized }));
      channelModalInput.focus();
      return;
    }

    trackChannelAnalytics(normalized);
    window.location.href = chrome.runtime.getURL(
      `pages/tracking.html?channel=${encodeURIComponent(normalized)}`
    );
  } finally {
    channelModalSubmit.disabled = false;
  }
}

function destroyHlsPlayer() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
}

async function loadClipVideo(source, loadGeneration) {
  if (loadGeneration !== state.clipLoadGeneration) {
    throw new Error(LOAD_CANCELLED);
  }

  destroyHlsPlayer();
  clipPlayer.pause();
  clipPlayer.currentTime = 0;
  clipPlayer.removeAttribute('src');
  clipPlayer.load();

  if (source.type === 'hls') {
    if (!window.Hls?.isSupported()) {
      throw new Error(tr('hlsUnsupported'));
    }

    await Promise.race([
      new Promise((resolve, reject) => {
        hlsInstance = new window.Hls({
          enableWorker: true,
          maxBufferLength: 20,
          maxMaxBufferLength: 40
        });

        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
          populateQualitySelectFromHls(hlsInstance);
          resolve();
        });

        hlsInstance.on(window.Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            reject(new Error(tr('playError')));
          }
        });

        hlsInstance.loadSource(source.url);
        hlsInstance.attachMedia(clipPlayer);
      }),
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error(tr('playError'))), 20000);
      })
    ]);

    if (loadGeneration !== state.clipLoadGeneration) {
      throw new Error(LOAD_CANCELLED);
    }

    await clipPlayer.play();

    if (loadGeneration !== state.clipLoadGeneration) {
      clipPlayer.pause();
      clipPlayer.currentTime = 0;
      throw new Error(LOAD_CANCELLED);
    }

    return;
  }

  state.clipFetchController?.abort();
  state.clipFetchController = new AbortController();

  try {
    const response = await fetch(source.url, {
      signal: state.clipFetchController.signal
    });

    if (loadGeneration !== state.clipLoadGeneration) {
      throw new Error(LOAD_CANCELLED);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();

    if (loadGeneration !== state.clipLoadGeneration) {
      throw new Error(LOAD_CANCELLED);
    }

    if (!blob.size) {
      throw new Error('Empty response');
    }

    if (state.currentBlobUrl) {
      URL.revokeObjectURL(state.currentBlobUrl);
    }

    state.currentBlobUrl = URL.createObjectURL(blob);
    clipPlayer.src = state.currentBlobUrl;
    await clipPlayer.play();
  } catch (error) {
    if (error.name === 'AbortError' || loadGeneration !== state.clipLoadGeneration) {
      throw new Error(LOAD_CANCELLED);
    }
    throw error;
  } finally {
    state.clipFetchController = null;
  }
}

const clipQualityLabel = document.querySelector('label[for="clip-quality-select"]');

function setQualitySelectVisible(visible) {
  clipQualitySelect.classList.toggle('hidden', !visible);
  if (clipQualityLabel) {
    clipQualityLabel.classList.toggle('hidden', !visible);
  }
}

function populateQualitySelect(sources) {
  clipQualitySelect.innerHTML = '';

  sources.forEach((source, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = source.label || `${source.quality}p`;
    clipQualitySelect.appendChild(option);
  });

  setQualitySelectVisible(sources.length > 0);
  if (sources.length) {
    clipQualitySelect.value = '0';
  }
}

function populateQualitySelectFromHls(hls) {
  if (!hls?.levels?.length) {
    return false;
  }

  clipQualitySelect.innerHTML = '';

  hls.levels.forEach((level, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = level.height ? `${level.height}p` : `Quality ${index + 1}`;
    clipQualitySelect.appendChild(option);
  });

  setQualitySelectVisible(true);
  const currentLevel = hls.currentLevel >= 0 ? hls.currentLevel : hls.levels.length - 1;
  clipQualitySelect.value = String(currentLevel);
  return true;
}

async function playClipSource(sourceIndex) {
  const source = state.clipSources[sourceIndex];
  if (!source) {
    return;
  }

  const loadGeneration = state.clipLoadGeneration;

  clipPlayer.classList.add('hidden');
  clipPlayerError.classList.add('hidden');
  clipPlayerLoading.classList.remove('hidden');
  clipPlayerLoading.textContent = tr('loadingClip');
  clipPlayer.pause();
  clipPlayer.currentTime = 0;
  clipPlayer.removeAttribute('src');
  clipPlayer.load();

  if (state.clipSources.length > 1) {
    clipQualitySelect.value = String(sourceIndex);
  }

  try {
    await loadClipVideo(source, loadGeneration);

    if (loadGeneration !== state.clipLoadGeneration) {
      return;
    }

    clipPlayer.classList.remove('hidden');
    clipPlayerLoading.classList.add('hidden');
  } catch (error) {
    if (loadGeneration !== state.clipLoadGeneration || error.message === LOAD_CANCELLED) {
      return;
    }

    clipPlayerLoading.classList.add('hidden');
    clipPlayerError.textContent = error.message || tr('playError');
    clipPlayerError.classList.remove('hidden');
  }
}

async function openClipModal(clipId, title, clipUrl, videoUrl = '') {
  if (state.profileRefreshTimer) {
    clearTimeout(state.profileRefreshTimer);
    state.profileRefreshTimer = null;
  }

  if (state.verifiedQueueTimer) {
    clearTimeout(state.verifiedQueueTimer);
    state.verifiedQueueTimer = null;
  }

  state.clipModalOpen = true;
  state.clipLoadGeneration += 1;
  const loadGeneration = state.clipLoadGeneration;
  state.currentClipVideoUrl = videoUrl || '';

  clipModalTitle.textContent = title || tr('clipUntitled');
  clipModal.classList.remove('hidden');
  clipPlayer.classList.add('hidden');
  clipPlayerError.classList.add('hidden');
  clipOpenLink.classList.add('hidden');
  clipPlayerLoading.classList.remove('hidden');
  clipPlayerLoading.textContent = tr('loadingClip');
  clipPlayer.pause();
  clipPlayer.currentTime = 0;
  clipPlayer.removeAttribute('src');
  clipPlayer.load();
  clipQualitySelect.innerHTML = '';
  setQualitySelectVisible(false);
  state.clipSources = [];
  state.currentClipId = clipId || '';
  state.currentClipTitle = title || tr('clipUntitled');
  setClipDownloadEnabled(false);

  if (clipUrl) {
    clipOpenLink.href = clipUrl;
    clipOpenLink.classList.remove('hidden');
  }

  try {
    const response = await sendRuntimeMessage({
      type: 'GET_CLIP_SOURCES',
      clipId,
      videoUrl: state.currentClipVideoUrl
    }, 35000);

    if (loadGeneration !== state.clipLoadGeneration) {
      return;
    }

    if (!response?.ok || !response.sources?.length) {
      throw new Error(response?.error || tr('loadClipError'));
    }

    state.clipSources = response.sources;
    populateQualitySelect(state.clipSources);
    setClipDownloadEnabled(true);
    await playClipSource(0);
  } catch (error) {
    if (loadGeneration !== state.clipLoadGeneration || error.message === LOAD_CANCELLED) {
      return;
    }

    clipPlayerLoading.classList.add('hidden');
    clipPlayerError.textContent = error.message || tr('playError');
    clipPlayerError.classList.remove('hidden');
  }
}

function closeClipModal() {
  state.clipModalOpen = false;
  state.clipLoadGeneration += 1;
  state.clipFetchController?.abort();
  state.clipFetchController = null;
  destroyHlsPlayer();

  clipModal.classList.add('hidden');
  clipPlayer.pause();
  clipPlayer.currentTime = 0;
  clipPlayer.removeAttribute('src');
  clipPlayer.load();
  clipPlayer.classList.add('hidden');
  clipPlayerLoading.classList.add('hidden');
  clipPlayerError.classList.add('hidden');
  clipOpenLink.classList.add('hidden');
  clipQualitySelect.innerHTML = '';
  setQualitySelectVisible(false);
  state.clipSources = [];
  state.currentClipId = '';
  state.currentClipTitle = '';
  setClipDownloadEnabled(false);
  clipDownloadBtn.textContent = tr('download');

  if (state.currentBlobUrl) {
    URL.revokeObjectURL(state.currentBlobUrl);
    state.currentBlobUrl = null;
  }

  if (state.tableRenderPending && !state.loading) {
    state.tableRenderPending = false;
    renderTable();
  }
}

function handleClipLoadProgress(progress, context) {
  if (progress.phase === 'partial' && !context.shownPartial) {
    context.shownPartial = true;
    scheduleTableUpdateDuringLoad(progress);
    return;
  }

  if (progress.phase === 'full') {
    scheduleTableUpdateDuringLoad(progress);
    return;
  }

  if (progress.phase === 'cancelled') {
    state.loadPaused = true;
    clearLoadProgressTimers();

    if (progress.clips) {
      replaceAllClips(progress.clips);
    }

    state.clipsLoadedCount = state.allClips.length;
    state.loadCanResume = Boolean(progress.hasMore && progress.nextCursor != null);
    state.resumeCursor = state.loadCanResume ? progress.nextCursor : null;

    if (state.loadCanResume) {
      state.clipsTotalLocked = false;
      const hint = state.broadcaster?.clipsCount;
      const loaded = state.allClips.length;

      if (hint && hint > loaded) {
        state.clipsTotalExpected = Math.max(state.clipsTotalExpected || 0, hint);
      } else {
        state.clipsTotalExpected = Math.max(
          state.clipsTotalExpected || 0,
          loaded + CLIPS_PAGE_LIMIT
        );
      }
    } else {
      applyClipsTotalUpdate(
        progress.totalCount,
        progress.loaded ?? state.allClips.length,
        false,
        progress.pageSize
      );
    }

    showContent();
    updateBroadcasterInfo(state.allClips.length);

    if (state.loadCanResume) {
      showPausedLoadBanner();
    } else {
      hideLoadingBanner();
    }

    scheduleDeferredTableRefresh();
  }
}

async function runClipLoad({ forceRefresh = false, resume = false } = {}) {
  if (!channel) {
    showError(tr('noChannelInUrl'));
    return;
  }

  if (state.loading) {
    return;
  }

  state.loadAbortController?.abort();
  state.loadAbortController = new AbortController();
  const loadSignal = state.loadAbortController.signal;

  state.loading = true;
  state.loadPaused = false;

  if (!resume) {
    state.loadCanResume = false;
    state.resumeCursor = null;
    state.clipsTotalExpected = null;
    state.clipsTotalLocked = false;
    state.clipsLoadedCount = 0;
    showStatus(
      tr('loadingClipsChannel', { channel }),
      tr('loadingClipsHint')
    );
    pageTitle.textContent = tr('pageClipsNamed', { channel });
    document.title = tr('pageTitleNamed', { channel });
    hideLoadingBanner();
  } else {
    state.clipsTotalLocked = false;
    const loaded = state.allClips.length;
    const hint = state.broadcaster?.clipsCount;

    if (hint && hint > loaded) {
      state.clipsTotalExpected = Math.max(state.clipsTotalExpected || 0, hint);
    }

    showContent();
    showActiveLoadBanner(getLoadingBannerText());
  }

  const loadContext = { shownPartial: resume && state.allClips.length > 0 };
  const resumeKnownTotal = (() => {
    const loaded = state.allClips.length;
    const hint = state.broadcaster?.clipsCount;

    if (hint && hint > loaded) {
      return hint;
    }

    return null;
  })();
  const loadOptions = resume
    ? {
      initialClips: state.allClips,
      startCursor: state.resumeCursor,
      knownTotalCount: resumeKnownTotal
    }
    : {};

  try {
    if (!resume) {
      const cacheResponse = await chrome.runtime.sendMessage({
        type: 'GET_CACHED_CLIPS',
        channel,
        forceRefresh
      });

      if (cacheResponse?.cached) {
        replaceAllClips(cacheResponse.clips);
        state.broadcaster = cacheResponse.broadcaster;
        state.broadcasterUserId = cacheResponse.broadcaster?.userId || '';
        setClipsTotalExpected(cacheResponse.total ?? cacheResponse.clips?.length ?? null, true);
        state.currentPage = 1;
        updateBroadcasterInfo(state.allClips.length);
        showContent();
        scheduleCreatorIndexRebuild();
        renderTable();
        return;
      }

      const broadcasterResponse = await chrome.runtime.sendMessage({
        type: 'GET_CHANNEL',
        login: channel
      });

      if (!broadcasterResponse?.ok) {
        throw new Error(broadcasterResponse?.error || tr('loadError'));
      }

      state.broadcaster = broadcasterResponse.broadcaster;
      state.broadcasterUserId = broadcasterResponse.broadcaster.userId || '';
      state.clipsTotalExpected = broadcasterResponse.broadcaster.clipsCount || null;
      state.clipsTotalLocked = false;
      replaceAllClips([]);
      state.currentPage = 1;
      showContent();
      updateBroadcasterInfo(0);
      updatePaginationControls(0, 1);
      showLoadingBanner(getLoadingBannerText());
      loadContext.shownPartial = false;
    }

    const clips = await loadAllClips(
      channel,
      fetchChannelClipsPage,
      (progress) => handleClipLoadProgress(progress, loadContext),
      loadSignal,
      loadOptions
    );

    if (loadSignal.aborted) {
      return;
    }

    replaceAllClips(clips);
    state.clipsLoadedCount = clips.length;
    state.clipsTotalExpected = clips.length;
    state.clipsTotalLocked = true;
    state.loadCanResume = false;
    state.resumeCursor = null;
    scheduleCreatorIndexRebuild();
    updateBroadcasterInfo(clips.length);

    await chrome.runtime.sendMessage({
      type: 'SAVE_CLIPS_CACHE',
      channel,
      payload: {
        channel: normalizeChannel(channel),
        broadcaster: state.broadcaster,
        clips,
        total: clips.length
      }
    });

    clearLoadProgressTimers();
    hideLoadingBanner();
    showContent();
    renderTable();
    prefetchAllCreatorProfiles();
  } catch (error) {
    if (loadSignal.aborted) {
      return;
    }
    showError(error.message || tr('loadError'));
  } finally {
    state.loading = false;
    state.loadAbortController = null;
  }
}

async function loadClips(forceRefresh = false) {
  await runClipLoad({ forceRefresh, resume: false });
}

function waitForLoadToFinish(timeoutMs = 90000) {
  return new Promise((resolve) => {
    const started = Date.now();

    (function poll() {
      if (!state.loading) {
        resolve();
        return;
      }

      if (Date.now() - started > timeoutMs) {
        state.loading = false;
        resolve();
        return;
      }

      setTimeout(poll, 50);
    })();
  });
}

async function resumeClipLoading() {
  if (!state.loadCanResume || state.resumeCursor == null) {
    return;
  }

  if (state.loading) {
    state.loadAbortController?.abort();
    await waitForLoadToFinish();
  }

  if (!state.loadCanResume || state.resumeCursor == null) {
    return;
  }

  try {
    await runClipLoad({ resume: true });
  } catch (error) {
    showError(error.message || tr('loadError'));
  }
}

function cancelClipLoading() {
  if (!state.loadAbortController || loadSignalAborted()) {
    return;
  }

  showConfirmDialog(
    tr('cancelLoadConfirm'),
    () => {
      state.loadPaused = true;
      clearLoadProgressTimers();
      state.loadAbortController?.abort();
    }
  );
}

function loadSignalAborted() {
  return state.loadAbortController?.signal.aborted === true;
}

function initPopoverDrag() {
  userPopoverHeader.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || event.target.closest('#user-popover-close')) {
      return;
    }

    event.preventDefault();

    const rect = userPopover.getBoundingClientRect();
    state.popoverDrag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    userPopover.classList.add('dragging');
  });
}

function handlePopoverDragMove(event) {
  if (!state.popoverDrag) {
    return;
  }

  const maxLeft = window.innerWidth - userPopover.offsetWidth - 12;
  const maxTop = window.innerHeight - userPopover.offsetHeight - 12;
  const left = Math.max(12, Math.min(event.clientX - state.popoverDrag.offsetX, maxLeft));
  const top = Math.max(12, Math.min(event.clientY - state.popoverDrag.offsetY, maxTop));

  userPopover.style.left = `${left}px`;
  userPopover.style.top = `${top}px`;
}

function handlePopoverDragEnd() {
  if (!state.popoverDrag) {
    return;
  }

  state.popoverDrag = null;
  userPopover.classList.remove('dragging');
}

prevButtons.forEach((button) => {
  button.addEventListener('click', () => goToPage(-1));
});

nextButtons.forEach((button) => {
  button.addEventListener('click', () => goToPage(1));
});

searchInput.addEventListener('input', () => {
  state.search = searchInput.value;
  state.currentPage = 1;
  renderTable();
});

sortTrigger.addEventListener('click', (event) => {
  event.stopPropagation();
  if (sortSelect.classList.contains('open')) {
    closeSortMenu();
  } else {
    openSortMenu();
  }
});

sortOptions.forEach((option) => {
  option.addEventListener('click', (event) => {
    event.stopPropagation();
    setSort(option.dataset.value);
  });
});

document.addEventListener('click', (event) => {
  if (!sortSelect.contains(event.target)) {
    closeSortMenu();
  }

  if (userPopover.classList.contains('hidden')) {
    return;
  }

  if (userPopover.contains(event.target) || event.target.closest('.creator-link')) {
    return;
  }

  if (!clipModal.classList.contains('hidden') && clipModal.contains(event.target)) {
    return;
  }

  closeUserPopover();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (!clipModal.classList.contains('hidden')) {
    closeClipModal();
    return;
  }

  if (!userPopover.classList.contains('hidden')) {
    closeUserPopover();
    return;
  }

  closeConfirmDialog();
  closeSortMenu();
  closeSettingsModal();
  closeChannelModal();
});

refreshBtn.addEventListener('click', () => {
  trackAnalytics('rf');
  loadClips(true);
});

settingsBtn.addEventListener('click', openSettingsModal);
settingsModalClose.addEventListener('click', closeSettingsModal);
settingsModal.querySelector('[data-close-settings]').addEventListener('click', closeSettingsModal);

if (settingsLearnMoreBtn) {
  settingsLearnMoreBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/transparency.html') });
  });
}

if (settingsAnalyticsToggle) {
  settingsAnalyticsToggle.addEventListener('change', async () => {
    const enabled = settingsAnalyticsToggle.checked;
    await chrome.runtime.sendMessage({
      type: 'ANALYTICS_SET_ENABLED',
      enabled
    });
    trackAnalytics('sc');
  });
}

settingsChangeChannelBtn.addEventListener('click', () => {
  closeSettingsModal();
  openChannelModal();
});

settingsLangButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyLanguageChange(button.dataset.lang).catch(() => {});
  });
});

channelModalCancel.addEventListener('click', closeChannelModal);
channelModal.querySelector('[data-close-modal]').addEventListener('click', closeChannelModal);

channelModalSubmit.addEventListener('click', () => {
  submitChannelChange().catch(() => {});
});

channelModalInput.addEventListener('paste', (event) => {
  const text = event.clipboardData?.getData('text') || '';

  if (applyChannelPaste(channelModalInput, text)) {
    event.preventDefault();
    hideChannelModalError();
  }
});

channelModalInput.addEventListener('input', () => {
  sanitizeChannelInput(channelModalInput);
  hideChannelModalError();
});

channelModalInput.addEventListener('blur', () => {
  finalizeChannelInput(channelModalInput);
});

channelModalInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitChannelChange().catch(() => {});
  }
});

clipQualitySelect.addEventListener('change', () => {
  const sourceIndex = Number(clipQualitySelect.value);
  if (Number.isNaN(sourceIndex)) {
    return;
  }

  if (hlsInstance?.levels?.length > 1) {
    hlsInstance.currentLevel = sourceIndex;
    return;
  }

  state.clipLoadGeneration += 1;
  playClipSource(sourceIndex);
});

cancelLoadBtn.addEventListener('click', cancelClipLoading);
resumeLoadBtn.addEventListener('click', () => {
  resumeClipLoading();
});

confirmModalCancel.addEventListener('click', closeConfirmDialog);
confirmModal.querySelector('[data-close-confirm]').addEventListener('click', closeConfirmDialog);
confirmModalOk.addEventListener('click', () => {
  const callback = state.confirmCallback;
  closeConfirmDialog();
  callback?.();
});

clipDownloadBtn.addEventListener('click', downloadCurrentClip);

clipModalClose.addEventListener('click', closeClipModal);
clipModal.querySelector('[data-close-clip]').addEventListener('click', closeClipModal);

userPopoverClose.addEventListener('click', closeUserPopover);

openSettingsBtn.addEventListener('click', () => {
  window.open('https://kick.com', '_blank', 'noopener,noreferrer');
});

initPopoverDrag();
document.addEventListener('mousemove', handlePopoverDragMove);
document.addEventListener('mouseup', handlePopoverDragEnd);

function applyPageTranslations() {
  document.documentElement.lang = getLanguage();
  pageTitle.textContent = tr('pageClips');
  settingsBtn.textContent = tr('settings');
  refreshBtn.textContent = tr('refresh');
  statusText.textContent = tr('loadingClips');
  searchInput.placeholder = tr('searchPlaceholder');
  emptyState.textContent = tr('emptyClips');
  openSettingsBtn.textContent = tr('openKick');
  document.getElementById('settings-modal-title').textContent = tr('settings');
  document.getElementById('settings-language-label').textContent = tr('language');
  document.getElementById('settings-analytics-label').textContent = tr('analyticsLabel');
  if (settingsLearnMoreBtn) {
    settingsLearnMoreBtn.textContent = tr('analyticsLearnMore');
  }
  document.getElementById('settings-transparency-link').textContent = tr('transparencyReport');
  document.getElementById('settings-privacy-link').textContent = tr('privacyPolicy');
  settingsChangeChannelBtn.textContent = tr('changeChannel');
  settingsModalClose.textContent = tr('close');
  updateSettingsLangButtons();
  document.getElementById('channel-modal-title').textContent = tr('changeChannelTitle');
  const channelModalLabel = document.getElementById('channel-modal-label');
  if (channelModalLabel) {
    channelModalLabel.textContent = tr('channelLabel');
  }
  channelModalInput.placeholder = tr('channelModalPlaceholder');
  channelModalCancel.textContent = tr('cancel');
  channelModalSubmit.textContent = tr('open');
  document.getElementById('confirm-modal-title').textContent = tr('confirmTitle');
  confirmModalCancel.textContent = tr('cancel');
  document.querySelector('label[for="clip-quality-select"]').textContent = tr('quality');
  clipDownloadBtn.textContent = tr('download');
  clipOpenLink.textContent = tr('openOnKick');
  clipModalClose.setAttribute('aria-label', tr('close'));
  userPopoverClose.setAttribute('aria-label', tr('close'));
  userPopoverHeader.title = tr('dragPopover');
  cancelLoadBtn.textContent = tr('cancel');
  resumeLoadBtn.textContent = tr('resumeLoadClips');
  loadingBannerText.textContent = tr('loadingRest');

  prevButtons.forEach((button) => {
    button.textContent = tr('back');
  });
  nextButtons.forEach((button) => {
    button.textContent = tr('forward');
  });

  const headers = document.querySelectorAll('.clips-table thead th');
  const headerKeys = ['colNum', 'colCreator', 'colClip', 'colDate', 'colViews', 'colDuration'];
  headers.forEach((header, index) => {
    if (headerKeys[index]) {
      header.textContent = tr(headerKeys[index]);
    }
  });

  sortOptions.forEach((option) => {
    const label = option.querySelector('.custom-select-option-label');
    if (label) {
      label.textContent = tr(SORT_KEYS[option.dataset.value]);
    }
  });
  sortValue.textContent = tr(SORT_KEYS[state.sort]);
}

async function initPage() {
  await loadLanguage();
  applyPageTranslations();
  trackAnalytics('tp');
  if (channel) {
    trackChannelAnalytics(channel);
  }
  await loadClips();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.language) {
    return;
  }

  const next = changes.language.newValue === 'ru' ? 'ru' : 'en';
  if (next === getLanguage()) {
    return;
  }

  loadLanguage().then(() => {
    refreshAllTranslations();
  }).catch(() => {});
});

initPage();
