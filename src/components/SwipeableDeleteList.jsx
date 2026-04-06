import Box from '@mui/material/Box';
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';

/**
 * Mobile-only: swipe left to reveal Delete (full swipe triggers delete).
 */
export default function SwipeableDeleteList({
  items,
  getKey,
  onDelete,
  deleteConfirm,
  children,
}) {
  return (
    <SwipeableList
      type={Type.IOS}
      fullSwipe
      threshold={0.35}
      destructiveCallbackDelay={350}
      style={{ width: '100%' }}
    >
      {items.map((item, idx) => (
        <SwipeableListItem
          key={getKey(item, idx)}
          trailingActions={
            <TrailingActions>
              <SwipeAction
                destructive
                onClick={() => {
                  if (deleteConfirm(item)) onDelete(item);
                }}
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
