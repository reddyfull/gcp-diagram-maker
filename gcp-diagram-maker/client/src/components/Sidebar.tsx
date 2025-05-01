import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Code as CodeIcon,
  Upload as UploadIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Psychology as AIIcon,
  History as HistoryIcon,
  Description as DocsIcon,
  AutoGraph as DiagramIcon,
  CloudUpload as CloudUploadIcon,
  GridView as GridViewIcon,
} from '@mui/icons-material';

// Define sidebar navigation item type
interface NavItem {
  title: string;
  path: string;
  icon: ReactNode;
  children?: NavItem[];
  highlight?: boolean;
}

// Create navigation data
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <DashboardIcon />,
  },
  {
    title: 'AI Diagram Editor',
    path: '/diagram-chat',
    icon: <DiagramIcon />,
    highlight: true,
  },
  {
    title: 'AI Assistant',
    path: '/chat',
    icon: <ChatIcon />,
  },
  {
    title: 'Diagram Upload',
    path: '/diagram-upload',
    icon: <CloudUploadIcon />,
  },
  {
    title: 'Icon Explorer',
    path: '/icons',
    icon: <GridViewIcon />,
  },
  {
    title: 'Terraform Preview',
    path: '/terraform',
    icon: <CodeIcon />,
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
  },
];

// Define Sidebar props
interface SidebarProps {
  drawerWidth: number;
}

const Sidebar = ({ drawerWidth }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for open/collapsed nested menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    '/wizard': location.pathname.startsWith('/wizard'),
    '/resources': location.pathname.startsWith('/resources'),
  });

  // Toggle menu open/closed
  const handleMenuToggle = (path: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Check if a path is active
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return path !== '/' && location.pathname.startsWith(path);
  };

  // Render sidebar items recursively
  const renderNavItems = (items: NavItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.path}>
        <ListItemButton
          sx={{
            pl: 2 + level * 2,
            py: 1,
            bgcolor: isActive(item.path) ? 'action.selected' : 'transparent',
          }}
          onClick={() => {
            if (item.children) {
              handleMenuToggle(item.path);
            } else {
              handleNavigation(item.path);
            }
          }}
        >
          <Tooltip title={item.title} placement="right" arrow>
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          </Tooltip>
          <ListItemText 
            primary={
              <Typography variant="body2" sx={{ fontWeight: isActive(item.path) ? 600 : 400 }}>
                {item.title}
              </Typography>
            } 
          />
          {item.children && (openMenus[item.path] ? <ExpandLess /> : <ExpandMore />)}
          {item.highlight && (
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 5,
                height: '50%',
                bgcolor: 'primary.main',
                borderTopLeftRadius: 4,
                borderBottomLeftRadius: 4,
              }}
            />
          )}
        </ListItemButton>
        
        {item.children && (
          <Collapse in={openMenus[item.path]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {renderNavItems(item.children, level + 1)}
            </List>
          </Collapse>
        )}
      </div>
    ));
  };

  return (
    <Box sx={{ width: drawerWidth, overflow: 'auto' }}>
      {/* App Logo/Title */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
          Azure Diagram Maker
        </Typography>
      </Box>
      
      <Divider />
      
      {/* Navigation Items */}
      <List component="nav" sx={{ px: 1 }}>
        {renderNavItems(navItems)}
      </List>
      
      <Divider sx={{ mt: 2 }} />
      
      {/* Bottom Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Version 0.1.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar; 