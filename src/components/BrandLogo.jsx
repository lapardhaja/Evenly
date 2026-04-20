import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const BRAND_MARK_PATHS = [
  'M18 461Q4 438 4 402V108Q4 44 65 14Q82 6 140 6H221L33 463Q26 478 18 461Z',
  'M268 6H510Q492 70 452 101Q410 132 356 132H226L268 6Z',
  'M220 184H438Q420 248 382 280Q344 312 286 312H170L220 184Z',
  'M112 395H496Q480 456 436 492Q394 512 330 512H68L112 395Z',
];

export function BrandMark({ title = 'Evenly', decorative = false, sx = {} }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : title}
      focusable="false"
      sx={{
        width: 32,
        height: 32,
        display: 'block',
        color: 'inherit',
        fill: 'currentColor',
        flexShrink: 0,
        ...sx,
      }}
    >
      {BRAND_MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </Box>
  );
}

export default function BrandLogo({
  stacked = false,
  showWordmark = true,
  iconSize = 32,
  gap = 1.25,
  title = 'Evenly',
  sx = {},
  textSx = {},
}) {
  const mark = <BrandMark title={title} decorative={showWordmark} sx={{ width: iconSize, height: iconSize }} />;

  if (!showWordmark) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', ...sx }}>
        {mark}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        color: 'inherit',
        ...sx,
      }}
    >
      {mark}
      <Typography
        component="span"
        variant={stacked ? 'h4' : 'h6'}
        sx={{
          fontWeight: 700,
          lineHeight: stacked ? 0.9 : 1,
          letterSpacing: stacked ? '-0.04em' : '0.02em',
          textWrap: 'balance',
          ...textSx,
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}
