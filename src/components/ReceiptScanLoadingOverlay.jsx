import { useState, useEffect, useRef } from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';
import { SCAN_LOADING_QUIPS_EXTRA } from '../data/scanLoadingQuips.js';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const spinReverse = keyframes`
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(-4deg) scale(1); }
  50% { transform: rotate(4deg) scale(1.05); }
`;

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

function pickRandomQuipIndex(excludeIndex) {
  const n = SCAN_LOADING_QUIPS_EXTRA.length;
  if (n <= 1) return 0;
  let next = Math.floor(Math.random() * n);
  let guard = 0;
  while (next === excludeIndex && guard < 8) {
    next = Math.floor(Math.random() * n);
    guard += 1;
  }
  if (next === excludeIndex) {
    next = (excludeIndex + 1) % n;
  }
  return next;
}

export default function ReceiptScanLoadingOverlay({ open }) {
  const [msgIndex, setMsgIndex] = useState(() => pickRandomQuipIndex(-1));
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return undefined;
    }
    if (!prevOpenRef.current) {
      prevOpenRef.current = true;
      setMsgIndex((i) => pickRandomQuipIndex(i));
    }
    const id = window.setInterval(() => {
      setMsgIndex((i) => pickRandomQuipIndex(i));
    }, 2800);
    return () => window.clearInterval(id);
  }, [open]);

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 2,
        flexDirection: 'column',
        gap: 3,
        bgcolor: 'rgba(15, 35, 40, 0.92)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 140,
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Orbiting coins */}
        <AttachMoneyIcon
          sx={{
            position: 'absolute',
            fontSize: 40,
            color: 'success.light',
            animation: `${spin} 2.2s linear infinite`,
            top: 0,
            left: '50%',
            ml: '-20px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        />
        <SavingsIcon
          sx={{
            position: 'absolute',
            fontSize: 36,
            color: 'warning.light',
            animation: `${spinReverse} 1.8s linear infinite`,
            bottom: 8,
            right: 0,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        />
        <AttachMoneyIcon
          sx={{
            position: 'absolute',
            fontSize: 34,
            color: 'primary.light',
            animation: `${spin} 3s linear infinite`,
            bottom: 12,
            left: 0,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        />
        {/* Center receipt */}
        <ReceiptLongIcon
          sx={{
            fontSize: 72,
            color: 'common.white',
            animation: `${wiggle} 1.2s ease-in-out infinite, ${floatY} 2s ease-in-out infinite`,
            filter: 'drop-shadow(0 4px 12px rgba(38, 176, 186, 0.45))',
          }}
        />
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: 'primary.light',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
        }}
      >
        Crunching numbers
      </Typography>

      <Typography
        key={msgIndex}
        variant="body1"
        sx={{
          color: 'grey.100',
          textAlign: 'center',
          px: 3,
          maxWidth: 320,
          minHeight: 72,
          lineHeight: 1.5,
          animation: 'fadeIn 0.45s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {SCAN_LOADING_QUIPS_EXTRA[msgIndex]}
      </Typography>

      <Typography variant="caption" sx={{ color: 'grey.500', mt: 1 }}>
        Hang in there — almost done
      </Typography>
    </Backdrop>
  );
}
