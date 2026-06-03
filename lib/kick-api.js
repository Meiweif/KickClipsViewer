import { kickFetch, kickFetchClips } from './rate-limiter.js';

const KICK_ORIGIN = 'https://kick.com';
export const CLIPS_PAGE_LIMIT = 50;

export function extractClipsTotal(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const candidates = [
    data.total,
    data.total_count,
    data.totalCount,
    data.clips_count,
    data.clipsCount,
    data.clip_count,
    data.count,
    data.clips?.total,
    data.channel?.clips_count,
    data.channel?.clip_count,
    data.pagination?.total,
    data.pagination?.total_count,
    data.meta?.total,
    data.meta?.total_count
  ];

  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return Math.round(number);
    }
  }

  return null;
}

function extractCreator(raw) {
  return raw.creator
    || raw.clipper
    || raw.clipped_by
    || raw.clip_creator
    || (raw.user?.username ? raw.user : null)
    || {};
}

export function getClipStorageKey(clip) {
  if (clip?.id != null && clip.id !== '') {
    return String(clip.id);
  }

  return [
    clip?.created_at || '',
    clip?.title || '',
    clip?.view_count ?? '',
    clip?.duration ?? ''
  ].join('|');
}

export function clipNeedsCreatorEnrichment(clip, broadcasterUserId = '') {
  if (!clip?.creator_name && !clip.creator_slug) {
    return true;
  }

  if (broadcasterUserId && clip.creator_id === broadcasterUserId) {
    return true;
  }

  return false;
}

export function normalizeKickClip(raw, channelSlug, broadcasterUserId = '') {
  const creator = extractCreator(raw);
  const broadcasterId = String(broadcasterUserId || '');
  const creatorIdRaw = String(creator.id || creator.user_id || '');
  const creatorId = creatorIdRaw && creatorIdRaw !== broadcasterId ? creatorIdRaw : '';

  const creatorName = creator.username
    || creator.name
    || creator.display_name
    || '';
  const creatorSlug = (creator.slug || creator.username || creatorName || '').toLowerCase();

  const slug = channelSlug || raw.channel?.slug || '';
  const views = raw.view_count ?? raw.views ?? 0;

  return {
    id: raw.id ?? raw.clip_id ?? raw.uuid,
    title: raw.title || 'Untitled',
    created_at: raw.created_at,
    view_count: views,
    duration: Math.round(Number(raw.duration) || 0),
    thumbnail_url: raw.thumbnail_url || raw.thumbnail || '',
    url: slug ? `${KICK_ORIGIN}/${slug}?clip=${encodeURIComponent(raw.id)}` : `${KICK_ORIGIN}/`,
    creator_id: creatorId,
    creator_name: creatorName,
    creator_slug: creatorSlug,
    creator_avatar:
      creator.profile_picture
      || creator.profile_pic
      || creator.profile_image
      || creator.avatar
      || raw.user?.profile_pic
      || raw.user?.profile_picture
      || '',
    creator_verified: creator.is_verified === true || creator.verified === true,
    video_url: raw.video_url || raw.clip_url || '',
    category_name: raw.category?.name || ''
  };
}

