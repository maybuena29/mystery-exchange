import fs from 'node:fs';
import path from 'node:path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const FOREST_GREEN = '315B46';
const CHARCOAL = '262A27';
const STONE = '777B76';
const BEIGE_BG = 'F8F7F3';
const BORDER_COLOR = 'E8E6DF';
const BURGUNDY = '874B4B';

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    pageBreakBefore: false,
  });
}

function p(text: string, boldPrefix?: string): Paragraph {
  const runs: TextRun[] = [];
  if (boldPrefix) {
    runs.push(new TextRun({ text: boldPrefix, bold: true, color: CHARCOAL, font: 'Calibri', size: 22 }));
  }
  runs.push(new TextRun({ text, color: CHARCOAL, font: 'Calibri', size: 22 }));
  return new Paragraph({
    children: runs,
    spacing: { after: 120, line: 276 },
  });
}

function bullet(text: string, boldPrefix?: string): Paragraph {
  const runs: TextRun[] = [];
  if (boldPrefix) {
    runs.push(new TextRun({ text: boldPrefix, bold: true, color: CHARCOAL, font: 'Calibri', size: 22 }));
  }
  runs.push(new TextRun({ text, color: CHARCOAL, font: 'Calibri', size: 22 }));
  return new Paragraph({
    children: runs,
    bullet: { level: 0 },
    spacing: { after: 80, line: 260 },
  });
}

function codeBlock(lines: string[]): Paragraph {
  return new Paragraph({
    children: lines.map(
      (line, idx) =>
        new TextRun({
          text: idx === lines.length - 1 ? line : `${line}\n`,
          font: 'Consolas',
          size: 19,
          color: CHARCOAL,
        })
    ),
    shading: { type: ShadingType.CLEAR, fill: BEIGE_BG },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 12, color: FOREST_GREEN },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    },
    spacing: { before: 100, after: 140 },
  });
}

function styledTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: FOREST_GREEN },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Calibri', size: 20 })],
            }),
          ],
        })
    ),
  });

  const bodyRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: BEIGE_BG } : undefined,
              margins: { top: 90, bottom: 90, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, color: CHARCOAL, font: 'Calibri', size: 20 })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    },
    rows: [headerRow, ...bodyRows],
  });
}

