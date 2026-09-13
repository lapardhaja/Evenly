import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CloseIcon from '@mui/icons-material/Close';
import { clipMessageBody, MESSAGE_BODY_MAX } from '../lib/chatPayment.js';
import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_CAMERA_ACCEPT,
  CHAT_IMAGE_GALLERY_ACCEPT,
} from '../lib/chatMedia.js';
import { requestChatNotificationPermission } from '../lib/chatAlerts.js';
import { chatComposerBarSx } from '../lib/appShell.js';
import {
  CHAT_AUDIO_MAX_MS,
  CHAT_AUDIO_MIN_MS,
  formatVoiceClock,
  startVoiceCapture,
} from '../lib/chatVoice.js';

export default function ChatComposer({
  draft,
  onDraftChange,
  sending,
  onSend,
  onPickFile,
  onSendVoice,
  onError,
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const fileRef = useRef(null);
  const sessionRef = useRef(null);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const hasText = Boolean(clipMessageBody(draft));
  const finishRef = useRef(async () => {});
  const closingRef = useRef(false);

  useEffect(() => {
    if (!recording) return undefined;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    const cap = window.setTimeout(() => {
      void finishRef.current(true);
    }, CHAT_AUDIO_MAX_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(cap);
    };
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

  const finishRecording = async (sendIt) => {
    if (closingRef.current) return;
    const session = sessionRef.current;
    if (!session) return;
    closingRef.current = true;
    sessionRef.current = null;
    setRecording(false);
    setElapsedMs(0);
    try {
      const result = sendIt ? await session.stop() : await session.cancel();
      if (!sendIt || !result?.file) return;
      if ((result.durationMs || 0) < CHAT_AUDIO_MIN_MS) return;
      await onSendVoice(result.file, result.durationMs);
    } catch (err) {
      onError?.(err?.message || 'Couldn’t send voice note.');
    } finally {
      closingRef.current = false;
    }
  };
  finishRef.current = finishRecording;

  const startRecording = async () => {
    if (sending || recording || closingRef.current) return;
    try {
      const session = await startVoiceCapture();
      sessionRef.current = session;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
    } catch (err) {
      sessionRef.current = null;
      onError?.(err?.message || 'Microphone permission is needed for voice notes.');
    }
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
        <IconButton
          type="button"
          color="error"
          aria-label="Cancel voice note"
          onClick={() => void finishRecording(false)}
        >
          <CloseIcon />
        </IconButton>
      ) : (
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
      )}
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
        {recording ? (
          <>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'error.main',
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1, px: 1 }}>
              {formatVoiceClock(elapsedMs)}
            </Typography>
            <IconButton
              type="button"
              color="primary"
              aria-label="Send voice note"
              onClick={() => void finishRecording(true)}
            >
              <StopCircleIcon />
            </IconButton>
          </>
        ) : (
          <>
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
          </>
        )}
      </Box>
    </Box>
    </>
  );
}
