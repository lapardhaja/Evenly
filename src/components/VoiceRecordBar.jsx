import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseIcon from '@mui/icons-material/Pause';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import { formatVoiceClock, VOICE_WAVE_BARS } from '../lib/chatVoice.js';

export default function VoiceRecordBar({
  elapsedMs,
  levels = [],
  paused,
  sending,
  onCancel,
  onTogglePause,
  onSend,
}) {
  const bars = Array.from({ length: VOICE_WAVE_BARS }, (_, i) => {
    const offset = VOICE_WAVE_BARS - levels.length;
    return i < offset ? 0 : levels[i - offset] || 0;
  });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        width: '100%',
        minWidth: 0,
      }}
    >
      <IconButton
        type="button"
        color="inherit"
        aria-label="Discard voice note"
        onClick={onCancel}
        disabled={sending}
        sx={{ color: 'text.secondary' }}
      >
        <DeleteOutlineIcon />
      </IconButton>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          aria-hidden
          sx={{
            flex: 1,
            minWidth: 0,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            gap: '1.5px',
          }}
        >
          {bars.map((v, i) => (
            <Box
              key={i}
              sx={{
                flex: '1 1 0',
                maxWidth: 3,
                height: `${Math.max(4, Math.round(4 + v * 24))}px`,
                borderRadius: 999,
                bgcolor: paused ? 'text.disabled' : 'text.primary',
                opacity: paused ? 0.55 : 0.9,
              }}
            />
          ))}
        </Box>
        <Typography
          variant="body2"
          sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 36, color: 'text.secondary' }}
        >
          {formatVoiceClock(elapsedMs)}
        </Typography>
      </Box>
      <IconButton
        type="button"
        aria-label={paused ? 'Resume voice note' : 'Pause voice note'}
        onClick={onTogglePause}
        disabled={sending}
        sx={{
          width: 40,
          height: 40,
          bgcolor: 'error.main',
          color: 'error.contrastText',
          '&:hover': { bgcolor: 'error.dark' },
        }}
      >
        {paused ? <MicIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
      </IconButton>
      <IconButton
        type="button"
        aria-label="Send voice note"
        onClick={onSend}
        disabled={sending}
        sx={{
          width: 48,
          height: 48,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
}
