const KICK_MIN_INTERVAL_MS = 80;
const CLIPS_LIST_MIN_INTERVAL_MS = 0;
const PLAYBACK_MIN_INTERVAL_MS = 0;
const MAX_RETRIES = 6;

let kickChain = Promise.resolve();
let clipsListChain = Promise.resolve();
let playbackChain = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response, attempt) {
  const header = response.headers.get('Retry-After');
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds)) {
      return seconds * 1000;
    }
  }

  return Math.min(30_000, 1000 * (2 ** attempt));
}

export function isRateLimitError(error) {
  const message = String(error?.message || error || '');
  return message.includes('429') || message.includes('Too Many Requests');
}

export async function retryOnRateLimit(task, label = 'request') {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      await sleep(Math.min(30_000, 1500 * (2 ** attempt)));
    }
  }

  throw lastError || new Error(`Failed to complete ${label}`);
}

async function scheduleOnChain(chainRef, minIntervalMs, lastAtRef, task) {
  const run = chainRef.current.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, minIntervalMs - (now - lastAtRef.value));
    if (wait) {
      await sleep(wait);
    }

    lastAtRef.value = Date.now();
    return task();
  });

  chainRef.current = run.catch(() => {});
  return run;
}

const kickLastAt = { value: 0 };
const clipsListLastAt = { value: 0 };
const playbackLastAt = { value: 0 };
const kickChainRef = { current: kickChain };
const clipsListChainRef = { current: clipsListChain };
const playbackChainRef = { current: playbackChain };

async function performFetch(url, options = {}) {
  return retryOnRateLimit(async (attempt) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://kick.com/',
        ...options.headers
      }
    });

    if (response.status === 429) {
      await sleep(parseRetryAfterMs(response, attempt));
      throw new Error(`429 ${await response.text()}`);
    }

    return response;
  }, 'Kick');
}

export async function kickFetch(url, options = {}) {
  return scheduleOnChain(kickChainRef, KICK_MIN_INTERVAL_MS, kickLastAt, () => performFetch(url, options));
}

/** Paginated clip list — separate from playback so the player stays responsive. */
export async function kickFetchClips(url, options = {}) {
  return scheduleOnChain(
    clipsListChainRef,
    CLIPS_LIST_MIN_INTERVAL_MS,
    clipsListLastAt,
    () => performFetch(url, options)
  );
}

/** HLS playlists and clip metadata for the player. */
export async function kickFetchPlayback(url, options = {}) {
  return scheduleOnChain(
    playbackChainRef,
    PLAYBACK_MIN_INTERVAL_MS,
    playbackLastAt,
    () => performFetch(url, options)
  );
}

/** @deprecated Use kickFetchClips or kickFetchPlayback */
export async function kickFetchFast(url, options = {}) {
  return kickFetchPlayback(url, options);
}

export async function runSequential(items, worker) {
  const results = [];

  for (const item of items) {
    results.push(await worker(item));
  }

  return results;
}
