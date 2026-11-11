# Privacy Policy

**Universe Data Booklet** (integrated with Project Base — Planetary Explorer)

**Last updated:** 11 November 2026
**Owner / Author:** MDSUWasi (Shafiun Wasi)

This Privacy Policy describes what information the Universe Data Booklet website
collects, how it is used, and how it is protected.

---

## 1. Overview

Universe Data Booklet is an **educational, open-source** astronomy web application
that runs from a self-hosted Python server.  It is designed to **collect as
little personal data as possible**.  In most cases the site needs no
registration, account, or personal information to function.

---

## 2. Information We Collect

### 2.1 Data you provide
- The site does **not** ask for your name, email, address, phone number, or
  any account credentials.
- The chat/ask feature accepts free text queries; those queries are processed
  **only in your browser** (client-side) and are **not** transmitted to any
  server or third party.  (The local chat feature is currently under
  development and may not function correctly.)

### 2.2 Local storage (your device only)
The site stores a small amount of data **locally on your device** using the
browser's `localStorage`.  Nothing is sent to any server.  The stored items are:

| Key | Purpose | Data stored |
|---|---|---|
| `udb-theme` | Theme persistence (Universe Data Booklet) | Theme name only (e.g. `cream`) |
| `udb-density` | Density mode persistence (Universe Data Booklet) | Mode name only |
| `udb-progress` | Study/quiz progress (Universe Data Booklet) | Progress object only |
| `pb-theme` | Theme persistence (Planetary Explorer) | Theme name only |
| Discovery cache keys | Discovery Lab cache (Planetary Explorer) | Cache keys only |

You can clear all of these at any time by clearing your browser data for this
site; the site will simply reset to defaults.

### 2.3 Server-side logs
The self-hosted Python server may write minimal **access logs** (timestamp,
request path, IP address, user-agent, HTTP status) to diagnose errors and
protect the service.  These logs are **not** shared with third parties and are
retained only as long as needed for server maintenance.

### 2.4 No cookies, no analytics, no trackers
- The site sets **no cookies**.
- The site uses **no third-party analytics** (no Google Analytics, no
  StatCounter, no Facebook pixel, no ad network).
- The site uses **no advertising, no tracking scripts, no fingerprinting**.

---

## 3. How We Use Information

- Local storage values are used only to **remember your display preferences**
  and **study progress** on your own device.
- Server logs are used only to **diagnose errors, detect abuse, and keep the
  service running**.
- We do **not** sell, lease, or share your data with any third party.

---

## 4. Data Sharing & Third Parties

- **No personal data is sold or shared.**
- The site fetches public data from upstream APIs (NASA, USGS, Open-Meteo, Open
  Notify) **on your behalf**.  Those providers may log your server's IP address
  in their own access logs, subject to their own privacy policies.  The site
  itself does not transmit your personal data to them.
- Wikimedia Commons is used only to **download reference images at build
  time**; no user data is sent there at runtime.

---

## 5. Data Retention

- Local storage persists until you clear it or uninstall the site.
- Server logs are retained only as long as needed for server maintenance and
  are rotated automatically.

---

## 6. Your Rights

Depending on your jurisdiction you may have the right to:
- Access, correct, or delete personal data we hold (contact the author).
- Clear local storage at any time.
- Opt out of any future tracking (the site currently uses none).

---

## 7. Security

The site uses secure HTTP headers (`X-Frame-Options`, `X-Content-Type-Options`,
`Content-Security-Policy`, `Referrer-Policy`), path-traversal protection,
sanitised user inputs, and a rate limiter.  See the README "Security & Privacy"
section.  No method is 100% secure, but the site is designed to minimise risk.

---

## 8. Children

The site is educational and suitable for general audiences.  It does not
deliberately collect data from children.  If you believe a child has provided
personal data, contact the author and it will be removed.

---

## 9. Changes to This Policy

The author may update this Privacy Policy from time to time.  Continued use of
the site after an update constitutes acceptance of the revised policy.

---

## 10. Contact

For privacy questions, data requests, or to report a privacy issue, contact the
author via the repository's issue tracker.