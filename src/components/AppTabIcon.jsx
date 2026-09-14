import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import SendIcon from '@mui/icons-material/Send';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export function appTabAriaLabel(tab, { unreadChats = 0, pendingFriendRequests = 0 } = {}) {
  if (tab.id === 'search' && pendingFriendRequests > 0) {
    return `Search, ${pendingFriendRequests} friend requests`;
  }
  if (tab.id === 'messages' && unreadChats > 0) {
    return `Messages, ${unreadChats} unread`;
  }
  return tab.label;
}

export function appTabBadge(tab, { unreadChats = 0, pendingFriendRequests = 0 } = {}) {
  if (tab.id === 'search' && pendingFriendRequests > 0) {
    return { color: 'warning', count: pendingFriendRequests };
  }
  if (tab.id === 'messages' && unreadChats > 0) {
    return { color: 'primary', count: unreadChats };
  }
  return null;
}

/** Filled vs outlined MUI icons — same set as the phone tab bar. */
export default function AppTabIcon({ id, selected = false }) {
  switch (id) {
    case 'home':
      return selected ? <HomeIcon /> : <HomeOutlinedIcon />;
    case 'search':
      return <SearchIcon />;
    case 'groups':
      return selected ? <FolderSharedIcon /> : <FolderSharedOutlinedIcon />;
    case 'messages':
      return selected ? <SendIcon /> : <SendOutlinedIcon />;
    case 'profile':
      return selected ? <PersonIcon /> : <PersonOutlineIcon />;
    default:
      return null;
  }
}
