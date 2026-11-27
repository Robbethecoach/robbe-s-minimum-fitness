import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { hasAccess } from '@/lib/membership';

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center">
    <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground">Loading...</p>
  </div>
);

/**
 * Signed-in pages. By default also needs access: Robbe, free days left, or a running membership.
 * Without access the member lands on /membership to subscribe.
 */
const ProtectedRoute = ({ children, requireAccess = true }: { children: React.ReactNode; requireAccess?: boolean }) => {
  const { user, loading } = useAuth();
  const { state, isLoading } = useMembership();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireAccess) {
    if (isLoading || !state) return <Loading />;
    if (!hasAccess(state)) return <Navigate to="/membership" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
