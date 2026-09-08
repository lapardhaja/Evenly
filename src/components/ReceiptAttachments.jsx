import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AttachmentLightbox, { canPreviewAttachmentInline } from './AttachmentLightbox.jsx';
import {
  ATTACHMENT_MAX_PER_RECEIPT,
  deleteAttachment,
  getAttachmentSignedUrl,
  listAttachments,
  uploadAttachment,
} from '../lib/receiptAttachments.js';

function sanitizeFileName(name) {
  const base = String(name || 'attachment').replace(/^.*[/\\]/, '');
  return base.replace(/[\u0000-\u001f]/g, '').trim() || 'attachment';
}

function errorMessage(err) {
  if (err && typeof err.message === 'string' && err.message) return err.message;
  return 'Something went wrong';
}

export default function ReceiptAttachments({ groupId, receiptId, enabled }) {
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [signedUrls, setSignedUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const refreshSignedUrl = useCallback(async (row) => {
    const url = await getAttachmentSignedUrl(row.storage_path);
    setSignedUrls((prev) => ({ ...prev, [row.id]: url }));
    return url;
  }, []);

  const loadAttachments = useCallback(async () => {
    if (!enabled || !receiptId) return;
    setLoading(true);
    try {
      const list = await listAttachments(receiptId);
      setRows(list);
      const nextUrls = {};
      await Promise.all(
        list.map(async (row) => {
          try {
            nextUrls[row.id] = await getAttachmentSignedUrl(row.storage_path);
          } catch {
            nextUrls[row.id] = null;
          }
        }),
      );
      setSignedUrls(nextUrls);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, receiptId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  if (!enabled) return null;

  const atCap = rows.length >= ATTACHMENT_MAX_PER_RECEIPT;

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setBusy(true);
    const previous = rows;
    try {
      let nextRows = previous;
      for (const file of files) {
        if (nextRows.length >= ATTACHMENT_MAX_PER_RECEIPT) {
          throw new Error(`Maximum ${ATTACHMENT_MAX_PER_RECEIPT} attachments per receipt`);
        }
        const created = await uploadAttachment({ groupId, receiptId, file });
        nextRows = [...nextRows, created];
        setRows(nextRows);
        try {
          await refreshSignedUrl(created);
        } catch {
          setSignedUrls((prev) => ({ ...prev, [created.id]: null }));
        }
      }
    } catch (err) {
      setRows(previous);
      setError(errorMessage(err));
      loadAttachments();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row) => {
    const previous = rows;
    const previousUrls = signedUrls;
    setRows((cur) => cur.filter((item) => item.id !== row.id));
    setSignedUrls((cur) => {
      const next = { ...cur };
      delete next[row.id];
      return next;
    });
    if (lightbox?.id === row.id) setLightbox(null);
    try {
      await deleteAttachment(row);
    } catch (err) {
      setRows(previous);
      setSignedUrls(previousUrls);
      setError(errorMessage(err));
    }
  };

  const openLightbox = async (row) => {
    let url = signedUrls[row.id];
    if (!url) {
      try {
        url = await refreshSignedUrl(row);
      } catch (err) {
        setError(errorMessage(err));
        return;
      }
    }
    setLightbox({
      id: row.id,
      url,
      mimeType: row.mime_type,
      fileName: row.file_name,
    });
  };

  return (
    <Box sx={{ px: 1, mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Attachments
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'flex-start',
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddPhotoAlternateOutlinedIcon />}
          onClick={handleAddClick}
          disabled={busy || atCap}
          aria-label="Add attachment"
        >
          Add
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,application/pdf,image/heic,image/heif"
          onChange={handleFiles}
        />
        {loading && !rows.length ? (
          <CircularProgress size={24} sx={{ mt: 0.5 }} />
        ) : null}
        {rows.map((row) => {
          const name = sanitizeFileName(row.file_name);
          const previewUrl = signedUrls[row.id];
          const inlineThumb = canPreviewAttachmentInline(row.mime_type);
          const isPdf = String(row.mime_type || '').toLowerCase() === 'application/pdf';
          return (
            <Box
              key={row.id}
              sx={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 1,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <ButtonBase
                onClick={() => openLightbox(row)}
                aria-label={`Open ${name}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 0.5,
                }}
              >
                {inlineThumb && previewUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt={name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <>
                    {isPdf ? (
                      <PictureAsPdfIcon color="action" />
                    ) : (
                      <InsertDriveFileOutlinedIcon color="action" />
                    )}
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ maxWidth: '100%', mt: 0.25, px: 0.25 }}
                    >
                      {name}
                    </Typography>
                  </>
                )}
              </ButtonBase>
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>

      <AttachmentLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        url={lightbox?.url || ''}
        mimeType={lightbox?.mimeType || ''}
        fileName={lightbox?.fileName || ''}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={7000}
        onClose={() => setError('')}
        message={error}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 24 },
        }}
      />
    </Box>
  );
}
