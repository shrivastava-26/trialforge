import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';

const APPBAR_HEIGHT = 64;
const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 60;

const navItems = [
  { label: 'Dashboard',  path: '/admin/dashboard',  icon: <DashboardIcon fontSize="small" /> },
  { label: 'Studies',    path: '/admin/studies',    icon: <ScienceIcon fontSize="small" /> },
  { label: 'Sites',      path: '/admin/sites',      icon: <LocationOnIcon fontSize="small" /> },
  { label: 'Examiners',  path: '/admin/examiners',  icon: <PersonSearchIcon fontSize="small" /> },
  { label: 'Search',     path: '/admin/search',     icon: <SearchIcon fontSize="small" /> },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: <HistoryIcon fontSize="small" /> },
];

export function AdminSidebar() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const width = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: '#0f766e',
          color: '#e0f2f1',
          overflowX: 'hidden',
          transition: 'width 0.22s ease',
          borderRight: 'none',
          top: APPBAR_HEIGHT,
          height: `calc(100% - ${APPBAR_HEIGHT}px)`,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center', px: 1, py: 1, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        {open && (
          <Typography variant="caption" sx={{ flexGrow: 1, pl: 1.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem' }}>
            Admin
          </Typography>
        )}
        <Tooltip title={open ? 'Collapse' : 'Expand'} placement="right">
          <IconButton onClick={() => setOpen(!open)} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {open ? <ChevronLeftIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <List sx={{ pt: 1, px: 0.5 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Tooltip key={item.path} title={open ? '' : item.label} placement="right">
              <ListItemButton
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                sx={{
                  mb: 0.5, borderRadius: 1.5, minHeight: 42,
                  justifyContent: open ? 'flex-start' : 'center',
                  px: open ? 1.5 : 0,
                  bgcolor: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  '&:hover': { bgcolor: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: active ? '#fff' : 'rgba(255,255,255,0.65)', minWidth: open ? 34 : 'auto', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText primary={
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: active ? 700 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                      {item.label}
                    </Typography>
                  } />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mt: 'auto' }} />
    </Drawer>
  );
}