export async function kickGet(path, useClipsFetcher = false) {
  const fetcher = useClipsFetcher ? kickFetchClips : kickFetch;
  const response = await fetcher(`${KICK_ORIGIN}${path}`);

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 403) {
      throw new Error('Kick blocked the request. Refresh the extension page and try again.');
    }

    if (response.status === 404) {
      throw new Error('Channel or clip not found');
    }

    throw new Error(`Kick API error (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function fetchChannelClipsTotal(slug) {
  try {
    const initData = await kickGet(
      `/api/v2/channels/${encodeURIComponent(slug)}/clips/init`,
      true
    );
    const fromInit = extractClipsTotal(initData);
    if (fromInit) {
      return fromInit;
    }
  } catch {
    // optional endpoint
  }

  try {
    const pageData = await kickGet(
      `/api/v2/channels/${encodeURIComponent(slug)}/clips?cursor=0&limit=1`,
      true
    );
    return extractClipsTotal(pageData);
  } catch {
    return null;
  }
}

export async function getChannelBySlug(slug) {
  const [data, clipsTotal] = await Promise.all([
    kickGet(`/api/v2/channels/${encodeURIComponent(slug)}`),
    fetchChannelClipsTotal(slug)
  ]);
  const user = data.user || {};

  if (!data?.id) {
    throw new Error(`Channel "${slug}" not found`);
  }

  const clipsCount = clipsTotal
    ?? extractClipsTotal(data)
    ?? extractClipsTotal(user)
    ?? null;

  return {
    id: String(data.id),
    userId: String(user.id || data.user_id || ''),
    login: data.slug || slug,
    displayName: user.username || data.slug || slug,
    profileImage: user.profile_pic || user.profile_picture || data.profile_pic || '',
    clipsCount
  };
}

export async function getChannelClipsPage(slug, cursor, broadcasterUserId = '') {
  const params = new URLSearchParams({
    cursor: cursor ? String(cursor) : '0',
    limit: String(CLIPS_PAGE_LIMIT)
  });

  const data = await kickGet(
    `/api/v2/channels/${encodeURIComponent(slug)}/clips?${params}`,
    true
  );
  const clips = (data.clips || []).map((clip) => normalizeKickClip(clip, slug, broadcasterUserId));

  const rawTotal = extractClipsTotal(data);

  return {
    clips,
    nextCursor: data.nextCursor ?? data.next_cursor ?? null,
    totalCount: rawTotal,
    pageSize: clips.length
  };
}

export async function getClipById(clipId, channelSlug = '', broadcasterUserId = '') {
  const data = await kickGet(`/api/v2/clips/${encodeURIComponent(clipId)}`, true);
  return normalizeKickClip(data, channelSlug, broadcasterUserId);
}

export function sortClips(clips, sortMode) {
  const sorted = [...clips];

  switch (sortMode) {
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'popular':
      sorted.sort((a, b) => b.view_count - a.view_count);
      break;
    case 'unpopular':
      sorted.sort((a, b) => a.view_count - b.view_count);
      break;
    default:
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
  }

  return sorted;
}

function pickUserCreatedAt(data) {
  return data?.created_at
    || data?.createdAt
    || data?.joined_at
    || data?.user?.created_at
    || data?.user?.createdAt
    || data?.user?.joined_at
    || data?.identity?.created_at
    || null;
}

function pickUserAvatar(data) {
  const user = data?.user || data;
  return user?.profile_pic
    || user?.profile_picture
    || user?.profile_image
    || user?.avatar
    || data?.profile_pic
    || data?.profile_picture
    || '';
}

function normalizeUserProfile(raw, fallbackId = '', fallbackLogin = '') {
  const user = raw?.user || raw;
  const id = String(user?.id || raw?.id || fallbackId || '');
  const login = (user?.slug || user?.username || raw?.slug || raw?.username || fallbackLogin || '').toLowerCase();

  if (!id && !login) {
    return null;
  }

  return {
    id: id || `slug:${login}`,
    login,
    displayName: user?.username || user?.name || raw?.username || login || '',
    avatar: pickUserAvatar(raw),
    createdAt: pickUserCreatedAt(raw),
    isVerified: user?.is_verified === true
      || user?.verified === true
      || raw?.verified === true,
    verifiedChecked: false
  };
}

export async function fetchUserByLogin(login, channelSlug) {
  if (!login || !channelSlug) {
    return null;
  }

  try {
    const data = await kickGet(
      `/api/v2/channels/${encodeURIComponent(channelSlug)}/users/${encodeURIComponent(login)}`
    );
    return normalizeUserProfile(data, '', login);
  } catch {
    return null;
  }
}

export async function fetchUserById(userId, channelSlug = '', login = '') {
  const paths = [];

  if (channelSlug && login) {
    paths.push(`/api/v2/channels/${encodeURIComponent(channelSlug)}/users/${encodeURIComponent(login)}`);
  }

  paths.push(
    `/api/v2/users/${encodeURIComponent(userId)}`,
    `/api/v1/users/${encodeURIComponent(userId)}`
  );

  for (const path of paths) {
    try {
      const data = await kickGet(path);
      const profile = normalizeUserProfile(data, userId, login);
      if (profile) {
        return profile;
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
}

export async function fetchUsersByIds(userIds, channelSlug = '', idToLogin = {}) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const profiles = {};

  for (const userId of uniqueIds) {
    const profile = await fetchUserById(userId, channelSlug, idToLogin[userId] || '');
    if (profile) {
      profiles[userId] = profile;
      if (profile.login) {
        profiles[`slug:${profile.login.toLowerCase()}`] = profile;
      }
    }
  }

  return profiles;
}

export async function fetchUsersByLogins(logins, channelSlug = '') {
  const unique = [...new Set(logins.map((l) => l.toLowerCase()).filter(Boolean))];
  const profiles = {};

  for (const login of unique) {
    const profile = await fetchUserByLogin(login, channelSlug);
    if (profile) {
      profiles[`slug:${login}`] = profile;
      if (profile.id) {
        profiles[profile.id] = profile;
      }
    }
  }

  return profiles;
}

export function filterClips(clips, query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return clips;
  }

  return clips.filter((clip) => {
    const title = (clip.title || '').toLowerCase();
    const creator = (clip.creator_name || clip.creator_slug || '').toLowerCase();
    const category = (clip.category_name || '').toLowerCase();
    return title.includes(q) || creator.includes(q) || category.includes(q);
  });
}
