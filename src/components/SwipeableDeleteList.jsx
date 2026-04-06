import Box from '@mui/material/Box';
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import './swipeable-list-overrides.css';

/**
 * Mobile-only: swipe left to reveal Delete (full swipe triggers delete).
 * Parent should show Snackbar + Undo after onDelete(item).
 */
export default function SwipeableDeleteList({
  items,
  getKey,
  onDelete,
  children,
}) {
  return (
    <SwipeableList
      type={Type.IOS}
      fullSwipe
      threshold={0.35}
      destructiveCallbackDelay={400}
      style={{ width: '100%' }}
    >
      {items.map((item, idx) => (
        <SwipeableListItem
          key={getKey(item, idx)}
          trailingActions={
            <TrailingActions>
              <SwipeAction
                className="evenly-swipe-delete"
                destructive
                Tag="button"
                onClick={() => onDelete(item)}
              >
                Delete
              </SwipeAction>
            </TrailingActions>
          }
        >
          <Box
            sx={{
              width: '100%',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {children(item, idx)}
          </Box>
        </SwipeableListItem>
      ))}
    </SwipeableList>
  );
}
