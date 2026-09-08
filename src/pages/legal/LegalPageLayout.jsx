import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

const LEGAL_NAV = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/cookies', label: 'Cookies' },
  { to: '/copyright', label: 'Copyright' },
];

export default function LegalPageLayout({ title, children }) {
  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 8 }}>
      <Link component={RouterLink} to="/" underline="hover" variant="body2">
        Back to Evenly
      </Link>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: 8 September 2026. These pages describe how Evenly works. They are not legal
        advice.
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
