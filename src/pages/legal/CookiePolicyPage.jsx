import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy">
      <Typography variant="body1" paragraph>
        Evenly is a client-side web app. It uses essential browser storage so the product can
        run. It does not currently set marketing, advertising, or analytics cookies. Operator:
        [OPERATOR_EMAIL]. Place: [JURISDICTION].
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        What we mean by “cookies”
      </Typography>
      <Typography variant="body1" paragraph>
        Browsers may also keep localStorage, sessionStorage, and similar keys. This policy covers
        those essential stores Evenly uses, even when they are not HTTP cookies.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Essential storage (always on for the app to work)
      </Typography>
      <Typography component="ul" sx={{ pl: 3, mb: 2 }}>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Local group/receipt JSON in local-only mode (<code>evenly:data:v2</code> and related
          keys).
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Theme mode so light/dark preference survives a reload.
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Optional remembered login identifier.
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          Auth session material from Supabase in the browser when you are signed in (needed to
          stay logged in).
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
          A local flag that you dismissed the essential-storage notice, when that banner is
          shown.
        </Typography>
      </Typography>
      <Typography variant="body1" paragraph>
        There is no separate “reject non-essential cookies” control because Evenly does not
        offer optional tracking cookies today. If analytics are added later, this page and
        the banner should be updated before they run.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Third parties
      </Typography>
      <Typography variant="body1" paragraph>
        Sign-in, sync, Storage, and OCR go to Supabase and (for scans) Google via Evenly’s
        server. Those services may set their own cookies on their domains. Hosting (for example
        Vercel or GitHub Pages) may log requests. See the{' '}
        <Link component={RouterLink} to="/privacy">
          Privacy Policy
        </Link>{' '}
        for data categories.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        How to clear
      </Typography>
      <Typography variant="body1" paragraph>
        Use your browser’s site-data or cookie controls for this origin. Clearing storage signs
        you out of this browser and, in local-only mode, deletes groups stored only on the
        device. Questions: [OPERATOR_EMAIL].
      </Typography>
    </LegalPageLayout>
  );
}
