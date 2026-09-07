export class RateLimiter {
  private cache: Map<string, { count: number; timestamp: number }>;
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.cache = new Map();
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(ip: string): boolean {
    const now = Date.now();
    const record = this.cache.get(ip);

    if (!record) {
      this.cache.set(ip, { count: 1, timestamp: now });
      return true;
    }

    if (now - record.timestamp > this.windowMs) {
      this.cache.set(ip, { count: 1, timestamp: now });
      return true;
    }

    if (record.count >= this.limit) {
      return false;
    }

    record.count += 1;
    return true;
  }
}

export const attendanceRateLimiter = new RateLimiter(5, 60 * 1000);
