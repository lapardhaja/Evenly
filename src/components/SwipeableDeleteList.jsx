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

function getTranslateXPx(listElement) {
  if (!listElement) return 0;
  const t = listElement.style?.transform || '';
  const m = t.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  return m ? parseFloat(m[1], 10) : 0;
}

/**
 * Mobile-only: swipe left ~¼ width to reveal Delete; user must tap the red area.
 * Tap the row (outside red) closes the delete strip (like swipe back).
 * Parent should show Snackbar + Undo after onDelete(item).
 */
export default function SwipeableDeleteList({
  items,
  getKey,
  onDelete,
  children,
}) {
  const itemInstRef = useRef({});

  const setItemInst = (key, inst) => {
    if (inst) itemInstRef.current[key] = inst;
    else delete itemInstRef.current[key];
  };

  return (
    <SwipeableList
      type={Type.IOS}
      threshold={0.2}
      style={{ width: '100%' }}
    >
      {items.map((item, idx) => {
        const rowKey = getKey(item, idx);
        return (
          <SwipeableListItem
            key={rowKey}
            ref={(inst) => setItemInst(rowKey, inst)}
            maxSwipe={0.25}
            trailingActions={
              <TrailingActions>
                <SwipeAction
                  className="evenly-swipe-delete"
                  Tag="button"
                  onClick={() => onDelete(item)}
                >
                  Delete
                </SwipeAction>
              </TrailingActions>
            }
          >
            <Box
              onClickCapture={(e) => {
                const inst = itemInstRef.current[rowKey];
                const el = inst?.listElement;
                const x = getTranslateXPx(el);
                if (x < -8 && typeof inst?.playReturnAnimation === 'function') {
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
              {children(item, idx)}
            </Box>
          </SwipeableListItem>
        );
      })}
    </SwipeableList>
  );
}
