# Mystery Exchange

**Anonymous Song-Based Secret Santa & Wishlist Platform**

Mystery Exchange is a minimalist, privacy-focused Secret Santa web application where participants use a **song title** as their anonymous identity instead of real names, emails, or accounts.

## Features

- **No Accounts or Real Names**: Join with a song title and receive a private access link.
- **Blind Organizer Mode**: Organizers create groups, share invites, monitor aggregate counts (`participants` and `wishlists completed`), and start the draw—without ever seeing songs, wishlists, or assignments.
- **Wishlist Builder**: Add up to 20 items with categories, priorities, estimated prices, product links, images, and optional preferences.
- **CSPRNG Derangement Draw**: Server-side `crypto.getRandomValues()` guarantees no self-assignment, one recipient per participant, and atomic single-use finalization.
- **Private Result & Gift Checklist**: Reopen the same private link after the draw to view your recipient's song, wishlist, and a private gift preparation checklist & notes.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React
- **Backend**: Netlify Functions (`.mts`), Netlify Blobs (`@netlify/blobs` with strong consistency & conditional writes)
- **Testing**: Vitest

## Local Development

```bash
npm install
npm run dev
```

For full local Netlify Functions + Blobs emulation, run with Netlify CLI:

```bash
npx netlify dev
```

## Testing & Build

```bash
npm test
npm run build
```

## Documentation

- **Microsoft Word Project Documentation**: [Mystery_Exchange_Project_Documentation.docx](./documentation/Mystery_Exchange_Project_Documentation.docx)
  - Regenerate with: `npm run docs:generate`
- **Security Architecture**: [SECURITY.md](./SECURITY.md)
- **Privacy Policy**: [PRIVACY.md](./PRIVACY.md)

## Netlify Deployment

1. Connect this repository to Netlify (or deploy via `npx netlify deploy --prod`).
2. Build command: `npm run build` | Publish directory: `dist` | Functions directory: `netlify/functions` (pre-configured in `netlify.toml`).
3. Optional environment variable (Functions scope): `TOKEN_HASH_PEPPER` for additional server-side token hashing defense-in-depth.

### Free-Tier Considerations

- **Netlify Free (Starter)**: 100 GB bandwidth/month, 125k serverless function invocations/month, and Netlify Blobs included within free-tier limits—well suited for groups of 3–50 participants with zero paid subscriptions.
- **Scaling Beyond Free Tier**: High-traffic public deployments with thousands of concurrent groups may exceed free-tier function invocations or Blobs storage/bandwidth quotas, at which point Netlify Pro or a relational database (e.g., Supabase) would be appropriate.
