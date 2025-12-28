import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useStore } from './store';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import PostList from './pages/PostList';
import PostEditor from './pages/PostEditor';
import Media from './pages/Media';
import AutoBlog from './pages/AutoBlog';
import Login from './pages/Login';
import Signup from './pages/Signup';

function AppContent() {
  const { settings, loadUserData, setUser, clearData } = useStore();
  const { user } = useAuth();

  useEffect(() => {
    // Simple Theme Application Logic
    const root = window.document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    root.classList.remove('light', 'dark');

    if (settings.theme === 'system') {
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  // Sync user state and load data
  useEffect(() => {
    if (user) {
      setUser(user);
      loadUserData(user.uid);
    } else {
      clearData();
    }
  }, [user, setUser, loadUserData, clearData]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<PostList />} />
        <Route path="posts/new" element={<PostEditor />} />
        <Route path="posts/:id" element={<PostEditor />} />
        <Route path="media" element={<Media />} />
        <Route path="autoblog" element={<AutoBlog />} />
        <Route path="autoblog/:id" element={<AutoBlog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
