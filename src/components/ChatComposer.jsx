import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SendIcon from '@mui/icons-material/Send';
import { clipMessageBody, MESSAGE_BODY_MAX } from '../lib/chatPayment.js';
import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_CAMERA_ACCEPT,
  CHAT_IMAGE_GALLERY_ACCEPT,
} from '../lib/chatMedia.js';
import { requestChatNotificationPermission } from '../lib/chatAlerts.js';
import { chatComposerBarSx } from '../lib/appShell.js';
import {
  appendVoiceLevel,
  CHAT_AUDIO_MAX_MS,
  CHAT_AUDIO_MIN_MS,
  recordingElapsedMs,
  startVoiceCapture,
} from '../lib/chatVoice.js';
import VoiceRecordBar from './VoiceRecordBar.jsx';

export default function ChatComposer({
  draft,
  onDraftChange,
  sending,
  onSend,
  onPickFile,
  onSendVoice,
  onError,
  demoRecording = false,
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const fileRef = useRef(null);
  const sessionRef = useRef(null);
  const startedAtRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState([]);
  const hasText = Boolean(clipMessageBody(draft));
  const finishRef = useRef(async () => {});
  const closingRef = useRef(false);
  const lastLevelAtRef = useRef(0);

  const snapshotElapsed = () =>
    recordingElapsedMs({
      startedAt: startedAtRef.current,
      pausedAccumMs: pausedAccumRef.current,
      pauseStartedAt: pauseStartedAtRef.current,
      now: Date.now(),
    });

  useEffect(() => {
    if (!recording) return undefined;
    const id = window.setInterval(() => {
      const ms = snapshotElapsed();
      setElapsedMs(ms);
      if (ms >= CHAT_AUDIO_MAX_MS) void finishRef.current(true);
    }, 80);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(
    () => () => {
      try {
        void sessionRef.current?.cancel?.();
      } catch {
        /* ignore */
      }
      sessionRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!demoRecording) return undefined;
    startedAtRef.current = Date.now();
    pausedAccumRef.current = 0;
    pauseStartedAtRef.current = 0;
    setPaused(false);
    setLevels([]);
    setElapsedMs(0);
    setRecording(true);
    const id = window.setInterval(() => {
      if (pauseStartedAtRef.current) return;
      setLevels((prev) => appendVoiceLevel(prev, 0.12 + Math.random() * 0.75));
    }, 90);
    return () => window.clearInterval(id);
  }, [demoRecording]);

  const resetRecorder = () => {
    sessionRef.current = null;
    startedAtRef.current = 0;
    pausedAccumRef.current = 0;
    pauseStartedAtRef.current = 0;
    setRecording(false);
    setPaused(false);
    setElapsedMs(0);
    setLevels([]);
  };

  const finishRecording = async (sendIt) => {
    if (closingRef.current) return;
    if (demoRecording) return;
    const session = sessionRef.current;
    if (!session) return;
    closingRef.current = true;
    const durationMs = snapshotElapsed();
    sessionRef.current = null;
    resetRecorder();
    try {
      const result = sendIt ? await session.stop() : await session.cancel();
      if (!sendIt || !result?.file) return;
      if ((result.durationMs || durationMs) < CHAT_AUDIO_MIN_MS) return;
      await onSendVoice(result.file, result.durationMs || durationMs);
    } catch (err) {
      onError?.(err?.message || 'Couldn’t send voice note.');
    } finally {
      closingRef.current = false;
    }
  };
  finishRef.current = finishRecording;

  const startRecording = async () => {
    if (sending || recording || closingRef.current || demoRecording) return;
    try {
      const session = await startVoiceCapture({
        onLevel: (peak) => {
          if (pauseStartedAtRef.current) return;
          const t = Date.now();
          if (t - lastLevelAtRef.current < 50) return;
          lastLevelAtRef.current = t;
          setLevels((prev) => appendVoiceLevel(prev, peak));
        },
      });
      sessionRef.current = session;
      startedAtRef.current = Date.now();
      pausedAccumRef.current = 0;
      pauseStartedAtRef.current = 0;
      setPaused(false);
      setLevels([]);
      setElapsedMs(0);
      setRecording(true);
    } catch (err) {
      sessionRef.current = null;
      onError?.(err?.message || 'Microphone permission is needed for voice notes.');
    }
  };

  const togglePause = () => {
    const session = sessionRef.current;
    if (recording && !session && !demoRecording) return;
    if (!paused) {
      session?.pause?.();
      pauseStartedAtRef.current = Date.now();
      setPaused(true);
      return;
    }
    pausedAccumRef.current += Date.now() - (pauseStartedAtRef.current || Date.now());
    pauseStartedAtRef.current = 0;
    session?.resume?.();
    setPaused(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (recording) return;
    onSend(e);
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept={CHAT_CAMERA_ACCEPT}
        capture="environment"
        hidden
        tabIndex={-1}
        onChange={onPickFile}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={CHAT_IMAGE_GALLERY_ACCEPT}
        hidden
        tabIndex={-1}
        onChange={onPickFile}
      />
      <input
        ref={fileRef}
        type="file"
        accept={CHAT_ATTACHMENT_ACCEPT}
        hidden
        tabIndex={-1}
        onChange={onPickFile}
      />
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        ...chatComposerBarSx,
        gap: 0.5,
        alignItems: 'center',
        borderTop: 0,
        bgcolor: 'background.default',
      }}
    >
      {recording ? (
        <VoiceRecordBar
          elapsedMs={elapsedMs}
          levels={levels}
          paused={paused}
          sending={sending}
          onCancel={() => void finishRecording(false)}
          onTogglePause={togglePause}
          onSend={() => void finishRecording(true)}
        />
      ) : (
        <>
        <IconButton
          type="button"
          color="inherit"
          disabled={sending}
          aria-label="Take photo"
          onClick={() => cameraRef.current?.click()}
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          <CameraAltIcon fontSize="small" />
        </IconButton>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          px: 1,
          py: 0.25,
          minHeight: 40,
          borderRadius: 999,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'action.hover',
        }}
      >
            <TextField
              value={draft}
              onChange={(e) => onDraftChange(e.target.value.slice(0, MESSAGE_BODY_MAX))}
              onFocus={() => requestChatNotificationPermission()}
              placeholder="Message..."
              fullWidth
              variant="standard"
              multiline
              maxRows={4}
              InputProps={{ disableUnderline: true }}
              inputProps={{
                'aria-label': 'Message',
                enterKeyHint: 'send',
                autoComplete: 'off',
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '16px',
                  py: 0.75,
                },
              }}
            />
            {hasText ? (
              <IconButton
                type="submit"
                disabled={sending}
                aria-label="Send"
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            ) : (
              <>
                <IconButton
                  type="button"
                  color="inherit"
                  disabled={sending}
                  aria-label="Voice message"
                  onClick={() => void startRecording()}
                >
                  <MicIcon />
                </IconButton>
                <IconButton
                  type="button"
                  color="inherit"
                  disabled={sending}
                  aria-label="Photo library"
                  onClick={() => galleryRef.current?.click()}
                >
                  <PhotoLibraryOutlinedIcon />
                </IconButton>
                <IconButton
                  type="button"
                  color="inherit"
                  disabled={sending}
                  aria-label="Attach file"
                  onClick={() => fileRef.current?.click()}
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              </>
            )}
      </Box>
        </>
      )}
    </Box>
    </>
  );
}
