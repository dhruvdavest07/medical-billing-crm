type RateLimitConfig = {
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, Entry>;
};

const store = globalStore.__rateLimitStore ?? new Map<string, Entry>();

if (!globalStore.__rateLimitStore) {
  globalStore.__rateLimitStore = store;
}

function now() {
  return Date.now();
}

export function takeRateLimitToken(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const currentTime = now();
  const current = store.get(key);

  if (!current || current.resetAt <= currentTime) {
    store.set(key, {
      count: 1,
      resetAt: currentTime + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.max - 1,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  if (current.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - currentTime) / 1000),
      ),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, config.max - current.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((current.resetAt - currentTime) / 1000),
    ),
  };
}
