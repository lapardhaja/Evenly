import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import { LEGAL_NAV } from './legalNav.js';
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_VERSION,
  SITE_NAME,
} from './operatorInfo.js';

export default function LegalPageLayout({ title, children }) {
  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 8 }}>
      <Link component={RouterLink} to="/" underline="hover" variant="body2">
        Back to {SITE_NAME}
      </Link>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Effective date: {LEGAL_EFFECTIVE_DATE} · Version {LEGAL_VERSION}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        These documents describe how {SITE_NAME} works. They are not legal advice. If you need
        advice about your situation, consult a lawyer licensed in your jurisdiction.
      </Typography>
      <Box
        component="article"
        sx={{
          '& code': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.875em',
            px: 0.5,
            py: 0.125,
            borderRadius: 0.5,
            bgcolor: 'action.hover',
            color: 'text.primary',
          },
          '& table': { width: '100%' },
        }}
      >
        {children}
      </Box>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}
      >
        {LEGAL_NAV.map((item) => (
          <Link key={item.to} component={RouterLink} to={item.to} variant="body2" underline="hover">
            {item.label}
          </Link>
        ))}
      </Stack>
    </Container>
  );
}
