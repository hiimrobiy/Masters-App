import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  useTheme
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import SprintIcon from '@mui/icons-material/AlarmOn'; 
import BookIcon from '@mui/icons-material/Book';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ProfileIcon from '@mui/icons-material/Person';
import { CreateNewFolder, ElectricRickshawSharp, Logout } from '@mui/icons-material';
import ProfileCreationForm from './ProfileCreationForm';

const SideNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setIsOpen(open);
  };

  // Create a list of links for routes with associated icons
  const navLinks = [
    
    { to: '/', label: 'Create', icon: <CreateNewFolder /> },
    { to: '/home', label: 'Home', icon: <HomeIcon /> },
    { to: '/team-board', label: 'Team Board', icon: <GroupWorkIcon /> },
    { to: '/sprints', label: 'Sprints', icon: <SprintIcon /> },
    { to: '/stories', label: 'Stories', icon: <BookIcon /> },
    { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/risk', label: 'Risk', icon: <ElectricRickshawSharp /> },
    { to: '/logout', label: 'Logout', icon: <Logout /> },
  ];

  const list = () => (
    <Box
      sx={{
        width: 250,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 2,
          justifyContent: 'space-between',
          backgroundColor: "#26c6da",
          color: theme.palette.primary.contrastText,
        }}
      >
       
        <IconButton onClick={toggleDrawer(false)} sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List sx={{ flex: 1 }}>
        {navLinks.map((link) => (
          <ListItem key={link.label} disablePadding>
            <ListItemButton
              component={Link}
              to={link.to}
              selected={location.pathname === link.to}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {link.icon}
              </ListItemIcon>
              <ListItemText primary={link.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <IconButton
        onClick={toggleDrawer(true)}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#26c6da",
          color: theme.palette.primary.contrastText,
          '&:hover': {
            backgroundColor: "#218c92",
          },
        }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            // Customize the drawer paper
            width: 250,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
        }}
      >
        {list()}
      </Drawer>
    </>
  );
};

export default SideNav;
