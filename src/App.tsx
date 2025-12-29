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

import FrontendLayout from './components/FrontendLayout';
import FrontendBlogList from './pages/FrontendBlogList';
import FrontendArticleView from './pages/FrontendArticleView';

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
      {/* Public Routes */}
      <Route element={<FrontendLayout />}>
        <Route path="/" element={<FrontendBlogList />} />
        <Route path="/article/:id" element={<FrontendArticleView />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
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
        <Route path="blog" element={<AutoBlog />} />
        <Route path="blog/:id" element={<AutoBlog />} />
      </Route>

      {/* Redirects */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
