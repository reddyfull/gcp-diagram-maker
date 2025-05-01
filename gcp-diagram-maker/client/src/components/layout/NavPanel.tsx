import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AppsIcon from '@mui/icons-material/Apps';
import SettingsIcon from '@mui/icons-material/Settings';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Logo component
const Logo = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2)
}));

const NavPanel: React.FC = () => {
  const location = useLocation();

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider'
      }}
    >
      <Logo>
        <Typography variant="h6" component="div" fontWeight="bold" color="primary">
          Kalidraw
        </Typography>
      </Logo>
      <Divider />
      <List component="nav">
        <ListItem disablePadding>
          <Tooltip title="Dashboard" placement="right">
            <ListItemButton
              component={Link}
              to="/"
              selected={location.pathname === '/'}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <ListItem disablePadding>
          <Tooltip title="AI Wizard" placement="right">
            <ListItemButton
              component={Link}
              to="/wizard"
              selected={location.pathname.startsWith('/wizard')}
            >
              <ListItemIcon>
                <AutoAwesomeIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="AI Wizard" primaryTypographyProps={{ fontWeight: 'bold', color: 'primary.main' }} />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <ListItem disablePadding>
          <Tooltip title="New Diagram" placement="right">
            <ListItemButton
              component={Link}
              to="/new"
              selected={location.pathname === '/new'}
            >
              <ListItemIcon>
                <NoteAddIcon />
              </ListItemIcon>
              <ListItemText primary="New Diagram" />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <ListItem disablePadding>
          <Tooltip title="My Diagrams" placement="right">
            <ListItemButton
              component={Link}
              to="/diagrams"
              selected={location.pathname === '/diagrams'}
            >
              <ListItemIcon>
                <FolderOpenIcon />
              </ListItemIcon>
              <ListItemText primary="My Diagrams" />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <ListItem disablePadding>
          <Tooltip title="Resource Explorer" placement="right">
            <ListItemButton
              component={Link}
              to="/resources"
              selected={location.pathname === '/resources'}
            >
              <ListItemIcon>
                <AppsIcon />
              </ListItemIcon>
              <ListItemText primary="Resource Explorer" />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        <ListItem disablePadding>
          <Tooltip title="Settings" placement="right">
            <ListItemButton
              component={Link}
              to="/settings"
              selected={location.pathname === '/settings'}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <ListItem disablePadding>
          <Tooltip title="About" placement="right">
            <ListItemButton
              component={Link}
              to="/about"
              selected={location.pathname === '/about'}
            >
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary="About" />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );
};

export default NavPanel; 