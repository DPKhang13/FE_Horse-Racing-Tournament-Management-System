import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../services/apiClient';
import { authService } from '../services/authService';
import type { UserProfile, UserRoleType } from '../types/user';
import { canAccessRole, getDefaultRouteForRole, roleLabels } from '../utils/permissions';

type ProtectedRouteProps = {
  allowedRoles?: UserRoleType[];
  children: ReactNode;
};

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()) && !profile);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!getAccessToken()) {
        setIsLoading(false);
        setProfile(undefined);
        return;
      }

      setIsLoading(true);

      try {
        const currentProfile = await authService.getCurrentUser();

        if (isMounted) {
          setProfile(currentProfile);
        }
      } catch {
        if (isMounted) {
          setProfile(undefined);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ mode: 'login', from: location }} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-surface px-4 py-16">
        <div className="mx-auto max-w-container rounded-lg border border-outline-variant bg-white p-8 text-body-sm font-semibold text-on-surface-variant">
          Checking account permissions...
        </div>
      </div>
    );
  }

  if (!canAccessRole(profile?.roleType, allowedRoles)) {
    return <AccessDeniedPage roleType={profile?.roleType} allowedRoles={allowedRoles} />;
  }

  return children;
};

const AccessDeniedPage = ({
  roleType,
  allowedRoles = [],
}: {
  roleType?: UserRoleType;
  allowedRoles?: UserRoleType[];
}) => {
  const homeRoute = getDefaultRouteForRole(roleType);
  const allowedRoleText = allowedRoles.map((role) => roleLabels[role]).join(', ') || 'authenticated users';

  return (
    <div className="min-h-[60vh] bg-surface px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-lg border border-outline-variant bg-white p-8 shadow-sm">
        <p className="mb-2 text-label-sm font-bold uppercase tracking-wider text-outline">Access restricted</p>
        <h1 className="mb-4 text-headline-md font-bold text-primary">This page is not available for your role.</h1>
        <p className="mb-6 text-body-md text-on-surface-variant">
          Current role: <span className="font-semibold text-primary">{roleType ? roleLabels[roleType] : 'Unknown'}</span>.
          This page is available for: <span className="font-semibold text-primary">{allowedRoleText}</span>.
        </p>
        <Link
          to={homeRoute}
          className="inline-flex rounded-md bg-primary px-6 py-3 text-body-sm font-bold text-on-primary hover:bg-opacity-90"
        >
          Go to my dashboard
        </Link>
      </div>
    </div>
  );
};

export default ProtectedRoute;
