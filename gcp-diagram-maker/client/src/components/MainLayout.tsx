import React, { useState, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import { Menu as MenuIcon, LightMode, DarkMode, AccountCircle } from '@mui/icons-material';
import { useAppTheme as useTheme } from './ThemeProvider';
import Sidebar from './Sidebar';

// Define drawer width
const DRAWER_WIDTH = 260;

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Get theme functions
  const { isDarkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  
  // Determine if screen is mobile
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  // State for drawer open status
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  
  // Toggle drawer
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: muiTheme.transitions.create(['width', 'margin'], {
            easing: muiTheme.transitions.easing.sharp,
            duration: muiTheme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { xs: 'block', md: drawerOpen ? 'none' : 'block' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Azure Diagram Maker
          </Typography>
          
          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
          
          <IconButton color="inherit" edge="end">
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={isMobile ? toggleDrawer : undefined}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Sidebar drawerWidth={DRAWER_WIDTH} />
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          marginLeft: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          marginTop: '64px', // Height of AppBar
          transition: muiTheme.transitions.create(['width', 'margin'], {
            easing: muiTheme.transitions.easing.sharp,
            duration: muiTheme.transitions.duration.leavingScreen,
          }),
          overflow: 'auto',
        }}
      >
        {/* Render children if provided, otherwise use Outlet for nested routes */}
        {children || <Outlet />}
        
        {/* Fallback content when no route is matched */}
        {!window.location.pathname.includes('/') && (
          <>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Welcome to Azure Diagram Maker
            </Typography>
            <Typography variant="body1">
              This is the main content area. The application is under development.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default MainLayout;
