import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleAdmin } from './netlify/functions/admin.mts';
import { handleCreateGroup } from './netlify/functions/create-group.mts';
import { handleGetGroup } from './netlify/functions/get-group.mts';
import { handleJoinGroup } from './netlify/functions/join-group.mts';
import { handleOrganizerGroup } from './netlify/functions/organizer-group.mts';
import { handleParticipantSession } from './netlify/functions/participant-session.mts';
import { handleRecoverLink } from './netlify/functions/recover-link.mts';
import { handleStartDraw } from './netlify/functions/start-draw.mts';
import { handleUpdateGiftProgress } from './netlify/functions/update-gift-progress.mts';
import { handleUpdateWishlist } from './netlify/functions/update-wishlist.mts';

/**
 * Vite development plugin that mounts Netlify Functions directly as Vite dev server middleware.
 * This allows `npm run dev` to serve all `/api/*` endpoints without needing `netlify dev`
 * running on port 8888, eliminating [vite] proxy ECONNREFUSED errors.
 */
export function netlifyDevApiPlugin(): Plugin {
  return {
    name: 'netlify-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const rawUrl = req.url || '';
        if (!rawUrl.startsWith('/api/')) {
          return next();
        }

        try {
          const parsed = new URL(rawUrl, `http://${req.headers.host || 'localhost:5173'}`);
          const pathname = parsed.pathname;

          // Convert Node IncomingMessage to standard Web Request
          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val) {
              if (Array.isArray(val)) {
                val.forEach((v) => headers.append(key, v));
              } else {
                headers.set(key, val);
              }
            }
          }

          let body: Buffer | undefined = undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            body = Buffer.concat(chunks);
          }

          const webReq = new Request(parsed.toString(), {
            method: req.method,
            headers,
            body: body ? (body as unknown as BodyInit) : undefined,
          });

          const clientIp =
            (req.headers['x-forwarded-for'] as string) ||
            req.socket?.remoteAddress ||
            '127.0.0.1';

          let webRes: Response | null = null;

          if (pathname === '/api/create-group') {
            webRes = await handleCreateGroup(webReq, clientIp);
          } else if (pathname.startsWith('/api/group/')) {
            const groupId = pathname.replace('/api/group/', '');
            webRes = await handleGetGroup(webReq, groupId);
          } else if (pathname === '/api/join-group') {
            webRes = await handleJoinGroup(webReq, clientIp);
          } else if (pathname.startsWith('/api/organizer/')) {
            const groupId = pathname.replace('/api/organizer/', '');
            webRes = await handleOrganizerGroup(webReq, groupId);
          } else if (pathname === '/api/participant/session') {
            webRes = await handleParticipantSession(webReq);
          } else if (pathname === '/api/participant/wishlist') {
            webRes = await handleUpdateWishlist(webReq);
          } else if (pathname === '/api/participant/gift-progress') {
            webRes = await handleUpdateGiftProgress(webReq);
          } else if (pathname === '/api/recover-link') {
            webRes = await handleRecoverLink(webReq, clientIp);
          } else if (pathname === '/api/start-draw') {
            webRes = await handleStartDraw(webReq);
          } else if (pathname.startsWith('/api/admin')) {
            const segments = pathname.replace('/api/admin', '').split('/').filter(Boolean);
            const action = segments[0] || 'overview';
            const targetGroupId = segments[1] || '';
            webRes = await handleAdmin(webReq, action, targetGroupId, clientIp);
          }

          if (webRes) {
            res.statusCode = webRes.status;
            webRes.headers.forEach((val, key) => {
              res.setHeader(key, val);
            });
            const arrayBuf = await webRes.arrayBuffer();
            res.end(Buffer.from(arrayBuf));
            return;
          }

          next();
        } catch (err) {
          console.error('[dev-api] Error handling', rawUrl, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Internal dev server error',
            })
          );
        }
      });
    },
  };
}