async function generate() {
  const doc = new Document({
    features: {
      updateFields: true,
    },
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: CHARCOAL,
          },
        },
        heading1: {
          run: {
            font: 'Calibri',
            size: 32,
            bold: true,
            color: FOREST_GREEN,
          },
        },
        heading2: {
          run: {
            font: 'Calibri',
            size: 25,
            bold: true,
            color: FOREST_GREEN,
          },
        },
      },
    },
    sections: [
      // Cover Page
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          new Paragraph({ spacing: { before: 2200 } }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'PROJECT DOCUMENTATION',
                bold: true,
                color: BURGUNDY,
                font: 'Calibri',
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 180, after: 180 },
            children: [
              new TextRun({
                text: 'Mystery Exchange',
                bold: true,
                color: FOREST_GREEN,
                font: 'Calibri',
                size: 64,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Anonymous Song-Based Secret Santa & Wishlist Platform',
                color: STONE,
                font: 'Calibri',
                size: 30,
              }),
            ],
          }),
          new Paragraph({
            border: {
              top: { style: BorderStyle.SINGLE, size: 12, color: FOREST_GREEN },
            },
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({
                text: 'Technical Architecture, Security Model, Implementation Reference, and Netlify Deployment Guide',
                color: CHARCOAL,
                font: 'Calibri',
                size: 24,
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 1800 } }),
          p('React 18 · TypeScript · Vite · Tailwind CSS · Netlify Functions · Netlify Blobs', 'Tech Stack: '),
          p('Version 1.0.0', 'Release: '),
          p('Generated from the implemented repository codebase', 'Status: '),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },
      // Main Document Body
      {
        properties: {
          page: {
            margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Mystery Exchange — Project Documentation',
                    color: STONE,
                    font: 'Calibri',
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Mystery Exchange  |  Page ', color: STONE, size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: STONE, size: 18 }),
                  new TextRun({ text: ' of ', color: STONE, size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: STONE, size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: [
          h1('Table of Contents'),
          new TableOfContents('Table of Contents', {
            hyperlink: true,
            headingStyleRange: '1-2',
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // 1. Project Overview
          h1('1. Project Overview'),
          p(
            'Mystery Exchange is a minimalist, privacy-focused Secret Santa and wishlist web application. Inspired by DrawNames, it replaces real names, emails, and user accounts with a single creative identifier: a song title chosen by each participant.'
          ),
          p(
            'Participants join an exchange via a shared invitation link, submit their anonymous song title and personal wishlist, and save a unique private access link. When the organizer triggers the random draw, each participant reopens their private link to discover their assigned recipient’s song and wishlist.'
          ),

          // 2. Project Objectives
          h1('2. Project Objectives'),
          bullet('Eliminate real names, emails, phone numbers, and conventional user accounts.'),
          bullet('Protect participant anonymity through server-side role separation (Blind Organizer Mode).'),
          bullet('Guarantee mathematically fair, zero-self-assignment draws using cryptographically secure randomness.'),
          bullet('Provide a calm, Scandinavian-minimalist interface with subtle festive accents.'),
          bullet('Operate primarily on Netlify Free Tier using static hosting, Netlify Functions, and Netlify Blobs.'),

          // 3. Features and Functionalities
          h1('3. Features and Functionalities'),
          bullet('Group Creation Wizard supporting categories, budgets (default PHP, plus USD/EUR/GBP/SGD/JPY/AUD/CAD), participant limits (3–50), and wishlist rules.', 'Organizer Setup: '),
          bullet('Aggregate-only dashboard displaying participant counts, wishlist completion counts, draw readiness, and lifecycle controls.', 'Blind Organizer Dashboard: '),
          bullet('Song-based anonymous joining with locked song identity after submission.', 'Anonymous Joining: '),
          bullet('Up to 20 items per wishlist with descriptions, categories, estimated prices, validated product/image URLs, priorities, and optional preferences.', 'Wishlist Builder: '),
          bullet('Single-use CSPRNG derangement draw with atomic locking and confirmation modal.', 'Random Draw Engine: '),
          bullet('Private match reveal page with a 5-step gift preparation checklist and private gift-giver notes.', 'Private Result & Checklist: '),

          // 4. User Roles and Permissions
          h1('4. User Roles and Permissions'),
          p('All permissions are enforced independently on the backend via hashed Bearer tokens.'),
          styledTable(
            ['Capability', 'Public Visitor', 'Organizer', 'Participant (Pre-Draw)', 'Assigned Gift-Giver (Post-Draw)'],
            [
              ['View event metadata & participant count', 'Yes', 'Yes', 'Yes', 'Yes'],
              ['View completed wishlist count', 'No', 'Yes', 'No', 'No'],
              ['Edit event details / close registration', 'No', 'Yes (Pre-Draw)', 'No', 'No'],
              ['Start random draw', 'No', 'Yes (Once)', 'No', 'No'],
              ['View individual song titles', 'No', 'No', 'Own song only', 'Own + assigned recipient song'],
              ['View/edit own wishlist', 'No', 'No', 'Yes (if enabled)', 'Yes (if post-draw edit enabled)'],
              ['View recipient wishlist & preferences', 'No', 'No', 'No', 'Assigned recipient only'],
              ['Save private gift checklist & notes', 'No', 'No', 'No', 'Yes (private to giver)'],
            ]
          ),

          // 5. How the System Works
          h1('5. How the System Works'),
          p('The end-to-end exchange lifecycle flows through strict server-enforced states:'),
          codeBlock([
            '[1] Organizer creates group (/create) -> Receives public invite URL + private org_ token',
            '       |',
            '       v  (Status: CREATED -> COLLECTING)',
            '[2] Participants open /join/:groupId -> Submit Song + Wishlist -> Receive private prt_ link',
            '       |',
            '       v  (Organizer closes registration -> REGISTRATION_CLOSED / READY)',
            '[3] Organizer confirms "Start Exchange" -> Backend acquires lock -> Status: LOCKED',
            '       |',
            '       v  (CSPRNG Derangement + Verification -> Status: DRAWN)',
            '[4] Participants reopen /participant/:token or /result/:token -> View match & checklist',
          ]),

          // 6. Random Assignment Algorithm
          h1('6. Random Assignment Algorithm'),
          p(
            'Implemented in netlify/functions/lib/derangement.ts, the randomizer uses Node.js crypto.getRandomValues() with rejection sampling (secureRandomInt) to eliminate modulo bias. It never uses Math.random().'
          ),
          bullet('Performs Fisher-Yates shuffle and rejects any permutation with a fixed point (candidate[i] === items[i]).'),
          bullet('Falls back to Sattolo’s single-cycle derangement algorithm if 128 rejection attempts are exceeded.'),
          bullet('Runs verifyDerangement() before persisting to confirm exact length, bijection, and zero self-assignments.'),
          bullet('Protected by an exclusive lock key (locks/<groupId>, onlyIfNew: true) and optimistic concurrency (onlyIfMatch: etag) on the group record.'),

          // 7. Wishlist Functionality
          h1('7. Wishlist Functionality'),
          p(
            'Implemented in src/components/wishlist/WishlistEditor.tsx and persisted via netlify/functions/join-group.mts and netlify/functions/update-wishlist.mts. Participants can add, edit, delete, and reorder up to 20 items, categorize them across 9 categories, set Must Have / Nice to Have priorities, and attach validated http/https product and image links.'
          ),

          // 8. Privacy and Security
          h1('8. Privacy and Security'),
          bullet('256-bit CSPRNG tokens (org_ and prt_) hashed with SHA-256 (+ optional TOKEN_HASH_PEPPER) before storage.'),
          bullet('Tokens are transmitted via Authorization: Bearer headers, never query strings.'),
          bullet('Organizer endpoints project data through toOrganizerGroupView(), stripping participantIds, songs, wishlists, and assignments.'),
          bullet('netlify.toml configures Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and Referrer-Policy.'),
          p(
            'Realistic Privacy Limitation: Mystery Exchange provides practical anonymity, not absolute anonymity. A participant who picks a song strongly associated with them personally may still be recognized by friends.',
            'Important Note: '
          ),

          // 9. System Architecture
          h1('9. System Architecture'),
          codeBlock([
            '+-------------------------------------------------------------------+',
            '|                  Browser (React + TypeScript + Vite)              |',
            '|  Routes: /, /how-it-works, /create, /join/:id, /organizer/:id,    |',
            '|          /participant/:token, /result/:token, /privacy, /terms    |',
            '+---------------------------------+---------------------------------+',
            '                                  | HTTPS + Bearer Token',
            '                                  v',
            '+-------------------------------------------------------------------+',
            '|               Netlify Functions (netlify/functions/*.mts)         |',
            '|  create-group | get-group | organizer-group | join-group          |',
            '|  participant-session | update-wishlist | update-gift-progress     |',
            '|  start-draw                                                       |',
            '+---------------------------------+---------------------------------+',
            '                                  | Strong Consistency + CAS',
            '                                  v',
            '+-------------------------------------------------------------------+',
            '|               Netlify Blobs Store ("mystery-exchange")            |',
            '|  groups/<id> | participants/<hash> | submissions/<gid>/<pid>      |',
            '|  assignments/<gid>/<pid> | gift-progress/<gid>/<pid> | locks/<id> |',
            '+-------------------------------------------------------------------+',
          ]),

          // 10. Database and Storage Structure
          h1('10. Database and Storage Structure'),
          p('Data is stored in a strong-consistency Netlify Blobs store ("mystery-exchange") using separated key namespaces:'),
          styledTable(
            ['Key Pattern', 'Record Type', 'Purpose & Access Scope'],
            [
              ['groups/<groupId>', 'GroupRecord', 'Event metadata, settings, status, organizerTokenHash, participantIds, participantSummaries'],
              ['participants/<tokenHash>', 'ParticipantTokenIndex', 'Maps SHA-256(privateToken) -> { groupId, participantId }'],
              ['submissions/<groupId>/<participantId>', 'SubmissionRecord', 'Locked songTitle/artist, wishlist items, preferences'],
              ['assignments/<groupId>/<giverId>', 'AssignmentRecord', 'Written atomically on draw: { giverParticipantId, recipientParticipantId, finalizedAt }'],
              ['gift-progress/<groupId>/<giverId>', 'GiftProgressRecord', 'Private 5-item checklist and private gift-giver notes'],
              ['locks/<groupId>', 'DrawLockRecord', 'Exclusive lock preventing concurrent draw execution'],
            ]
          ),

          // 11. Website Pages and Routes
          h1('11. Website Pages and Routes'),
          styledTable(
            ['Route', 'Component', 'Purpose'],
            [
              ['/', 'HomePage', 'Minimalist landing page, 3-step overview, privacy highlights'],
              ['/how-it-works', 'HowItWorksPage', 'Organizer/participant guides, draw diagram, 11-item FAQ'],
              ['/create', 'CreateGroupPage', 'Exchange creation wizard and link distribution'],
              ['/join & /join/:groupId', 'JoinGroupPage', 'Code lookup, song submission, and wishlist builder'],
              ['/organizer/:groupId', 'OrganizerDashboard', 'Aggregate counts, readiness checks, registration & draw controls'],
              ['/participant/:privateToken', 'ParticipantDashboard', 'Pre-draw status and wishlist editing'],
              ['/result/:privateToken', 'ResultPage', 'Post-draw match reveal, recipient wishlist, and private checklist'],
              ['/privacy', 'PrivacyPage', 'Data handling and anonymity limitations'],
              ['/terms', 'TermsPage', 'Terms of use'],
            ]
          ),

          // 12. Installation and Local Development
          h1('12. Installation and Local Development'),
          codeBlock([
            'npm install          # Install dependencies',
            'npm run dev          # Start Vite dev server (port 5173)',
            'npx netlify dev      # Start full Netlify Functions + Blobs local runtime (port 8888)',
            'npm test             # Run Vitest automated test suite',
            'npm run build        # Typecheck (tsc -b) and build production bundle',
            'npm run docs:generate # Regenerate this Word documentation',
          ]),

          // 13. Netlify Deployment Guide
          h1('13. Netlify Deployment Guide'),
          bullet('Push the repository to GitHub/GitLab/Bitbucket and connect it to Netlify, or deploy via `npx netlify deploy --prod`.'),
          bullet('Netlify automatically reads netlify.toml: build command `npm run build`, publish directory `dist`, functions directory `netlify/functions`.'),
          bullet('Optionally configure `TOKEN_HASH_PEPPER` in Netlify Site Settings -> Environment Variables (Functions scope).'),

          // 14. Free-Tier and Cost Considerations
          h1('14. Free-Tier and Cost Considerations'),
          p(
            'Mystery Exchange is engineered to run on Netlify’s free Starter tier (100 GB bandwidth/month, 125,000 function invocations/month, and Netlify Blobs included). For typical groups of 3–50 participants, a single exchange consumes roughly 20–150 function invocations. If a public deployment scales to thousands of concurrent groups, upgrading to Netlify Pro or migrating state to a relational database (e.g., Supabase) would be recommended.'
          ),

          // 15. Testing and Quality Assurance
          h1('15. Testing and Quality Assurance'),
          p('Automated tests are implemented with Vitest in tests/derangement.test.ts and tests/exchange-flow.test.ts:'),
          bullet('Derangement tests: 25 randomized runs each for 3, 5, 10, and 50 participants verifying zero self-assignments and exact bijections.'),
          bullet('Security & authorization tests: unauthenticated (401), invalid organizer token (403), invalid participant token (404), and unsafe javascript: URL rejection (400).'),
          bullet('Draw precondition tests: blocks draws with <3 participants, blocks draws while registration is open, blocks duplicate draws, and blocks post-draw resets.'),
          bullet('Final Acceptance Scenario: "Christmas Mystery Exchange 2026" (10 participants, ₱500 budget, Dec 25, 2026) verified end-to-end.'),

          // 16. Troubleshooting Guide
          h1('16. Troubleshooting Guide'),
          bullet('Ensure you are opening the complete private link saved when joining.', 'Private link returns 404: '),
          bullet('Confirm the URL includes `#token=org_...` or unlock with your saved `org_` token.', 'Organizer dashboard asks for token: '),
          bullet('Check Draw Readiness on the Organizer Dashboard—registration must be closed and at least 3 participants must have joined.', 'Start Exchange button disabled: '),

          // 17. Frequently Asked Questions
          h1('17. Frequently Asked Questions'),
          p('Q: Can the organizer see who submitted which song?  A: No. The organizer only sees aggregate counts.'),
          p('Q: Can a participant receive their own song?  A: No. The derangement algorithm prevents self-assignment.'),
          p('Q: Can the draw be reset after completion?  A: No. Completed draws are permanently locked.'),

          // 18. Maintenance and Future Improvements
          h1('18. Maintenance and Future Improvements'),
          p(
            'The following items are future enhancements and are NOT part of the current v1.0.0 implementation:'
          ),
          bullet('Optional exclusion rules (e.g., preventing couples or households from drawing each other).'),
          bullet('Exportable/printable gift tag PDFs displaying each recipient’s song title.'),
          bullet('Automated scheduled reminders via optional opt-in webhooks.'),

          // 19. Glossary
          h1('19. Glossary'),
          bullet('A permutation of elements where no element appears in its original position (zero self-assignments).', 'Derangement: '),
          bullet('Cryptographically Secure Pseudorandom Number Generator (crypto.getRandomValues).', 'CSPRNG: '),
          bullet('Compare-And-Swap optimistic concurrency control using entity tags (ETags).', 'CAS / ETag: '),

          // 20. Project Conclusion
          h1('20. Project Conclusion'),
          p(
            'Mystery Exchange delivers a complete, production-ready, anonymous song-based Secret Santa platform. By combining a calm Scandinavian-minimalist frontend with strict server-side authorization, Netlify Blobs conditional writes, and a verified CSPRNG derangement engine, it fulfills all functional, privacy, and free-tier deployment goals.'
          ),
        ],
      },
    ],
  });

  const outDir = path.resolve(process.cwd(), 'documentation');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'Mystery_Exchange_Project_Documentation.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated ${outPath} (${buffer.byteLength} bytes)`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
