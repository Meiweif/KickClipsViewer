const KICK_HOST_PATTERN = /(^|\.)kick\.com$/i;
const RESERVED_PATH_SEGMENTS = new Set([
  'videos',
  'clip',
  'clips',
  'categories',
  'about',
  'dashboard',
  'settings',
  'following',
  'browse'
]);

function extractPlainSlug(value) {
  return value.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function looksLikeUrlInProgress(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  return /^https?:\/\//i.test(trimmed)
    || lower.startsWith('http')
    || lower.includes('://')
    || lower.includes('/')
    || /kick\.com/i.test(trimmed)
    || lower.startsWith('kick.')
    || lower.startsWith('www.');
}

function slugFromPathname(pathname) {
  const segments = pathname.split('/').filter(Boolean);

  for (const segment of segments) {
    const slug = segment.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (slug && !RESERVED_PATH_SEGMENTS.has(slug)) {
      return slug;
    }
  }

  return '';
}

export function parseChannelSlug(value) {
  const raw = (value || '').trim();
  if (!raw) {
    return '';
  }

  const looksLikeUrl = looksLikeUrlInProgress(raw) || /^https?:\/\//i.test(raw) || /kick\.com/i.test(raw);

  if (looksLikeUrl) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
      const parsed = new URL(normalizedUrl);
      const host = parsed.hostname.replace(/^www\./i, '');

      if (KICK_HOST_PATTERN.test(host)) {
        const fromPath = slugFromPathname(parsed.pathname);
        if (fromPath) {
          return fromPath;
        }
      }
    } catch {
      // Fall through to plain slug parsing.
    }
  }

  return extractPlainSlug(raw);
}

export function sanitizeChannelInputValue(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (looksLikeUrlInProgress(trimmed)) {
    if (/kick\.com/i.test(trimmed)) {
      const slug = parseChannelSlug(trimmed);
      if (slug) {
        return slug;
      }
    }

    return trimmed;
  }

  return trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

export function normalizeChannel(value) {
  return parseChannelSlug(value);
}

export function applyChannelInputSanitize(input) {
  const sanitized = sanitizeChannelInputValue(input.value);

  if (sanitized !== input.value) {
    input.value = sanitized;
  }
}

export function finalizeChannelInput(input) {
  const slug = parseChannelSlug(input.value);

  if (slug) {
    input.value = slug;
  } else {
    applyChannelInputSanitize(input);
  }
}

export function applyChannelPaste(input, clipboardText) {
  const text = (clipboardText || '').trim();
  if (!text) {
    return false;
  }

  if (looksLikeUrlInProgress(text) || /kick\.com/i.test(text) || /^https?:\/\//i.test(text)) {
    const slug = parseChannelSlug(text);
    input.value = slug || text;
    return true;
  }

  return false;
}
