import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import AdminLogin from './AdminLogin.tsx';
import AdminPanel from './AdminPanel.tsx';

// ?admin in the URL → show admin flow; else → employee app
const IS_ADMIN = window.location.search.includes('admin');

function AdminRoot() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return <AdminPanel onLogout={() => setAuthed(false)} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {IS_ADMIN ? <AdminRoot /> : <App />}
  </StrictMode>
);
