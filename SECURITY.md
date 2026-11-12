# Security Architecture — Mystery Exchange

Mystery Exchange implements practical server-side security controls to protect participant anonymity, organizer blind mode, and draw integrity.

## 1. Authentication & Token Handling

- **High-Entropy Tokens**: Organizer tokens (`org_<256-bit base64url>`) and participant tokens (`prt_<256-bit base64url>`) are generated using Node.js `crypto.randomBytes(32)`.
- **Hashed Verifiers**: Raw tokens are never persisted on the server. Only SHA-256 digests (optionally salted with `TOKEN_HASH_PEPPER`) are stored in Netlify Blobs (`organizerTokenHash`, `participants/<tokenHash>`).
- **Constant-Time Verification**: Organizer token hashes are compared with `crypto.timingSafeEqual`.
- **Transport**: Tokens are sent in the `Authorization: Bearer <token>` HTTP header, never in URL query strings. Organizer management links use URL hash fragments (`#token=...`), which browsers do not transmit to servers.

## 2. Role Separation & Authorization

- **Organizer Endpoints** (`/api/organizer/:groupId`, `/api/start-draw`):
  - Require valid `organizerToken`.
  - Project `GroupRecord` through `toOrganizerGroupView()`, which returns aggregate counts (`participantCount`, `completedWishlistCount`, `drawReadiness`) and **never** includes song titles, wishlists, participant IDs, or assignments.
- **Participant Endpoints** (`/api/participant/session`, `/api/participant/wishlist`, `/api/participant/gift-progress`):
  - Require valid `privateToken`.
  - Return only the participant's own submission and, after the draw, only their single assigned recipient's song, wishlist, and preferences (omitting `recipientParticipantId`).
- **Public Endpoint** (`/api/group/:groupId`):
  - Returns only event metadata and aggregate participant count.

## 3. Random Draw Integrity & Concurrency

- **CSPRNG Derangement**: `netlify/functions/lib/derangement.ts` uses `crypto.getRandomValues()` with rejection sampling (no `Math.random()`).
- **Invariant Verification**: Before writing assignments, `verifyDerangement()` confirms a bijection with zero self-assignments.
- **Atomic Locking**: `start-draw` acquires `locks/<groupId>` with `{ onlyIfNew: true }`, transitions `status` to `LOCKED` via `onlyIfMatch: etag`, writes all assignments, and transitions to `DRAWN`. Failed draws do not publish partial results, and completed draws cannot be reset or re-run.

## 4. Input Validation & HTTP Headers

- **Safe URLs**: `validateSafeHttpUrl()` restricts wishlist product and image URLs to `http://` and `https://`, blocking `javascript:` and `data:` payloads.
- **Security Headers**: `netlify.toml` enforces `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`. API responses include `Cache-Control: no-store`.
- **Rate Limiting**: Best-effort per-IP rate limiting on `create-group` and `join-group`.
