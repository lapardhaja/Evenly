import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';
import { LegalP, LegalSection, LegalToc } from './LegalSection.jsx';
import {
  OPERATOR_EMAIL,
  OPERATOR_NAME,
  OPERATOR_PLACE,
  SITE_NAME,
  SITE_ORIGIN,
} from './operatorInfo.js';
import { SUBPROCESSORS } from '../../lib/subprocessors.js';

const TOC = [
  { id: 'who', label: 'Who we are' },
  { id: 'scope', label: 'Scope' },
  { id: 'collect', label: 'Information we collect' },
  { id: 'use', label: 'How we use information' },
  { id: 'chat', label: 'Chat, photos, voice notes, likes, and alerts' },
  { id: 'share-links', label: 'Share links' },
  { id: 'scan', label: 'Receipt scan' },
  { id: 'processors', label: 'Processors' },
  { id: 'legal-bases', label: 'Legal bases and “sale”' },
  { id: 'retention', label: 'Retention and your rights' },
  { id: 'children', label: 'Children' },
  { id: 'security', label: 'Security' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <LegalP>
        This Privacy Policy explains how {SITE_NAME} ({SITE_ORIGIN}) collects, uses, stores, and
        shares information when you use the service. {SITE_NAME} is operated by {OPERATOR_NAME}{' '}
        from {OPERATOR_PLACE}. For privacy requests, email{' '}
        <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>.
      </LegalP>
      <LegalToc items={TOC} />

      <LegalSection id="who" title="1. Who we are">
        <LegalP>
          {SITE_NAME} is a receipt-splitting web application. Cloud features (accounts, sync,
          friends, chat, attachments, public shares, QR join/friend invites, Web Push) run on our production Supabase
          project and Vercel deployment. Builds without those environment variables stay
          local-only: group data never leaves the browser.
        </LegalP>
      </LegalSection>

      <LegalSection id="scope" title="2. Scope">
        <LegalP>
          This policy applies to the website and PWA at {SITE_ORIGIN}, including hash routes such
          as sign-in, groups, chat, and public share pages. It does not cover third-party sites we
          link out to (for example Venmo) after you leave {SITE_NAME}.
        </LegalP>
      </LegalSection>

      <LegalSection id="collect" title="3. Information we collect">
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
          Account and profile
        </Typography>
        <LegalP>
          When cloud sign-in is enabled: email address, password (stored by Supabase Auth, not in
          our public tables), username, display name, optional first and last name, optional Venmo
          handle used only to pre-fill pay links, and an email used for friend search. Other users
          of the product can look you up by username or exact email. Treat those identifiers as
          enumerable to people who use {SITE_NAME}.
        </LegalP>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
          Groups and receipts
        </Typography>
        <LegalP>
          People labels, receipt titles, dates, line items, tax/tip/discount, who paid, allocations,
          settlement marks, and optional receipt attachments (images or PDFs). Signed-in data lives
          in Postgres with membership-based access. Local-only builds keep the same categories in
          browser storage under keys such as <code>evenly:data:v2</code>.
        </LegalP>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
          Device storage
        </Typography>
        <LegalP>
          Essential localStorage / sessionStorage as listed in the{' '}
          <Link component={RouterLink} to="/cookies">
            Cookie Policy
          </Link>
          , including theme, cookie-notice acknowledgement, optional remembered sign-in identifier,
          auth session material, and (on cloud) a short resume cache. We do not use advertising or
          analytics cookies.
        </LegalP>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
          Technical logs
        </Typography>
        <LegalP>
          Our host (Vercel) and database provider (Supabase) may process IP address, user agent,
          timestamps, and request metadata to operate and secure the service. We do not run a
          separate product-analytics SDK.
        </LegalP>
      </LegalSection>

      <LegalSection id="use" title="4. How we use information">
        <LegalP>
          We use this information to operate {SITE_NAME}: authenticate you, sync groups, compute
          settlements, send optional chat and Web Push alerts you enable, run optional receipt OCR,
          mint short-lived signed URLs for attachments you are allowed to see, and respond to
          support or legal requests. We do not sell personal information and we do not use it for
          cross-context behavioral advertising.
        </LegalP>
      </LegalSection>

      <LegalSection id="chat" title="5. Chat, photos, voice notes, likes, and alerts">
        <LegalP>
          Signed-in members can message in a group thread and in 1:1 chats with friends or people
          who share a group. Message bodies, optional photos, documents, and voice notes (private
          Storage bucket, size and type limits), and likes are visible to conversation members only
          — not on public share links. Attachments are delivered through short-lived signed URLs. If
          you enable message alerts, we store a Web Push subscription for your account and send a
          payload such as the sender name and a short preview (“Sent a photo” / “Sent a file” /
          “Sent a voice message”). Evenly does not process payments; Venmo
          links open Venmo with amount and note filled in. “I paid” is an honor-system mark in
          {SITE_NAME}.
        </LegalP>
      </LegalSection>

      <LegalSection id="share-links" title="6. Share links">
        <LegalP>
          Cloud group members can create a public share (<code>#/share/:id</code>). Anyone with an
          active link can view group name, people labels, receipts, and settlement transfers without
          signing in. If attachments are included, viewers can open those files through short-lived
          signed URLs. Revoke the share to stop new access. A legacy compressed settlement token (
          <code>#/shared-settlement/:token</code>) encodes names and amounts in the URL itself —
          treat that URL as public. Do not send share links to people who should not see that
          content. Group join QR codes and links (<code>#/join/:token</code>) add the signed-in
          scanner as a member without requiring an existing friendship. Personal QR codes and links
          (<code>#/add/:token</code>) create a friendship immediately. Treat those codes like
          invites: anyone who opens them while signed in is added. Rotate a group code from People
          if it leaked.
        </LegalP>
      </LegalSection>

      <LegalSection id="scan" title="7. Receipt scan (Gemini)">
        <LegalP>
          Optional scan posts a receipt image to Evenly’s <code>POST /api/scan</code> endpoint,
          which calls Google Gemini to extract line items and totals. Google processes that image
          under Google’s terms for the API. Evenly does not keep the scan image as an attachment
          unless you choose to keep the photo. Extracted text becomes editable receipt data shared
          with group members according to membership.
        </LegalP>
      </LegalSection>

      <LegalSection id="processors" title="8. Processors">
        <LegalP>
          We use the following processors to run the product. Each applies its own terms to data it
          processes on our behalf.
        </LegalP>
        <TableContainer sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }} aria-label="Processors">
            <TableHead>
              <TableRow>
                <TableCell>Provider</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SUBPROCESSORS.map((row) => (
                <TableRow key={row.name}>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.name}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.role}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.region}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </LegalSection>

      <LegalSection id="legal-bases" title="9. Legal bases and “do not sell”">
        <LegalP>
          If you are in the EEA, UK, or a similar jurisdiction, we process personal data to perform
          the contract (providing the app you asked for), with your consent where we ask for it
          (for example notification permission), and for legitimate interests in securing and
          operating the service. {SITE_NAME} does not sell personal information as that term is
          used in the California Consumer Privacy Act, and we do not share it for cross-context
          behavioral advertising. We honor browser Global Privacy Control / Do Not Track as a
          signal that you do not want optional tracking — we do not run that tracking today, so
          there is nothing additional to disable.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention" title="10. Retention and your rights">
        <LegalP>
          Local data lasts until you clear site data. Cloud account, group, chat, and attachment
          data last until you delete them in the product or we delete the project. Signed-in users
          can delete their account from Profile (type DELETE). That removes your Auth user (cascading
          profile, chats, and groups you own) and then removes orphaned private files. Groups you
          only joined keep a guest name. You may also request access or deletion by emailing{' '}
          <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>. We may retain limited
          records as required by law or to resolve disputes. Clearing the browser does not delete
          a cloud account.
        </LegalP>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <LegalP>
          {SITE_NAME} is not directed to children under 13, and we do not knowingly collect
          personal information from children under 13 (COPPA). If you believe a child has created
          an account, email us and we will delete it.
        </LegalP>
      </LegalSection>

      <LegalSection id="security" title="12. Security">
        <LegalP>
          Practices (TLS, row-level security, private Storage buckets, short-lived signed URLs,
          browser hardening headers) are summarized on the{' '}
          <Link component={RouterLink} to="/security">
            Security
          </Link>{' '}
          page. No method of transmission or storage is 100% secure.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes">
        <LegalP>
          We will update the effective date at the top of this page when the policy changes.
          Material changes will be posted here before they take effect where reasonably possible.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact">
        <LegalP>
          {OPERATOR_NAME} · {OPERATOR_PLACE}
          <br />
          <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>
        </LegalP>
      </LegalSection>
    </LegalPageLayout>
  );
}
