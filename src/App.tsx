import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useStore } from './store';

import Dashboard from './pages/Dashboard';
import PostList from './pages/PostList';
import PostEditor from './pages/PostEditor';

// Placeholder Pages
import Media from './pages/Media';

function App() {
  const { settings } = useStore();

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<PostList />} />
          <Route path="posts/new" element={<PostEditor />} />
          <Route path="posts/:id" element={<PostEditor />} />
          <Route path="media" element={<Media />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
