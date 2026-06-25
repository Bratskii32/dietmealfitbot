import { Navigate, useLocation } from 'react-router-dom';
import { isTelegramWebApp, getStoredToken } from '../utils/telegram';

export function WebAppGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (isTelegramWebApp()) {
    return <>{children}</>;
  }

  if (!getStoredToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
