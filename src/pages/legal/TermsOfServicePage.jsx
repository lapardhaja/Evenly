import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import LegalPageLayout from './LegalPageLayout.jsx';
import { LegalP, LegalSection, LegalToc } from './LegalSection.jsx';
import {
  OPERATOR_EMAIL,
  OPERATOR_LAW,
  OPERATOR_NAME,
  OPERATOR_PLACE,
  SITE_NAME,
  SITE_ORIGIN,
} from './operatorInfo.js';

const TOC = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'account', label: 'Accounts' },
  { id: 'license', label: 'License' },
  { id: 'content', label: 'Your content' },
  { id: 'acceptable', label: 'Acceptable use' },
  { id: 'money', label: 'Money and third parties' },
  { id: 'disclaimer', label: 'Disclaimer' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'law', label: 'Governing law' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <LegalP>
        These Terms of Service (“Terms”) are a contract between you and {OPERATOR_NAME}{' '}
        (“operator,” “we”) for use of {SITE_NAME} at {SITE_ORIGIN}. By creating an account,
        clicking through, or using the service, you agree to these Terms and the{' '}
        <Link component={RouterLink} to="/privacy">
          Privacy Policy
        </Link>
        . If you do not agree, do not use {SITE_NAME}.
      </LegalP>
      <LegalToc items={TOC} />

      <LegalSection id="agreement" title="1. The service">
        <LegalP>
          {SITE_NAME} helps people split receipts: groups, people, items, who paid, and settlement
          transfers. Cloud mode (when configured) adds accounts, sync, friends, attachments, public
          group share, group and 1:1 chat (including photos, voice notes, and likes), Web Push, and Venmo pay
          links. Local-only mode keeps group data in the browser. Features may change. The service
          is provided as-is.
        </LegalP>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <LegalP>
          You must be at least 13 years old. If you are under the age of majority in your
          jurisdiction, you may use {SITE_NAME} only with the involvement of a parent or guardian
          who agrees to these Terms.
        </LegalP>
      </LegalSection>

      <LegalSection id="account" title="3. Accounts">
        <LegalP>
          You must provide accurate information, keep your password confidential, and are
          responsible for activity under your login. Do not impersonate others in profiles or
          friend requests. Username and email search exist so friends can find you; do not list
          identifiers you are not willing to have looked up in-app.
        </LegalP>
      </LegalSection>

      <LegalSection id="license" title="4. License to use Evenly">
        <LegalP>
          We grant you a limited, revocable, non-exclusive, non-transferable license to use
          {SITE_NAME} for personal, non-commercial receipt splitting. You may not copy the product
          as your own service, scrape at scale, reverse engineer except where law allows, or
          remove brand marks except as needed to use the app.
        </LegalP>
      </LegalSection>

      <LegalSection id="content" title="5. Your content">
        <LegalP>
          You retain rights in names, receipt text, photos, PDFs, and chat you add. You grant us a
          worldwide, non-exclusive license to host, process, and display that content solely to
          operate {SITE_NAME}: to you, to group or conversation members, and to anyone you give a
          share link. You represent you have the right to share it. Receipt scans send an image to
          Google Gemini; extracted values become editable receipt data. Chat photos and voice notes
          are stored in a private bucket and shown via short-lived URLs to conversation members.
        </LegalP>
      </LegalSection>

      <LegalSection id="acceptable" title="6. Acceptable use">
        <LegalP>
          Do not abuse the scan API, Storage, Auth, chat, or push (spam, malware, scraping at
          scale, attempts to access other users’ groups, bypassing membership or share-link
          checks). Do not use {SITE_NAME} to harass people or to publish others’ personal data
          without a reason they would expect. We may suspend or terminate access that harms the
          service or other users, including after a valid copyright notice as described in the{' '}
          <Link component={RouterLink} to="/copyright">
            Copyright
          </Link>{' '}
          policy.
        </LegalP>
      </LegalSection>

      <LegalSection id="money" title="7. Money and third parties">
        <LegalP>
          Settlement amounts are calculations for convenience. {SITE_NAME} is not a bank, money
          transmitter, or payment processor and does not move funds. Pay on Venmo opens Venmo’s
          app or website; you complete the payment there under Venmo’s terms. “I paid” only updates
          {SITE_NAME} records. Gemini OCR, hosting, and Auth are provided by the processors named
          in the Privacy Policy.
        </LegalP>
      </LegalSection>

      <LegalSection id="disclaimer" title="8. Disclaimer of warranties">
        <LegalP>
          TO THE MAXIMUM EXTENT PERMITTED BY {OPERATOR_LAW.toUpperCase()}, {SITE_NAME.toUpperCase()}{' '}
          IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
          IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. We do not warrant that OCR, settlements, or sync will be error-free.
        </LegalP>
      </LegalSection>

      <LegalSection id="liability" title="9. Limitation of liability">
        <LegalP>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR WILL NOT BE LIABLE FOR INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR
          GOODWILL, ARISING FROM YOUR USE OF {SITE_NAME.toUpperCase()}, EVEN IF ADVISED OF THE
          POSSIBILITY. OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE SERVICE IS LIMITED TO
          FIFTY U.S. DOLLARS (US $50) OR THE AMOUNT YOU PAID US FOR THE SERVICE IN THE TWELVE
          MONTHS BEFORE THE CLAIM (CURRENTLY ZERO, BECAUSE {SITE_NAME.toUpperCase()} IS OFFERED
          WITHOUT A FEE). Some jurisdictions do not allow certain limits; in those places, the
          limit applies to the fullest extent allowed.
        </LegalP>
      </LegalSection>

      <LegalSection id="termination" title="10. Termination">
        <LegalP>
          You may stop using {SITE_NAME} at any time. Signed-in users can delete their account in
          Profile (type DELETE to confirm). That removes your login, profile, chats, and groups
          you own. You may also request deletion by email as described in the Privacy Policy. We
          may suspend or stop the service or your access, with or without notice, if we
          discontinue the product or if you breach these Terms.
        </LegalP>
      </LegalSection>

      <LegalSection id="law" title="11. Governing law">
        <LegalP>
          These Terms are governed by the laws of {OPERATOR_LAW}, excluding conflict-of-law rules.
          Exclusive venue for disputes is the state or federal courts located in {OPERATOR_PLACE},
          and you consent to personal jurisdiction there. We do not require arbitration or a class
          action waiver. If a provision is unenforceable, the rest remains in effect.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes">
        <LegalP>
          We may update these Terms by posting a new version with a new effective date. Continued
          use after that date is acceptance of the new Terms. If you do not agree, stop using the
          service.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact">
        <LegalP>
          {OPERATOR_NAME} · {OPERATOR_PLACE}
          <br />
          <Link href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</Link>
        </LegalP>
        <LegalP>
          Related:{' '}
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
          ,{' '}
          <Link component={RouterLink} to="/security">
            Security
          </Link>
          .
        </LegalP>
      </LegalSection>
    </LegalPageLayout>
  );
}
