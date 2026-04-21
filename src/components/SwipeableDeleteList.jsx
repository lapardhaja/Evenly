import { useRef } from 'react';
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
import {
  getSwipeDeleteTranslateX,
  shouldCloseSwipeOnContentClick,
} from '../lib/swipeDelete.js';

/**
 * One swipe row — must be a direct child of {@link SwipeableList}.
 */
export function SwipeableDeleteRow({ onDelete, children }) {
  const itemInstRef = useRef(null);
  const openedAtRef = useRef(0);

  return (
    <SwipeableListItem
      ref={(inst) => {
        itemInstRef.current = inst;
      }}
      maxSwipe={0.25}
      onSwipeStart={() => {
        openedAtRef.current = null;
      }}
      onSwipeEnd={() => {
        // Always record the swipe-end time. The snap animation runs
        // asynchronously AFTER onSwipeEnd, so we cannot read translateX
        // here to determine whether the action opened — it will still be 0.
        // Recording Date.now() unconditionally lets the AUTO_CLOSE_GUARD in
        // shouldCloseSwipeOnContentClick suppress the library's synthetic
        // touchend→click that would otherwise immediately close the row.
        openedAtRef.current = Date.now();
      }}
      trailingActions={
        <TrailingActions>
          <SwipeAction
            className="evenly-swipe-delete"
            Tag="button"
            onClick={onDelete}
          >
            Delete
          </SwipeAction>
        </TrailingActions>
      }
    >
      <Box
        onClickCapture={(e) => {
          const inst = itemInstRef.current;
          const x = getSwipeDeleteTranslateX(inst?.listElement);
          if (
            shouldCloseSwipeOnContentClick({
              translateXPx: x,
              lastSwipeEndAtMs: openedAtRef.current,
              nowMs: Date.now(),
            }) &&
            typeof inst?.playReturnAnimation === 'function'
          ) {
            e.preventDefault();
            e.stopPropagation();
            inst.playReturnAnimation();
          }
        }}
        sx={{
          width: '100%',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {children}
      </Box>
    </SwipeableListItem>
  );
}

/**
 * Mobile-only: swipe left ~¼ width to reveal Delete; user must tap the red area.
 * Tap the row (outside red) closes the delete strip (like swipe back).
 * Parent should show Snackbar + Undo after onDelete(item).
 */
export default function SwipeableDeleteList({ items, getKey, onDelete, children }) {
  return (
    <SwipeableList type={Type.IOS} threshold={0.2} style={{ width: '100%' }}>
      {items.map((item, idx) => {
        const rowKey = getKey(item, idx);
        return (
          <SwipeableDeleteRow key={rowKey} onDelete={() => onDelete(item)}>
            {children(item, idx)}
          </SwipeableDeleteRow>
        );
      })}
    </SwipeableList>
  );
}
