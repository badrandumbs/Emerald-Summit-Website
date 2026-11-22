# Emerald Summit — Fix List (from 2026-11-20 meeting)

Owner is Akhil unless noted. Code pointers come from a quick search of the repo; check them before editing.

## Status (updated 2026-11-20, not committed yet)

**Done in code:** 1.1 favicon (new file names plus a favicon.ico), 1.4 stats order, 1.9 sponsors off the public site (section and nav link removed), 1.10 FAQ heading, 1.11 contact line, 1.12 "admin" → "organizer" and 1.13 "session" → "track" in on-screen text. Also: the GitHub description and README intro now describe this as the official website, not a prototype.

**Needs an organizer edit in the live database** (the discipline pages list the `sessions` rows): 1.5 CS/Engineering use "… Presentations" + "… Exhibits"; give the other disciplines the same pair. 1.6 BioSphere/ImagineX order follows `start_time` (all 9:30 today, so stagger them, art and literature first). 1.7 NovaSphere has only one row: add "Core Science". 1.8 rename "Business Management & Marketing" and order Entrepreneurship first.

**Domain:** emeraldsummit27.ehsacademics.org is a Squarespace 302 forward to emerald-summit.vercel.app. Steps to fix it are in README → Domain.

## 1. Website fixes (Akhil)

| # | Fix | Priority | Where to look |
|---|-----|----------|---------------|
| 1.1 | **Safari logo**: Safari shows the old Emerald Summit logo; Chrome is fine. Likely cache (bust it with a new filename or `?v=` query) or a Safari-only CSS/SVG issue | High | `BrandMark`, `public/` logo asset |
| 1.2 | **Sun animation**: stop at the peak of the summit arc, don't keep going | Low | `src/landing/SunArc.tsx` (`SUN_ARC_MS`) |
| 1.3 | **Donation buttons**: remove from the current section and put them somewhere else (new spot not decided) | Med | `src/pages/WelcomePage.tsx:467` (`<EafDonateCorner />`), `src/components/home/LinksCard` |
| 1.4 | **Stats order on disciplines**: "1 day, 6 disciplines, 20+ tracks, 30+ visiting experts" | Med | `StatTiles`, `src/landing/dayParts.ts` |
| 1.5 | **Column labels**: every discipline page says "Presentations, Exhibits", in the same column order as CS/Engineering | Med | discipline page components (`src/components/verse/`) |
| 1.6 | **BioSphere / ImagineX**: art and literature first, music below | Med | discipline data in `src/models/` |
| 1.7 | **Core Science**: add the second column; separator lines must match the other discipline pages | Med | discipline page components |
| 1.8 | **VentureVerse**: rename "Business Management" to "Entrepreneurship Shark Tank"; put entrepreneurship above marketing. Rewrite the session descriptions with AI, using the EAF slideshow on ehsacademics.org | Med | VentureVerse track data |
| 1.9 | **Sponsors**: take all sponsors off the public site, with no "past sponsors" section either. Sponsors move to the dashboard (see 5.1). **Done locally but not committed**: `sponsors.ts`, `landing.css`, the test, and 4 deleted logos in `public/sponsors/` | High | `src/models/sponsors.ts`, `SponsorTerraces` |
| 1.10 | **FAQ heading**: change "Anything else before January?" to "FAQ" or "Frequently Asked Questions" | Low | `src/components/FaqSection.tsx:97` |
| 1.11 | **Contact**: just "Questions? Email us", with no date | Low | `LandingFooter` / contact section |
| 1.12 | **"admin" to "organizer"** everywhere | High | 290 hits in 72 files (see the note below) |
| 1.13 | **"sessions" to "tracks"** everywhere | High | 1,689 hits in 103 files (see the note below) |
| 1.14 | **Pages search**: searching "Techverse" should open the Techverse discipline page | Med | the site search / Pages feature |

> **Careful with 1.12 and 1.13.** Most of those hits are code names, not words people read: the `Session` model, Supabase auth `session`, DB columns, and role keys such as `admin`. Change only the text users see. Renaming identifiers or DB values would break auth and stored data.

## 2. Panel discussions (new feature)

- Each discipline gets panel discussions as their own listed item: about 20 minutes of expert talk, then Q&A (fireside-chat format).
- Not one per track. Panels can be combined, e.g. one for CS + Engineering, and one for VentureVerse marketing + entrepreneurship.
- Attendees sign up to add a panel to their personal schedule.
- Experts are automatically assigned to the panel that matches their area.
- Each discipline reuses one of its rooms for its panel, e.g. the Techverse room for the Techverse panel.

## 3. Login and role-switching bugs

| # | Item | Owner |
|---|------|-------|
| 3.1 | **Role defaulting bug**: someone who logs in under the wrong role is silently sent to the role they registered with before. Cause: the updated code of conduct asks existing users to accept it again. **Fix:** show a notification that explains the role switch instead of redirecting silently | Akhil |
| 3.2 | OTP emails now come from `app@ehsacademics.org` (Resend; Mr. Palwal verified the DNS). Make sure the app config uses this sender | Akhil |
| 3.3 | Create the "app" user account and set an auto-reply that points people to `support@ehsacademics.org` | Mr. Palwal |
| 3.4 | Set up or reset Akhil's EHS Academics account password so the email setup can be finished | Mr. Palwal → Akhil |
| 3.5 | **Switch Role**: confirmed working, keep it on. The backend handles downgrades (participant to spectator) and updates the schedule. Participants also get a Spectate button, hidden until registration opens | Verify only |
| 3.6 | **Test accounts are inflating seat counts**: delete them before the final testing round | Akhil |

## 4. Archie chatbot (Arjun leads; stays hidden for now)

About 90% built, working on mobile, currently hidden. **The mobile app comes first.** Archie is enabled only after a full review.

- Answers must come only from the summit documents (RAG). No made-up answers.
- Guardrails needed before launch:
  - Filter abusive and off-topic questions (e.g. "How's the weather in Seattle?").
  - For off-topic questions, reply: "I don't have an answer; do you want me to email the organizers?"
  - Never send an email automatically. The user must confirm first.
- Grow Archie beyond Q&A so it can take actions (e.g. "Add this to my schedule").
- Add a governance and monitoring module. Mr. Palwal will share a reference presentation.

## 5. Dashboard and launch

| # | Item | Owner | When |
|---|------|-------|------|
| 5.1 | New **"Summit 27"** tab in the left nav, next to My Summit and Account: keynote info, sponsors, team details | Akhil | — |
| 5.2 | Confirm the keynote start time (expected 8:30 AM) | Mr. Palwal | — |
| 5.3 | Ask MidUSD to whitelist the site. Plan: invite teachers as spectators so they run into the block themselves | — | Week of Nov 27 |
| 5.4 | One more full testing round with registration open. Clean up test accounts first, then Mr. Palwal does the final review | All | Before launch |
| 5.5 | Prepare a presentation on the app's architecture, extensibility and AI integration, possibly in two versions (product design track and CS track) | Akhil | — |
| 5.6 | Expert flow work | Arjun | This weekend |

## Suggested order for Akhil

1. Commit and push the sponsor removal (1.9). It's already done locally.
2. Do the quick copy fixes: 1.4, 1.10, 1.11, 1.8 (rename only).
3. Replace "admin" and "sessions" in the text users see (1.12, 1.13).
4. Fix the Safari logo (1.1) and the role-switch notification (3.1).
5. Fix the discipline page layout (1.5–1.7) and search (1.14).
6. Build the Summit 27 tab (5.1), then panel discussions (section 2).
7. Clean up test accounts (3.6), then run the final test round (5.4).
