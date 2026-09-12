import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';
import { LegalP, LegalSection, LegalToc } from './LegalSection.jsx';
import { OPERATOR_EMAIL, SITE_NAME, SITE_ORIGIN } from './operatorInfo.js';
import { CHAT_SIGNED_URL_TTL_SECONDS } from '../../lib/chatMedia.js';

const TOC = [
  { id: 'report', label: 'Reporting a vulnerability' },
  { id: 'transport', label: 'Transport and hosting' },
  { id: 'auth', label: 'Authentication' },
  { id: 'authz', label: 'Authorization' },
  { id: 'storage', label: 'File storage' },
  { id: 'browser', label: 'Browser hardening' },
  { id: 'apis', label: 'APIs' },
  { id: 'scope', label: 'Out of scope' },
];

export default function SecurityPage() {
  return (
    <LegalPageLayout title="Security">
      <LegalP>
        This page summarizes how {SITE_NAME} is built to protect accounts and group data. It is
        not a guarantee. Production: {SITE_ORIGIN}. To report a vulnerability, email{' '}
        <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link> (also listed in{' '}
        <Link href="/.well-known/security.txt">security.txt</Link>
        ).
      </LegalP>
      <LegalToc items={TOC} />

      <LegalSection id="report" title="1. Reporting a vulnerability">
        <LegalP>
          Please email a description, affected URL or API, and steps to reproduce. Do not open a
          public GitHub issue for unreleased vulnerabilities. We will aim to acknowledge reports
          and to avoid legal action against good-faith research that stays within this product and
          does not access other users’ data beyond what is needed to demonstrate the issue.
        </LegalP>
      </LegalSection>

      <LegalSection id="transport" title="2. Transport and hosting">
        <LegalP>
          Production is served over HTTPS on Vercel. We send HTTP Strict Transport Security
          (two-year max-age, includeSubDomains; we do not currently submit to the HSTS preload
          list). The Gemini API key and Web Push private keys stay on the server; they are not
          shipped in the JavaScript bundle.
        </LegalP>
      </LegalSection>

      <LegalSection id="auth" title="3. Authentication">
        <LegalP>
          Cloud sign-in uses Supabase Auth (email and password). Passwords are stored by Auth, not
          in public Postgres tables. Password-reset tokens are captured in sessionStorage before
          the PWA service worker so they are not dropped, then consumed on the update-password
          route.
        </LegalP>
      </LegalSection>

      <LegalSection id="authz" title="4. Authorization">
        <LegalP>
          Group, receipt, chat, and friend tables are protected with row-level security.
          Membership RPCs do not let you promote yourself to owner or add non-friends as a
          backdoor. Last-write-wins sync is a product tradeoff, not an IDOR bypass.
        </LegalP>
      </LegalSection>

      <LegalSection id="storage" title="5. File storage">
        <LegalP>
          Receipt attachments and chat photos live in private Storage buckets (MIME and size
          limits; UUID paths; no public object URLs). Clients mint short-lived signed URLs after
          authorization — receipt attachments about two minutes, chat photos {CHAT_SIGNED_URL_TTL_SECONDS}{' '}
          seconds. Public share viewers only receive paths when the share is active and attachments
          are included.
        </LegalP>
      </LegalSection>

      <LegalSection id="browser" title="6. Browser hardening">
        <LegalP>
          Responses include <code>X-Content-Type-Options: nosniff</code>,{' '}
          <code>X-Frame-Options: DENY</code>, a Content-Security-Policy that defaults to{' '}
          <code>'self'</code> (with limited exceptions for Google Fonts, inline boot script, MUI
          styles, and Supabase), <code>Referrer-Policy: strict-origin-when-cross-origin</code>, and
          a Permissions-Policy that disables camera, microphone, geolocation, Payment Request, USB,
          and Topics. Cross-Origin-Opener-Policy is <code>same-origin-allow-popups</code> so Venmo
          pay popups still work. We do not set COEP, which would break fonts and signed images.
          The UI does not use <code>dangerouslySetInnerHTML</code>.
        </LegalP>
      </LegalSection>

      <LegalSection id="apis" title="7. APIs">
        <LegalP>
          <code>POST /api/scan</code> and <code>POST /api/chat-push</code> apply CORS allowlisting
          (never <code>Access-Control-Allow-Origin: *</code>), optional scan secret, JSON
          <code>Cache-Control: no-store</code>, and best-effort per-IP rate limits. Scan errors
          returned to the browser are generic; model and key details stay in server logs. Chat
          push requires a valid user access token and only notifies members of that conversation
          other than the sender.
        </LegalP>
      </LegalSection>

      <LegalSection id="scope" title="8. Residual risk / out of scope">
        <LegalP>
          Usernames and emails are enumerable through in-app search by design (friend find). Anyone
          with an active public share URL can view that group’s receipts (and attachments if
          included). In-memory API rate limits reset on serverless cold start. See also{' '}
          <Link component={RouterLink} to="/privacy">
            Privacy
          </Link>{' '}
          and{' '}
          <Link component={RouterLink} to="/cookies">
            Cookies
          </Link>
          .
        </LegalP>
      </LegalSection>
    </LegalPageLayout>
  );
}
