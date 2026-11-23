import { describe, expect, it } from 'vitest';
import { netlifyDevApiPlugin } from '../viteDevApiPlugin';
import { EventEmitter } from 'node:events';

describe('Vite Dev API Plugin', () => {
  it('intercepts /api/admin/auth and responds with 200 without proxying', async () => {
    const plugin = netlifyDevApiPlugin();
    let middleware: any;

    const fakeServer = {
      middlewares: {
        use: (fn: any) => {
          middleware = fn;
        },
      },
    };

    (plugin as any).configureServer(fakeServer);
    expect(middleware).toBeDefined();

    // Simulate incoming HTTP request
    const req = Object.assign(new EventEmitter(), {
      url: '/api/admin/auth',
      method: 'GET',
      headers: {
        host: 'localhost:5173',
        authorization: 'Bearer hulawho-super-admin-2026',
      },
    });

    let statusCode = 0;
    const responseHeaders: Record<string, string> = {};
    let responseBody = '';

    const res = {
      set statusCode(val: number) {
        statusCode = val;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(key: string, val: string) {
        responseHeaders[key] = val;
      },
      end(data?: any) {
        if (data) responseBody = data.toString();
      },
    };

    await middleware(req, res, () => {});

    expect(statusCode).toBe(200);
    const parsed = JSON.parse(responseBody);
    expect(parsed.ok).toBe(true);
    expect(parsed.message).toContain('Super Admin authenticated');

    // Also test overview
    const reqOverview = Object.assign(new EventEmitter(), {
      url: '/api/admin/overview',
      method: 'GET',
      headers: {
        host: 'localhost:5173',
        authorization: 'Bearer hulawho-super-admin-2026',
      },
    });

    let overviewStatus = 0;
    let overviewBody = '';
    const resOverview = {
      set statusCode(val: number) {
        overviewStatus = val;
      },
      get statusCode() {
        return overviewStatus;
      },
      setHeader() {},
      end(data?: any) {
        if (data) overviewBody = data.toString();
      },
    };

    await middleware(reqOverview, resOverview, () => {});
    expect(overviewStatus).toBe(200);
    const overviewData = JSON.parse(overviewBody);
    expect(overviewData.stats).toBeDefined();
    expect(Array.isArray(overviewData.groups)).toBe(true);
  });
});
