import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { invitePath } from '../lib/inviteCodes.js';
import { decodeInviteFromFile, decodeInviteFromVideo } from '../lib/decodeInviteQr.js';

export default function ScanQrPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Point the camera at an Evenly QR code.');

  useEffect(() => {
    let stream;
    let timer = 0;
    let running = true;
    let busy = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHint('Pick a photo of the QR below, or use the Camera app.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', 'true');
        await video.play();
        setHint('Point the camera at an Evenly QR code.');
        const canvas = canvasRef.current;
        const tick = () => {
          if (!running || busy) return;
          busy = true;
          try {
            const parsed = decodeInviteFromVideo(video, canvas);
            if (parsed) {
              running = false;
              navigate(invitePath(parsed.kind, parsed.token), { replace: true });
              return;
            }
          } catch {
            /* keep scanning */
          } finally {
            busy = false;
          }
        };
        timer = window.setInterval(tick, 180);
      } catch {
        setError('Camera permission is needed to scan in the app. You can still pick a photo.');
      }
    })();
    return () => {
      running = false;
      if (timer) window.clearInterval(timer);
      stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, [navigate]);

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Scan QR
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Group codes add you to the group. Personal codes make you friends.
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          {hint}
        </Alert>
      )}
      <Box
        component="video"
        ref={videoRef}
        playsInline
        muted
        autoPlay
        sx={{
          width: '100%',
          maxHeight: 360,
          borderRadius: 2,
          bgcolor: 'black',
          objectFit: 'cover',
          mb: 2,
        }}
      />
      <canvas ref={canvasRef} hidden />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            const parsed = await decodeInviteFromFile(file);
            if (!parsed) {
              setError('Couldn’t read a join or friend code in that photo.');
              return;
            }
            navigate(invitePath(parsed.kind, parsed.token), { replace: true });
          } catch {
            setError('Couldn’t read that photo.');
          }
        }}
      />
      <Button variant="outlined" onClick={() => fileRef.current?.click()}>
        Choose photo
      </Button>
    </Container>
  );
}
