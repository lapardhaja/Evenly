import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';

export default function CopyrightPage() {
  return (
    <LegalPageLayout title="Copyright">
      <Typography variant="body1" paragraph>
        Evenly’s name, logos, and in-app brand artwork are product marks of the operator.
        Contact for IP notices: [OPERATOR_EMAIL]. This notice is written for [JURISDICTION].
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Software and brand
      </Typography>
      <Typography variant="body1" paragraph>
        The Evenly application code and brand assets (including the header lockup and PWA icons)
        are provided for running the product. Do not copy the brand as if it were your own app.
        Third-party libraries (React, MUI, and others listed in the project) remain under their
        own licenses.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Your receipts, photos, and names
      </Typography>
      <Typography variant="body1" paragraph>
        You (and the people you split with) keep rights in the personal and receipt content you
        enter or upload. Evenly only uses that content to operate groups, OCR, attachments, and
        share pages as described in the{' '}
        <Link component={RouterLink} to="/privacy">
          Privacy Policy
        </Link>{' '}
        and{' '}
        <Link component={RouterLink} to="/terms">
          Terms
        </Link>
        . Public share links and settlement tokens can show that content to anyone who has the
        URL — including receipt images or PDFs when a group share includes attachments.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        OCR output
      </Typography>
      <Typography variant="body1" paragraph>
        Text and amounts returned from Gemini are a machine reading of an image you sent. They
        are not a claim that Evenly owns the merchant’s receipt design. You are responsible for
        correcting the items before you rely on them.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Notices
      </Typography>
      <Typography variant="body1" paragraph>
        If you believe content in Evenly infringes your copyright, email [OPERATOR_EMAIL] with
        the URL (including any <code>#/share/…</code> or receipt context), a description of the
        work, and how to reach you. The operator can remove or restrict content they host when
        they are able to.
      </Typography>
    </LegalPageLayout>
  );
}
