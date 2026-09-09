import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';
import { OPERATOR_EMAIL, OPERATOR_PLACE } from './operatorInfo.js';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <Typography variant="body1" paragraph>
        Evenly is a receipt-splitting app. This page describes what data the product stores,
        where it goes, and who can see it. Operator:{' '}
        <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>. Governing place:{' '}
        {OPERATOR_PLACE}.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Who this applies to
      </Typography>
      <Typography variant="body1" paragraph>
        It applies if you use Evenly in the browser (local-only or signed in), scan a receipt,
        add friends, or open a share link. Signed-in features need Evenly’s Supabase project
        (Auth, Postgres, Storage). Local-only builds keep group data on your device.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Data on your device (localStorage)
      </Typography>
      <Typography variant="body1" paragraph>
        Evenly uses browser localStorage for essential app function, not advertising:
      </Typography>
      <Typography component="ul" sx={{ pl: 3, mb: 2 }}>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Group and receipt data under <code>evenly:data:v2</code> (and related keys) in
          local-only mode. After a successful signed-in cloud load, that app-data key is
          removed so groups live in Postgres instead.
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Theme preference (<code>evenly:themeMode</code>).
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Optional remembered sign-in identifier if you choose “remember me.”
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Short-lived auth helper keys during password-reset / session handshake.
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          A dismiss flag for the essential-storage notice (when that banner is shown).
        </Typography>
      </Typography>
      <Typography variant="body1" paragraph>
        You can clear this by clearing site data for Evenly in your browser. That does not
        delete a cloud account or Postgres rows.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Account, profiles, and friends (Supabase Auth + Postgres)
      </Typography>
      <Typography variant="body1" paragraph>
        When cloud sign-in is enabled, Evenly uses Supabase Auth (email and password). Passwords
        are stored by Auth, not in Evenly’s public tables. Profiles may include username,
        display name, optional first/last name, optional Venmo username (for pay links), and an email used for friend search. Friend
        requests and accepted friendships are stored so you can invite friends into groups.
        Other users can find you by username or email through in-app search; treat those as
        enumerable to people who use the product.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Groups, receipts, and sync
      </Typography>
      <Typography variant="body1" paragraph>
        Signed-in group data (people, receipts, items, allocations, settlement marks) is stored
        in Postgres and loaded after sign-in. Access is membership-based: owners and invited
        members can read and edit group content according to the app’s rules. Evenly syncs
        that data when you change it while signed in.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Chat and Venmo pay links
      </Typography>
      <Typography variant="body1" paragraph>
        Signed-in members can message in a group thread and in 1:1 chats with friends or people
        who share a group. Messages live in Postgres and are visible to conversation members
        only (not on public share links). Settlement can post a payment-request card with amount
        and a Venmo username. Tapping Pay on Venmo opens Venmo (or venmo.com) with amount and
        note filled in. Evenly does not process payments, does not receive a receipt from Venmo,
        and “I paid” is an honor-system mark on the settlement list.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Receipt attachments (Supabase Storage)
      </Typography>
      <Typography variant="body1" paragraph>
        Cloud builds can attach images or PDFs to a receipt (private Storage bucket, size and
        type limits). Files are stored under group/receipt identifiers. Members of that group
        can open them via short-lived signed URLs. Local-only builds do not upload attachments.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Receipt scan / OCR (Gemini)
      </Typography>
      <Typography variant="body1" paragraph>
        Optional scan sends a receipt image to Evenly’s <code>POST /api/scan</code> endpoint,
        which calls Google Gemini to extract line items and totals. Google processes that image
        under Google’s terms for the API. Evenly does not keep the scan image as an attachment
        unless you choose to keep the photo. Extracted text and amounts become receipt data you
        (and group members) can edit.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Settlement share links (legacy)
      </Typography>
      <Typography variant="body1" paragraph>
        You can share a compressed settlement summary as <code>#/shared-settlement/:token</code>.
        Anyone with the link can see names, amounts, and any note encoded in that token. The
        token is the data; treat the URL as public. Old links keep working if you still share
        them.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Public group share (receipts and attachments)
      </Typography>
      <Typography variant="body1" paragraph>
        Cloud group members can create a public share (<code>#/share/:id</code>) from the Settle
        tab. Anyone with an active link can view group name, people labels, receipts (items,
        payer, tax/tip/discount, allocations), and settlement transfers — without signing in. If
        attachments are included (default on; you can turn this off before creating a link),
        viewers can open those files through short-lived signed URLs. Members can copy or revoke
        a share; revoked or missing ids do not return group data. Anyone with the link can view
        receipts and attachments until you revoke it. Do not share that URL beyond people you
        trust with that content. Local-only builds keep the compressed settlement-token link
        instead of this server share.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Processors
      </Typography>
      <Typography variant="body1" paragraph>
        Hosting and APIs may include Vercel (the static app and scan endpoint),
        Supabase (Auth, database, Storage), and Google (Gemini OCR). Their own privacy terms
        apply to data they process.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Retention and requests
      </Typography>
      <Typography variant="body1" paragraph>
        Local data lasts until you clear it. Cloud account and group data last until you delete
        them in the product or the operator deletes the project. To ask about access or deletion
        of cloud data the operator controls, email{' '}
        <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Cookies
      </Typography>
      <Typography variant="body1" paragraph>
        See the{' '}
        <Link component={RouterLink} to="/cookies">
          Cookie Policy
        </Link>
        . Evenly does not currently run marketing or analytics cookies.
      </Typography>
    </LegalPageLayout>
  );
}
