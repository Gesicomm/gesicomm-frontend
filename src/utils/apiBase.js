function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function normalizeApiOrigin(url) {
  const cleanURL = url.replace(/\/$/, '');
  return cleanURL.endsWith('/api') ? cleanURL.replace(/\/api$/, '') : cleanURL;
}

export function resolveApiOriginFor({ configuredURL = '', hostname } = {}) {
  const cleanConfiguredURL = configuredURL.trim();

  if (hostname) {
    const runningLocally = isLocalHostname(hostname);
    const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/.test(cleanConfiguredURL);

    if (cleanConfiguredURL && !(pointsToLocalhost && !runningLocally)) {
      return normalizeApiOrigin(cleanConfiguredURL);
    }

    if (runningLocally) return '';
    if (hostname === 'test.gesicomm.com') return 'https://api.test.gesicomm.com';
    return 'https://api.gesicomm.com';
  }

  return cleanConfiguredURL ? normalizeApiOrigin(cleanConfiguredURL) : 'https://api.gesicomm.com';
}

function resolveApiOrigin() {
  const configuredURL = import.meta.env.VITE_API_URL || '';

  if (typeof window !== 'undefined') {
    return resolveApiOriginFor({ configuredURL, hostname: window.location.hostname });
  }

  return resolveApiOriginFor({ configuredURL });
}

export function apiOrigin() {
  return resolveApiOrigin();
}

export function apiBaseURL() {
  const origin = resolveApiOrigin();
  return origin ? `${origin}/api` : '/api';
}
