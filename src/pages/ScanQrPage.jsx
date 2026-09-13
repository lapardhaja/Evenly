import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { invitePath, parseInviteFromText } from '../lib/inviteCodes.js';

async function detectFromImageFile(file) {
  if (typeof BarcodeDetector === 'undefined' || !file) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const codes = await detector.detect(bitmap);
    for (const code of codes) {
      const parsed = parseInviteFromText(code.rawValue);
      if (parsed) return parsed;
    }
  } finally {
    bitmap.close?.();
  }
  return null;
}

export default function ScanQrPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Point the camera at an Evenly QR code.');

  useEffect(() => {
    let stream;
    let raf = 0;
    let running = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHint('Use the Camera app on the QR, or pick a photo of it below.');
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
        await video.play();
        if (typeof BarcodeDetector === 'undefined') {
          setHint('This browser can’t decode QR in-app. Open Camera and scan the code instead.');
          return;
        }
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (!running) return;
          try {
            const codes = await detector.detect(video);
            for (const code of codes) {
              const parsed = parseInviteFromText(code.rawValue);
              if (parsed) {
                running = false;
                navigate(invitePath(parsed.kind, parsed.token), { replace: true });
                return;
              }
            }
          } catch {
            /* keep scanning */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError('Camera permission is needed to scan in the app. You can still use the Camera app.');
      }
    })();
    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, [navigate]);

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Scan QR
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Group codes add you to the group. Personal codes make you friends. You can also open Camera
        and point it at the code — it opens Evenly automatically.
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
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            const parsed = await detectFromImageFile(file);
            if (!parsed) {
              setError('Couldn’t read a code in that photo. Try the Camera app instead.');
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
