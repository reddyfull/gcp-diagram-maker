import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import DiagramUpload from './pages/DiagramUpload';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import { ThemeProvider } from './components/ThemeProvider';
import './App.css';

const App = () => {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="diagram" element={<DiagramUpload />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
