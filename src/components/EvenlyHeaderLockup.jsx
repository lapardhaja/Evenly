import Box from '@mui/material/Box';

/** Horizontal wordmark: stylized E + “venly”. Uses currentColor so parent can set theme primary. */
export default function EvenlyHeaderLockup() {
  return (
    <Box
      component="svg"
      viewBox="0 0 520 120"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden
      sx={{
        display: 'block',
        height: { xs: 28, sm: 32 },
        width: 'auto',
        maxWidth: { xs: 170, sm: 205 },
        flexShrink: 0,
        color: 'inherit',
      }}
    >
      <g transform="translate(6, 10) scale(0.19)">
        <path
          d="M18 461Q4 438 4 402V108Q4 44 65 14Q82 6 140 6H221L33 463Q26 478 18 461Z"
          fill="currentColor"
        />
        <path
          d="M268 6H510Q492 70 452 101Q410 132 356 132H226L268 6Z"
          fill="currentColor"
        />
        <path
          d="M220 184H438Q420 248 382 280Q344 312 286 312H170L220 184Z"
          fill="currentColor"
        />
        <path
          d="M112 395H496Q480 456 436 492Q394 512 330 512H68L112 395Z"
          fill="currentColor"
        />
      </g>
      <text
        x="118"
        y="78"
        fill="currentColor"
        fontFamily="'Roboto', system-ui, -apple-system, sans-serif"
        fontSize="58"
        fontWeight="600"
        letterSpacing="-0.02em"
      >
        venly
      </text>
    </Box>
  );
}
