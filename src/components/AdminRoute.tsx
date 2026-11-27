import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';

/** Robbe-only pages. Row level security blocks writes for anyone else anyway. */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin();

  if (loading || (user && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminRoute;
