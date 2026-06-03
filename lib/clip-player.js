import { kickFetch, kickFetchPlayback, runSequential } from './rate-limiter.js';

const playlistFetch = kickFetchPlayback;

const VERIFIED_BATCH_SIZE = 8;
export const VERIFIED_BADGE_URL = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#53FC18"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.7 5.3-4.2 4.5-1.8-1.8-.9.9 2.7 2.7 5.1-5.4-.9-.9Z"/></svg>'
);

function resolveUrl(baseUrl, relative) {
  if (!relative) {
    return '';
  }

  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }

  const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  return `${base}${relative}`;
}

function parseMasterPlaylist(masterUrl, text) {
  if (!text.includes('#EXT-X-STREAM-INF')) {
    return [{
      quality: 0,
      label: 'Original',
      url: masterUrl,
      type: 'hls'
    }];
  }

  const lines = text.split('\n');
  const variants = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF')) {
      continue;
    }

    const resolutionMatch = line.match(/RESOLUTION=\d+x(\d+)/i);
    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/i);
    const uri = lines[index + 1]?.trim();

    if (!uri || uri.startsWith('#')) {
      continue;
    }

    variants.push({
      height: resolutionMatch ? Number(resolutionMatch[1]) : 0,
      bandwidth: bandwidthMatch ? Number(bandwidthMatch[1]) : 0,
      url: resolveUrl(masterUrl, uri),
      type: 'hls'
    });
  }

  variants.sort((a, b) => b.height - a.height || b.bandwidth - a.bandwidth);

  return variants.map((variant, index) => ({
    quality: variant.height || index,
    label: variant.height ? `${variant.height}p` : `Quality ${index + 1}`,
    url: variant.url,
    type: 'hls'
  }));
}

async function fetchPlaylistSources(playlistUrl, depth = 0) {
  const response = await playlistFetch(playlistUrl, {
    headers: {
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*'
    }
  });

  if (!response.ok) {
    throw new Error('Clip is not available for playback');
  }

  const text = await response.text();

  if (text.includes('#EXT-X-STREAM-INF')) {
    return parseMasterPlaylist(playlistUrl, text);
  }

  if (depth < 2) {
    const variantLine = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));

    if (variantLine) {
      const nestedUrl = resolveUrl(playlistUrl, variantLine);
      if (nestedUrl && nestedUrl !== playlistUrl) {
        try {
          const nestedSources = await fetchPlaylistSources(nestedUrl, depth + 1);
          if (nestedSources.length > 1) {
            return nestedSources;
          }
        } catch {
          // use single-source fallback
        }
      }
    }
  }

  return parseMasterPlaylist(playlistUrl, text);
}

export async function getClipPlaybackSources(clipId, videoUrl) {
  let playlistUrl = videoUrl;

  if (!playlistUrl) {
    const response = await playlistFetch(`https://kick.com/api/v2/clips/${encodeURIComponent(clipId)}`);
    if (!response.ok) {
      throw new Error('Clip is not available for playback');
    }

    const data = await response.json();
    playlistUrl = data.video_url || data.clip_url;
  }

  if (!playlistUrl) {
    throw new Error('Clip is not available for playback');
  }

  return fetchPlaylistSources(playlistUrl);
}

export async function fetchUserVerified(username, channelSlug) {
  if (!username) {
    return false;
  }

  try {
    const path = channelSlug
      ? `/api/v2/channels/${encodeURIComponent(channelSlug)}/users/${encodeURIComponent(username)}`
      : `/api/v1/users/${encodeURIComponent(username)}`;
    const response = await kickFetch(`https://kick.com${path}`);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.verified === true
      || data.is_verified === true
      || data.user?.verified === true
      || data.identity?.verified === true;
  } catch {
    return false;
  }
}

export async function fetchUsersVerifiedByLogins(logins, channelSlug) {
  const unique = [...new Set(logins.map((login) => login.toLowerCase()).filter(Boolean))];
  const verifiedMap = {};

  for (const chunk of chunkArray(unique, VERIFIED_BATCH_SIZE)) {
    await runSequential(chunk, async (login) => {
      verifiedMap[login] = await fetchUserVerified(login, channelSlug);
    });
  }

  return verifiedMap;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function parseMediaPlaylist(mediaUrl, text) {
  const base = mediaUrl.substring(0, mediaUrl.lastIndexOf('/') + 1);

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => resolveUrl(mediaUrl, line.startsWith('http') ? line : `${base}${line}`));
}

export async function resolveHighestMediaPlaylist(masterUrl) {
  const response = await playlistFetch(masterUrl, {
    headers: {
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*'
    }
  });

  if (!response.ok) {
    throw new Error('Could not load clip');
  }

  const text = await response.text();

  if (!text.includes('#EXT-X-STREAM-INF')) {
    return masterUrl;
  }

  const sources = parseMasterPlaylist(masterUrl, text);
  return sources[0]?.url || masterUrl;
}

export async function downloadHlsAsBlob(masterUrl) {
  const mediaUrl = await resolveHighestMediaPlaylist(masterUrl);
  const response = await playlistFetch(mediaUrl, {
    headers: {
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*'
    }
  });

  if (!response.ok) {
    throw new Error('Could not download clip');
  }

  const playlistText = await response.text();
  const segments = parseMediaPlaylist(mediaUrl, playlistText);

  if (!segments.length) {
    throw new Error('Empty clip playlist');
  }

  const parts = [];

  for (const segmentUrl of segments) {
    const segmentResponse = await playlistFetch(segmentUrl, {
      headers: {
        Accept: '*/*'
      }
    });
    if (!segmentResponse.ok) {
      throw new Error('Could not download clip segment');
    }
    parts.push(await segmentResponse.arrayBuffer());
  }

  return new Blob(parts, { type: 'video/mp2t' });
}
