import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { formatVoiceClock } from '../lib/chatVoice.js';

export default function ChatAudioBubble({ url, durationMs, mine, radii, onPointerUp, onError }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const known = Number(durationMs) > 0 ? Number(durationMs) : 0;

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    const onTime = () => {
      const dur = el.duration * 1000;
      const total = Number.isFinite(dur) && dur > 0 ? dur : known;
      setProgress(total ? Math.min(1, (el.currentTime * 1000) / total) : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    const onPause = () => {
      if (!el.ended) setPlaying(false);
    };
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('pause', onPause);
    };
  }, [known, url]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el || !url) {
      onError?.('This voice note isn’t ready yet.');
      return;
    }
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      await el.play();
      setPlaying(true);
    } catch (err) {
      setPlaying(false);
      onError?.(err?.message || 'Couldn’t play that voice note.');
    }
  };

  const handlePlayPointer = (e) => {
    e.stopPropagation();
    e.preventDefault();
    void toggle();
  };

  const label = formatVoiceClock(known || progress * known);

  return (
    <Box
      onPointerUp={onPointerUp}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.75,
        minWidth: 168,
        ...(radii || { borderRadius: '22px' }),
        bgcolor: mine ? 'primary.main' : 'action.hover',
        color: mine ? 'primary.contrastText' : 'text.primary',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <audio
        ref={audioRef}
        src={url || undefined}
        preload="auto"
        playsInline
        // iOS Safari needs the webkit attribute; React doesn't map it.
        {...{ 'webkit-playsinline': 'true' }}
      />
      <IconButton
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={handlePlayPointer}
        onClick={(e) => e.stopPropagation()}
        disabled={!url}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        sx={{ color: 'inherit', p: 0.5 }}
      >
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 64 }}>
        <Box
          sx={{
            height: 3,
            borderRadius: 999,
            bgcolor: mine ? 'rgba(255,255,255,0.35)' : 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              bgcolor: 'currentColor',
            }}
          />
        </Box>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.85, minWidth: 32 }}>
        {label}
      </Typography>
    </Box>
  );
}
