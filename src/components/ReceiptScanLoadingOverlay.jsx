import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function ReceiptScanLoadingOverlay({ open }) {
  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 2,
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'rgba(15, 35, 40, 0.92)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <CircularProgress color="inherit" />
      <Typography variant="body1" sx={{ color: 'grey.100' }}>
        Reading receipt…
      </Typography>
    </Backdrop>
  );
}
