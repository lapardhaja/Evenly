import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

export function LegalToc({ items }) {
  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      component="nav"
      aria-label="On this page"
      sx={{
        mb: 3,
        px: 2,
        py: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        On this page
      </Typography>
      <Stack spacing={0.5} component="ol" sx={{ m: 0, pl: 2.5 }}>
        {items.map((item) => (
          <Typography key={item.id} component="li" variant="body2">
            <Link
              component="button"
              type="button"
              underline="hover"
              color="inherit"
              onClick={() => jump(item.id)}
              sx={{
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                verticalAlign: 'baseline',
              }}
            >
              {item.label}
            </Link>
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export function LegalSection({ id, title, children }) {
  return (
    <>
      <Typography
        id={id}
        variant="h6"
        component="h2"
        fontWeight={700}
        sx={{ mt: 3.5, mb: 1, scrollMarginTop: 88 }}
        tabIndex={-1}
      >
        {title}
      </Typography>
      {children}
    </>
  );
}

export function LegalP({ children }) {
  return (
    <Typography variant="body1" paragraph>
      {children}
    </Typography>
  );
}
