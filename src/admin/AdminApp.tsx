import { useState } from 'react';
import { getAdminToken } from '../api/admin';
import Login from './Login';
import Dashboard from './Dashboard';

/** Root of the /admin area. Shows the login screen until a session token exists. */
export default function AdminApp() {
  const [token, setToken] = useState<string | null>(() => getAdminToken());

  if (!token) {
    return <Login onLogin={(t) => setToken(t)} />;
  }
  return <Dashboard token={token} onLogout={() => setToken(null)} />;
}
