import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <Typography variant="body1" paragraph>
        These terms are a plain-language template for using Evenly. They are not a substitute
        for counsel. Contact: [OPERATOR_EMAIL]. Place of operation: [JURISDICTION].
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        The service
      </Typography>
      <Typography variant="body1" paragraph>
        Evenly helps people split receipts: groups, people, items, who paid, and settlement
        transfers. You may use a local-only mode (data in the browser) or a cloud mode (Supabase
        account, sync, friends, attachments, public group share) when the operator has configured
        it. The app is provided as-is; availability and features can change.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Your account
      </Typography>
      <Typography variant="body1" paragraph>
        If you create an account, you must use a password you control and keep it secret. You
        are responsible for activity under your login. Do not impersonate others in profiles or
        friend requests. Username and email search exist so friends can find you.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Your content
      </Typography>
      <Typography variant="body1" paragraph>
        You retain rights in names, receipt text, photos, and PDFs you add. You grant Evenly
        permission to store and display that content to provide the product: to you, to group
        members, and to anyone you give a share link. Do not upload content you are not allowed
        to share. Receipt scans send an image to Google Gemini; extracted values become editable
        receipt data.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Sharing and groups
      </Typography>
      <Typography variant="body1" paragraph>
        Inviting a friend into a group lets them see and edit that group’s receipts and
        attachments as the product allows. A public group share link lets anyone with the URL
        view receipts and, if enabled, attachments, without an account. Legacy settlement tokens
        expose whoever is named in the encoded transfers. You choose when to create, copy, or
        revoke those links. Do not use Evenly to harass people or to publish others’ personal
        data without a reason they would expect.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Acceptable use
      </Typography>
      <Typography variant="body1" paragraph>
        Do not abuse the scan API, Storage, or Auth (spam, scraping at scale, malware, attempts
        to access other users’ groups). Do not try to bypass membership or share-link checks.
        The operator may suspend access that harms the service or other users.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Money
      </Typography>
      <Typography variant="body1" paragraph>
        Settlement amounts are calculations for convenience. Evenly is not a payment processor
        and does not move money. You are responsible for how you settle outside the app.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Disclaimer
      </Typography>
      <Typography variant="body1" paragraph>
        The software is offered without warranty to the extent allowed in [JURISDICTION].
        Related notices:{' '}
        <Link component={RouterLink} to="/privacy">
          Privacy
        </Link>
        ,{' '}
        <Link component={RouterLink} to="/cookies">
          Cookies
        </Link>
        ,{' '}
        <Link component={RouterLink} to="/copyright">
          Copyright
        </Link>
        .
      </Typography>
    </LegalPageLayout>
  );
}
