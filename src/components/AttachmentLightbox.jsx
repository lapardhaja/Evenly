import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

export function canPreviewAttachmentInline(mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (!mime.startsWith('image/')) return false;
  if (mime.includes('heic') || mime.includes('heif')) return false;
  return true;
}

function sanitizeFileName(name) {
  const base = String(name || 'attachment').replace(/^.*[/\\]/, '');
  return base.replace(/[\u0000-\u001f]/g, '').trim() || 'attachment';
}

async function downloadFromUrl(url, fileName) {
  const a = document.createElement('a');
  a.rel = 'noopener';
  a.download = fileName;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    a.href = url;
    a.target = '_blank';
    a.click();
  }
}

export default function AttachmentLightbox({ open, onClose, url, mimeType, fileName }) {
  const displayName = sanitizeFileName(fileName);
  const inline = Boolean(url) && canPreviewAttachmentInline(mimeType);

  const handleOpen = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!url) return;
    downloadFromUrl(url, displayName);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          pt: 'env(safe-area-inset-top, 0px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <IconButton onClick={onClose} aria-label="Close attachment" size="small">
          <CloseIcon />
        </IconButton>
        <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {displayName}
        </Typography>
      </Box>
      {inline ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            p: 1,
            minHeight: 0,
          }}
        >
          <Box
            component="img"
            src={url}
            alt={displayName}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="body1">{displayName}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleOpen} disabled={!url}>
              Open
            </Button>
            <Button variant="outlined" onClick={handleDownload} disabled={!url}>
              Download
            </Button>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
