import Box from '@mui/material/Box';
import { quadToSvgPoints } from '../lib/scanQrOverlay.js';

const CORNER = {
  position: 'absolute',
  width: 26,
  height: 26,
  borderColor: '#7af0e0',
  borderStyle: 'solid',
};

function HuntingFrame() {
  return (
    <Box
      aria-hidden
      data-scan-frame="hunting"
      sx={{ position: 'absolute', inset: '16%', pointerEvents: 'none' }}
    >
      <Box sx={{ ...CORNER, top: 0, left: 0, borderWidth: '3px 0 0 3px' }} />
      <Box sx={{ ...CORNER, top: 0, right: 0, borderWidth: '3px 3px 0 0' }} />
      <Box sx={{ ...CORNER, bottom: 0, left: 0, borderWidth: '0 0 3px 3px' }} />
      <Box sx={{ ...CORNER, bottom: 0, right: 0, borderWidth: '0 3px 3px 0' }} />
      <Box
        sx={{
          position: 'absolute',
          left: 10,
          right: 10,
          height: 2,
          borderRadius: 1,
          bgcolor: 'rgba(122,240,224,0.9)',
          boxShadow: '0 0 10px rgba(122,240,224,0.9)',
          animation: 'evenlyScanSweep 1.5s ease-in-out infinite alternate',
          '@keyframes evenlyScanSweep': {
            from: { top: 10 },
            to: { top: 'calc(100% - 12px)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            top: '46%',
          },
        }}
      />
    </Box>
  );
}

export default function ScanQrViewfinder({
  videoRef,
  status = 'searching',
  quad,
  scanWidth,
  scanHeight,
}) {
  const hunting = status === 'searching';
  const locked = status === 'locked';
  const showQuad = Array.isArray(quad) && quad.length === 4 && scanWidth > 0 && scanHeight > 0;
  const stroke = status === 'other' ? '#ffb74d' : '#7af0e0';
  const fill = locked ? 'rgba(23,140,149,0.32)' : 'rgba(23,140,149,0.16)';

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'black',
        mb: 2,
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        playsInline
        muted
        autoPlay
        sx={{
          display: 'block',
          width: '100%',
          maxHeight: 360,
          objectFit: 'contain',
          bgcolor: 'black',
        }}
      />
      {hunting ? <HuntingFrame /> : null}
      {showQuad ? (
        <Box
          component="svg"
          viewBox={`0 0 ${scanWidth} ${scanHeight}`}
          preserveAspectRatio="xMidYMid meet"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <polygon
            points={quadToSvgPoints(quad)}
            fill={fill}
            stroke={stroke}
            strokeWidth={locked ? 6 : 4}
            strokeLinejoin="round"
          />
        </Box>
      ) : null}
      {locked ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'white',
            pointerEvents: 'none',
            animation: 'evenlyScanFlash 0.45s ease-out forwards',
            '@keyframes evenlyScanFlash': {
              from: { opacity: 0.55 },
              to: { opacity: 0 },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              opacity: 0,
            },
          }}
        />
      ) : null}
    </Box>
  );
}
