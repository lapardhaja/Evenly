import { useMemo } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatThread from '../components/ChatThread.jsx';
import { nameToInitials } from '../functions/utils.js';
import { chatThreadPageSx, CHAT_CONTAINER_MAX_WIDTH } from '../lib/appShell.js';
import { encodeWavPcm16 } from '../lib/chatVoice.js';

const THEM = 'them';
const ME = 'me';
const PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect fill="#163325" width="640" height="480"/><text x="50%" y="50%" fill="#efe6d6" font-size="28" text-anchor="middle" font-family="sans-serif">photo</text></svg>',
  );

function previewVoiceUrl() {
  const sr = 16000;
  const n = sr; // 1s 440Hz so Play has something to hear
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.28;
  }
  const bytes = new Uint8Array(encodeWavPcm16(samples, sr));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export default function ChatLayoutPreview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isGroup = params.get('group') === '1';
  const preview = useMemo(
    () => ({
      userId: ME,
      names: { [THEM]: 'Amanda Nicol' },
      likes: new Map([['m1', { count: 1, mine: false }]]),
      imageUrls: { 'preview/photo.jpg': PHOTO, 'preview/voice.wav': previewVoiceUrl() },
      messages: [
        {
          id: 'm0',
          sender_id: THEM,
          type: 'text',
          body: 'Older message that should be above the fold',
          payload: {},
        },
        {
          id: 'm0b',
          sender_id: ME,
          type: 'text',
          body: 'Scroll past these so open lands on the voice note',
          payload: {},
        },
        {
          id: 'm0c',
          sender_id: THEM,
          type: 'text',
          body: 'Filler so the thread is taller than the viewport',
          payload: {},
        },
        {
          id: 'm0d',
          sender_id: THEM,
          type: 'text',
          body: 'Still filler',
          payload: {},
        },
        {
          id: 'm0e',
          sender_id: ME,
          type: 'text',
          body: 'Almost at the latest',
          payload: {},
        },
        {
          id: 'm1',
          sender_id: THEM,
          type: 'text',
          body: 'You can use the cow as a projector screen',
          payload: {},
        },
        {
          id: 'm2',
          sender_id: THEM,
          type: 'image',
          body: '',
          payload: { storage_path: 'preview/photo.jpg', mime_type: 'image/gif' },
        },
        {
          id: 'm3',
          sender_id: THEM,
          type: 'text',
          body: 'Yet another reason to buy a cow',
          payload: {},
        },
        {
          id: 'm4',
          sender_id: ME,
          type: 'text',
          body: 'Adding it to the split',
          payload: {},
        },
        {
          id: 'm5',
          sender_id: THEM,
          type: 'audio',
          body: '',
          payload: {
            storage_path: 'preview/voice.wav',
            mime_type: 'audio/wav',
            duration_ms: 1000,
          },
        },
      ],
    }),
    [],
  );

  return (
    <Container maxWidth={CHAT_CONTAINER_MAX_WIDTH} sx={chatThreadPageSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexShrink: 0, minWidth: 0 }}>
        <IconButton onClick={() => navigate('/chat')} size="small" aria-label="Back to chats">
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
          {nameToInitials('Amanda Nicol')}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap lineHeight={1.2}>
            Amanda Nicol
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            barbie_terella
          </Typography>
        </Box>
      </Box>
      <ChatThread
        conversationId="preview"
        groupName={isGroup ? 'Weekend' : ''}
        preview={preview}
      />
    </Container>
  );
}
