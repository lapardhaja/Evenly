import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import QRCode from 'qrcode';
import { invitePath } from '../lib/inviteCodes.js';
import { SCAN_LOCK_MS } from '../lib/scanQrOverlay.js';
import {
  decodeInviteFromFile,
  scanInviteFromVideo,
} from '../lib/decodeInviteQr.js';
import ScanQrViewfinder from '../components/ScanQrViewfinder.jsx';

const DEMO_JOIN_TOKEN = `g_${'ab'.repeat(16)}`;

async function attachFinderDemoStream(video) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(
    canvas,
    `https://evenly.lapardhaja.com/#/join/${DEMO_JOIN_TOKEN}`,
    {
      width: 320,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#f7f7f7' },
    },
  );
  if (typeof canvas.captureStream !== 'function') {
    throw new Error('Demo stream is not available in this browser.');
  }
  const stream = canvas.captureStream(8);
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  await video.play();
  return { stream, canvas };
}

export default function ScanQrPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const finderDemo = import.meta.env.DEV && params.get('finder') === '1';
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Point the camera at an Evenly QR code.');
  const [scanUi, setScanUi] = useState({
    status: 'searching',
    quad: null,
    scanWidth: 0,
    scanHeight: 0,
  });

  useEffect(() => {
    let stream;
    let demoCanvas;
    let timer = 0;
    let lockTimer = 0;
    let running = true;
    let busy = false;
    (async () => {
      const video = videoRef.current;
      if (!video) return;
      if (finderDemo) {
        try {
          const demo = await attachFinderDemoStream(video);
          stream = demo.stream;
          demoCanvas = demo.canvas;
          setHint('Point the camera at an Evenly QR code.');
        } catch {
          setError('Couldn’t start the finder demo.');
          return;
        }
      } else if (!navigator.mediaDevices?.getUserMedia) {
        setHint('Pick a photo of the QR below, or use the Camera app.');
        return;
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          video.srcObject = stream;
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', 'true');
          await video.play();
          setHint('Point the camera at an Evenly QR code.');
        } catch {
          setError('Camera permission is needed to scan in the app. You can still pick a photo.');
          return;
        }
      }
      const canvas = canvasRef.current;
      const tick = () => {
        if (!running || busy) return;
        busy = true;
        try {
          const result = scanInviteFromVideo(video, canvas);
          if (result.status === 'invite' && result.invite) {
            running = false;
            try {
              video.pause();
            } catch {
              /* ignore */
            }
            setScanUi({
              status: 'locked',
              quad: result.quad,
              scanWidth: result.width,
              scanHeight: result.height,
            });
            setHint('Got it');
            const waitMs = finderDemo ? 1400 : SCAN_LOCK_MS;
            lockTimer = window.setTimeout(() => {
              navigate(invitePath(result.invite.kind, result.invite.token), {
                replace: true,
              });
            }, waitMs);
            return;
          }
          if (result.status === 'other' && result.quad) {
            setScanUi({
              status: 'other',
              quad: result.quad,
              scanWidth: result.width,
              scanHeight: result.height,
            });
            setHint('Not an Evenly code. Try a group or friend QR.');
            return;
          }
          setScanUi((prev) =>
            prev.status === 'searching'
              ? prev
              : {
                  status: 'searching',
                  quad: null,
                  scanWidth: 0,
                  scanHeight: 0,
                },
          );
        } catch {
          /* keep scanning */
        } finally {
          busy = false;
        }
      };
      timer = window.setInterval(tick, 180);
    })();
    return () => {
      running = false;
      if (timer) window.clearInterval(timer);
      if (lockTimer) window.clearTimeout(lockTimer);
      stream?.getTracks?.().forEach((t) => t.stop());
      demoCanvas = null;
    };
  }, [finderDemo, navigate]);

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
        <Alert severity={scanUi.status === 'locked' ? 'success' : 'info'} sx={{ mb: 2 }}>
          {hint}
        </Alert>
      )}
      <ScanQrViewfinder
        videoRef={videoRef}
        status={scanUi.status}
        quad={scanUi.quad}
        scanWidth={scanUi.scanWidth}
        scanHeight={scanUi.scanHeight}
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
