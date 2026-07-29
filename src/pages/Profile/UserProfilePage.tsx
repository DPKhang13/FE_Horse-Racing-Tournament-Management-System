import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AtSign,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  IdCard,
  Mail,
  MapPin,
  Medal,
  Phone,
  ShieldCheck,
  Trophy,
  User,
} from 'lucide-react';
import { getAccessToken } from '../../services/apiClient';
import { authService } from '../../services/authService';
import type { UserProfile, UserRoleType } from '../../types/user';

const roleLabels: Record<UserRoleType, string> = {
  admin: 'Administrator',
  horse_owner: 'Horse Owner',
  jockey: 'Jockey',
  race_referee: 'Race Referee',
  spectator: 'Spectator',
};

const fallbackUser: UserProfile = {
  id: 'current-user',
  fullName: 'Current User',
  email: '',
  role: 'User',
  joinedDate: new Date().toISOString(),
  status: 'Pending',
};

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('en-US').format(value);
};

const displayValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
};

const getRoleLabel = (user: UserProfile) => (user.roleType ? roleLabels[user.roleType] : user.role);

const getInitials = (name: string) => {
  const initials = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'U';
};

const UserProfilePage = () => {
  const [user, setUser] = useState<UserProfile>(() => authService.getStoredUserProfile() ?? fallbackUser);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!getAccessToken()) {
        setUser(fallbackUser);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const profile = await authService.getCurrentUser();

        if (isMounted) {
          setUser(profile);
        }
      } catch (error) {
        if (isMounted) {
          const storedProfile = authService.getStoredUserProfile();
          setUser(storedProfile ?? fallbackUser);
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load profile.');
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

  const roleSpecificFields = useMemo(() => getRoleSpecificFields(user), [user]);
  const hasRoleSpecificProfile = roleSpecificFields.length > 0;

  return (
    <div className="min-h-screen bg-surface py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <section className="admin-surface-panel overflow-hidden rounded-2xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-transparent" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-primary/25 bg-surface-container-low shadow-xl shadow-black/20">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-black text-primary">
                      {getInitials(user.fullName)}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={user.status} />
                    <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-secondary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {getRoleLabel(user)}
                    </span>
                  </div>
                  <h1 className="break-words font-display text-3xl font-black text-primary sm:text-4xl">
                    {user.fullName}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-on-surface-variant">
                    Profile information loaded from your authenticated HTMS account.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-80">
                <MiniStat icon={Calendar} label="Joined" value={formatDate(user.joinedDate)} />
                <MiniStat icon={Hash} label="User ID" value={displayValue(user.userId ?? user.id)} />
              </div>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-xl border border-error/35 bg-error-container/20 px-4 py-3 text-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
            Loading profile...
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <ProfileSection title="Account Information" description="Core identity and contact details.">
            <InfoItem icon={User} label="Full name" value={user.fullName} />
            <InfoItem icon={AtSign} label="Username" value={user.username} />
            <InfoItem icon={Mail} label="Email" value={user.email} />
            <InfoItem icon={Phone} label="Phone" value={user.phone} />
            <InfoItem icon={MapPin} label="Address" value={user.address} />
            <InfoItem icon={Clock} label="Created at" value={formatDate(user.createdAt ?? user.joinedDate)} />
          </ProfileSection>

          <ProfileSection
            title="Role Profile"
            description={hasRoleSpecificProfile ? `${getRoleLabel(user)} details available from the backend profile.` : 'No extra role profile fields are available for this account.'}
          >
            {hasRoleSpecificProfile ? (
              roleSpecificFields.map((field) => (
                <InfoItem key={field.label} icon={field.icon} label={field.label} value={field.value} />
              ))
            ) : (
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest/60 p-5 text-sm font-semibold text-on-surface-variant">
                This role does not currently expose additional profile data through <span className="font-mono text-primary">GET /api/auth/me</span>.
              </div>
            )}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
};

type ProfileField = {
  icon: typeof User;
  label: string;
  value?: string | number | null;
};

const getRoleSpecificFields = (user: UserProfile): ProfileField[] => {
  if (user.roleType === 'horse_owner') {
    const profile = user.ownerProfile;

    return [
      { icon: Building2, label: 'Stable name', value: profile?.stableName },
      { icon: IdCard, label: 'License number', value: profile?.licenseNumber },
      { icon: MapPin, label: 'Stable address', value: profile?.address },
      { icon: Hash, label: 'Owner ID', value: profile?.ownerId },
      { icon: BadgeCheck, label: 'Profile status', value: profile?.status },
      { icon: Calendar, label: 'Profile created', value: formatDate(profile?.createdAt) },
    ];
  }

  if (user.roleType === 'jockey') {
    const profile = user.jockeyProfile;

    return [
      { icon: IdCard, label: 'License number', value: profile?.licenseNumber },
      { icon: Trophy, label: 'Ranking points', value: formatNumber(profile?.rankingPoints) },
      { icon: Medal, label: 'Total wins', value: formatNumber(profile?.totalWins) },
      { icon: Hash, label: 'Total races', value: formatNumber(profile?.totalRaces) },
      { icon: Calendar, label: 'Experience', value: profile?.experienceYears === undefined ? undefined : `${profile.experienceYears} years` },
      { icon: BadgeCheck, label: 'Profile status', value: profile?.status },
    ];
  }

  if (user.roleType === 'race_referee') {
    const profile = user.refereeProfile;

    return [
      { icon: IdCard, label: 'License number', value: profile?.licenseNumber },
      { icon: MapPin, label: 'Address', value: profile?.address },
      { icon: Hash, label: 'Referee ID', value: profile?.refereeId },
      { icon: BadgeCheck, label: 'Profile status', value: profile?.status },
      { icon: Calendar, label: 'Profile created', value: formatDate(profile?.createdAt) },
    ];
  }

  if (user.roleType === 'admin' || user.roleType === 'spectator') {
    return [
      { icon: BadgeCheck, label: 'Account status', value: user.status },
      { icon: ShieldCheck, label: 'Role type', value: user.roleType },
    ];
  }

  return [];
};

const ProfileSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="admin-surface-panel rounded-2xl p-5 sm:p-6 lg:p-7">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary">Profile</p>
        <h2 className="mt-2 font-display text-2xl font-black text-primary">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-on-surface-variant">{description}</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </section>
);

const InfoItem = ({ icon: Icon, label, value }: ProfileField) => (
  <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest/70 p-4 transition-all duration-300 hover:border-primary/35 hover:bg-surface-container-low">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-xs font-black uppercase tracking-[0.14em] text-outline">{label}</p>
    <p className="mt-1 break-words text-sm font-bold text-on-surface">{displayValue(value)}</p>
  </div>
);

const MiniStat = ({ icon: Icon, label, value }: ProfileField) => (
  <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest/70 p-4">
    <div className="mb-2 flex items-center gap-2 text-primary">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-black uppercase tracking-[0.12em]">{label}</span>
    </div>
    <p className="break-words text-sm font-bold text-on-surface">{displayValue(value)}</p>
  </div>
);

const StatusBadge = ({ status }: { status: UserProfile['status'] }) => {
  const isActive = status === 'Active';
  const className = isActive
    ? 'border-secondary/25 bg-secondary/10 text-secondary'
    : status === 'Pending'
      ? 'border-primary/25 bg-primary/10 text-primary'
      : 'border-error/25 bg-error-container/20 text-error';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${className}`}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      {status}
    </span>
  );
};

export default UserProfilePage;