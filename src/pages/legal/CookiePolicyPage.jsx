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
import { OPERATOR_EMAIL, OPERATOR_PLACE, SITE_NAME } from './operatorInfo.js';
import { COOKIE_INVENTORY, COOKIE_POLICY_SCOPE } from '../../lib/cookieInventory.js';

const TOC = [
  { id: 'meaning', label: 'What we mean by cookies' },
  { id: 'inventory', label: 'Cookie and storage inventory' },
  { id: 'choices', label: 'Your choices' },
  { id: 'third', label: 'Third parties' },
  { id: 'clear', label: 'How to clear' },
];

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy">
      <LegalP>
        This Cookie Policy describes how {SITE_NAME} uses cookies and similar technologies.
        Operator contact:{' '}
        <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>. Place of operation:{' '}
        {OPERATOR_PLACE}. {COOKIE_POLICY_SCOPE}
      </LegalP>
      <LegalToc items={TOC} />

      <LegalSection id="meaning" title="1. What we mean by “cookies”">
        <LegalP>
          A cookie is a small file a site stores on your device. {SITE_NAME} is a client-side web
          app and also uses localStorage, sessionStorage, Cache Storage (PWA), and — if you enable
          message alerts — the Push API. This policy covers those stores even when they are not
          HTTP cookies. We currently set <strong>strictly necessary</strong> technologies only. We
          do not set advertising, marketing, or analytics cookies, and we do not use third-party
          ad pixels.
        </LegalP>
      </LegalSection>

      <LegalSection id="inventory" title="2. Cookie and storage inventory">
        <LegalP>
          All of the following are first-party and required for the feature they support. There is
          no optional tracking category to switch off.
        </LegalP>
        <TableContainer sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small" aria-label="Cookie and storage inventory">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Store</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {COOKIE_INVENTORY.map((row) => (
                <TableRow key={row.name}>
                  <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <code>{row.name}</code>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.store}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.purpose}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.duration}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </LegalSection>

      <LegalSection id="choices" title="3. Your choices">
        <LegalP>
          Because {SITE_NAME} does not offer non-essential cookies, the banner asks you to
          acknowledge essential storage rather than to opt into advertising. You can open Cookie
          settings from the banner (or read this page) at any time. Blocking all storage in the
          browser will sign you out, reset appearance, and — in local-only mode — delete groups
          stored only on that device.
        </LegalP>
      </LegalSection>

      <LegalSection id="third" title="4. Third parties">
        <LegalP>
          Sign-in, sync, Storage, Realtime, OCR, and Web Push go to the processors listed in the{' '}
          <Link component={RouterLink} to="/privacy">
            Privacy Policy
          </Link>
          . Those services may set their own cookies on their own domains (for example
          supabase.co). Hosting may log requests. Google Fonts are loaded from Google’s domains to
          render the UI; that request is not used by {SITE_NAME} as an analytics cookie.
        </LegalP>
      </LegalSection>

      <LegalSection id="clear" title="5. How to clear">
        <LegalP>
          Use your browser’s site-data or cookie controls for this origin (often Settings → Privacy
          → Cookies and site data). That signs you out of this browser. Questions:{' '}
          <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>.
        </LegalP>
      </LegalSection>
    </LegalPageLayout>
  );
}
