import { getClipStorageKey, CLIPS_PAGE_LIMIT } from './kick-api.js';

export class LoadCancelledError extends Error {
  constructor() {
    super('LOAD_CANCELLED');
    this.name = 'LoadCancelledError';
  }
}

function checkAbort(signal) {
  if (signal?.aborted) {
    throw new LoadCancelledError();
  }
}

/** API often returns page size (50/100), not the channel total. */
export function isReliableClipsTotal(total, loaded) {
  if (total == null || total <= 0) {
    return false;
  }

  if (!loaded || total > loaded + CLIPS_PAGE_LIMIT) {
    return total > CLIPS_PAGE_LIMIT + 10;
  }

  return false;
}

function normalizeTotalCount(rawTotal, loaded, hasMore) {
  if (rawTotal == null || rawTotal <= 0) {
    return null;
  }

  if (!hasMore) {
    return Math.max(rawTotal, loaded);
  }

  if (!isReliableClipsTotal(rawTotal, loaded)) {
    return null;
  }

  return rawTotal;
}

function resolveNextCursor(page, requestCursor, loadedAfterMerge) {
  const apiNext = page.nextCursor ?? page.next_cursor ?? null;

  if (apiNext != null && apiNext !== '') {
    const nextStr = String(apiNext);
    const requestStr = String(requestCursor ?? 0);
    if (nextStr !== requestStr) {
      return apiNext;
    }
  }

  if (!page.clips.length) {
    return null;
  }

  const offsetCursor = loadedAfterMerge;
  const requestStr = String(requestCursor ?? 0);
  if (String(offsetCursor) === requestStr) {
    return null;
  }

  if (page.clips.length >= CLIPS_PAGE_LIMIT) {
    return offsetCursor;
  }

  const pageTotal = page.totalCount;
  if (pageTotal != null && isReliableClipsTotal(pageTotal, loadedAfterMerge) && loadedAfterMerge < pageTotal) {
    return offsetCursor;
  }

  // Kick sometimes returns a short page without next_cursor while more clips exist.
  return offsetCursor;
}

export async function loadAllClips(channelSlug, fetchPage, onProgress, signal) {
  const clipMap = new Map();
  let cursor = 0;
  let shownPartial = false;
  let knownTotalCount = null;
  let stagnantPages = 0;
  let prefetchPromise = null;

  onProgress({
    phase: 'quick',
    loaded: 0,
    hasMore: true,
    totalCount: null,
    message: ''
  });

  const readPage = async (pageCursor) => {
    if (prefetchPromise) {
      const pending = prefetchPromise;
      prefetchPromise = null;
      if (String(pageCursor) === String(pending.cursor)) {
        return pending.promise;
      }
    }

    return fetchPage(channelSlug, pageCursor);
  };

  const schedulePrefetch = (nextCursor) => {
    if (nextCursor == null || signal?.aborted) {
      prefetchPromise = null;
      return;
    }

    prefetchPromise = {
      cursor: nextCursor,
      promise: fetchPage(channelSlug, nextCursor)
    };
  };

  try {
    while (true) {
      checkAbort(signal);

      const page = await readPage(cursor);
      const sizeBefore = clipMap.size;

      for (const clip of page.clips) {
        clipMap.set(getClipStorageKey(clip), clip);
      }

      const loaded = clipMap.size;
      const pageTotal = normalizeTotalCount(page.totalCount, loaded, true);

      if (pageTotal != null) {
        knownTotalCount = pageTotal;
      }

      if (loaded === sizeBefore && page.clips.length > 0) {
        stagnantPages += 1;
      } else {
        stagnantPages = 0;
      }

      const nextCursor = resolveNextCursor(page, cursor, loaded);
      const hasMore = Boolean(nextCursor)
        && page.clips.length > 0
        && stagnantPages < 2
        && (knownTotalCount == null || loaded < knownTotalCount);

      if (!hasMore) {
        knownTotalCount = loaded;
        prefetchPromise = null;
      } else {
        schedulePrefetch(nextCursor);
      }

      const progressMeta = {
        loaded,
        hasMore,
        totalCount: knownTotalCount,
        pageSize: page.pageSize || page.clips.length,
        message: ''
      };

      if (!shownPartial && loaded) {
        shownPartial = true;
        onProgress({
          phase: 'partial',
          ...progressMeta,
          clips: Array.from(clipMap.values())
        });
      } else if (hasMore || !shownPartial) {
        onProgress({ phase: 'full', ...progressMeta, newClips: page.clips });
      }

      if (!hasMore) {
        break;
      }

      cursor = nextCursor;
    }
  } catch (error) {
    prefetchPromise = null;

    if (error instanceof LoadCancelledError) {
      const clips = Array.from(clipMap.values());
      onProgress({
        phase: 'cancelled',
        loaded: clips.length,
        clips,
        hasMore: false,
        totalCount: clips.length,
        message: ''
      });
      return clips;
    }
    throw error;
  }

  const clips = Array.from(clipMap.values());

  onProgress({
    phase: 'done',
    loaded: clips.length,
    clips,
    hasMore: false,
    totalCount: clips.length,
    message: ''
  });

  return clips;
}
