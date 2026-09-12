import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';
import { LegalP, LegalSection, LegalToc } from './LegalSection.jsx';
import { OPERATOR_EMAIL, OPERATOR_NAME, OPERATOR_PLACE, SITE_NAME } from './operatorInfo.js';

const TOC = [
  { id: 'owner', label: 'Ownership' },
  { id: 'your-content', label: 'Your content' },
  { id: 'ocr', label: 'OCR output' },
  { id: 'dmca', label: 'Copyright notices' },
  { id: 'counter', label: 'Counter-notices' },
  { id: 'repeat', label: 'Repeat infringement' },
];

export default function CopyrightPage() {
  return (
    <LegalPageLayout title="Copyright Policy">
      <LegalP>
        {SITE_NAME} respects intellectual property. This policy explains ownership of the product
        and how to send a copyright notice. Designated contact: {OPERATOR_NAME}, {OPERATOR_PLACE},{' '}
        <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>.
      </LegalP>
      <LegalToc items={TOC} />

      <LegalSection id="owner" title="1. Ownership of Evenly">
        <LegalP>
          The {SITE_NAME} name, logos, in-app brand artwork, and application code are product marks
          and copyrights of the operator. Do not copy the brand as if it were your own app.
          Third-party libraries (including React, MUI, and others listed in the project) remain
          under their own licenses.
        </LegalP>
      </LegalSection>

      <LegalSection id="your-content" title="2. Your receipts, photos, and names">
        <LegalP>
          You (and the people you split with) keep rights in the personal and receipt content you
          enter or upload. {SITE_NAME} only uses that content to operate groups, OCR, attachments,
          chat, and share pages as described in the{' '}
          <Link component={RouterLink} to="/privacy">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link component={RouterLink} to="/terms">
            Terms
          </Link>
          . Public share links and settlement tokens can show that content to anyone who has the
          URL — including receipt images or PDFs when a group share includes attachments. Chat
          photos are visible to conversation members, not on public shares.
        </LegalP>
      </LegalSection>

      <LegalSection id="ocr" title="3. OCR output">
        <LegalP>
          Text and amounts returned from Gemini are a machine reading of an image you sent. They
          are not a claim that {SITE_NAME} owns the merchant’s receipt design. You are responsible
          for correcting items before you rely on them.
        </LegalP>
      </LegalSection>

      <LegalSection id="dmca" title="4. Copyright notices (DMCA-style)">
        <LegalP>
          If you believe content hosted on {SITE_NAME} infringes your copyright, send a notice to{' '}
          <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link> that includes all of the
          following (adapted from 17 U.S.C. § 512(c)(3)):
        </LegalP>
        <Typography component="ol" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
            Your physical or electronic signature.
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
            Identification of the copyrighted work claimed to have been infringed (or a
            representative list if multiple works).
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
            Identification of the material that is claimed to be infringing, and information
            reasonably sufficient to locate it (include the full URL, such as{' '}
            <code>#/share/…</code>, a group or receipt context, or a chat conversation if you have
            it).
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
            Your name, mailing address, telephone number, and email address.
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
            A statement that you have a good-faith belief that use of the material in the manner
            complained of is not authorized by the copyright owner, its agent, or the law.
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 0.75 }}>
            A statement that the information in the notice is accurate, and under penalty of
            perjury, that you are authorized to act on behalf of the owner of an exclusive right
            that is allegedly infringed.
          </Typography>
        </Typography>
        <LegalP>
          We may remove or restrict access to the material and, where appropriate, notify the user
          who posted it. Incomplete notices may be ignored.
        </LegalP>
      </LegalSection>

      <LegalSection id="counter" title="5. Counter-notices">
        <LegalP>
          If your content was removed and you believe it was a mistake or misidentification, email
          the same address with: your signature; identification of the removed material and where
          it appeared; a statement under penalty of perjury that you have a good-faith belief it
          was removed by mistake; your name, address, and phone; and a statement that you consent
          to the jurisdiction of the Federal District Court for the district in which your address
          is located (or {OPERATOR_PLACE} if you are outside the United States) and that you will
          accept service of process from the original complainant. We may restore the material
          unless the complainant files an action seeking a court order.
        </LegalP>
      </LegalSection>

      <LegalSection id="repeat" title="6. Repeat infringement">
        <LegalP>
          We may terminate accounts of users who are repeat infringers in appropriate
          circumstances.
        </LegalP>
      </LegalSection>
    </LegalPageLayout>
  );
}
