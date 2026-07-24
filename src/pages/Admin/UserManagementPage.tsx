import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  CheckCircle2,
  CircleSlash,
  Filter,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import ImageUploadField from '../../components/forms/ImageUploadField';
import { getApiErrorMessage } from '../../services/apiClient';
import {
  adminUserService,
  type AdminCreateUserRequest,
  type AdminUser,
  type AdminUserStatus,
  type AdminUpdateUserRequest,
} from '../../services/adminUserService';
import { getUploadedImageUrl, uploadService } from '../../services/uploadService';
import type { UserRoleType } from '../../types/user';
import { roleLabels } from '../../utils/permissions';

type RoleFilter = UserRoleType | 'All';
type StatusFilter = AdminUserStatus | 'All';
type UserFormData = AdminCreateUserRequest;
type UserFormErrors = Partial<Record<keyof UserFormData, string>>;
type UserStats = {
  total: number;
  active: number;
  owners: number;
  jockeys: number;
};

const roleOptions: UserRoleType[] = ['admin', 'horse_owner', 'jockey', 'race_referee', 'spectator'];
const statusOptions: AdminUserStatus[] = ['active', 'inactive', 'pending'];
const pageSizeOptions = [10, 20, 50];

const emptyUserForm: UserFormData = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
  roleType: 'spectator',
  licenseNumber: '',
  experienceYears: undefined,
  stableName: '',
  address: '',
  avatarUrl: '',
};

const formatStatusLabel = (status: AdminUserStatus | string) => {
  const value = String(status || 'active');
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
};

const formatRoleLabel = (roleType?: UserRoleType) => (roleType ? roleLabels[roleType] : 'Unknown');

const getUserInitials = (user: Pick<AdminUser, 'fullName' | 'username'>) => {
  const name = user.fullName || user.username;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
};

const getStatusClassName = (status: AdminUserStatus) => {
  if (status === 'active') {
    return 'bg-secondary/10 text-secondary';
  }

  if (status === 'pending') {
    return 'bg-primary/10 text-primary';
  }

  return 'bg-error-container/30 text-error';
};

const toFormData = (user: AdminUser): UserFormData => {
  const ownerProfile = user.horseOwnerProfile ?? user.ownerProfile;

  return {
    username: user.username,
    email: user.email,
    password: '',
    fullName: user.fullName,
    phone: user.phone ?? '',
    roleType: user.roleType ?? 'spectator',
    stableName: ownerProfile?.stableName ?? '',
    licenseNumber: ownerProfile?.licenseNumber ?? user.jockeyProfile?.licenseNumber ?? user.refereeProfile?.licenseNumber ?? '',
    experienceYears: user.jockeyProfile?.experienceYears,
    address: ownerProfile?.address ?? user.refereeProfile?.address ?? '',
    avatarUrl: user.avatarUrl ?? '',
  };
};

const validateUserForm = (data: UserFormData, isEditing: boolean) => {
  const errors: UserFormErrors = {};

  if (!data.username.trim()) {
    errors.username = 'Username is required.';
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!isEditing && !data.password.trim()) {
    errors.password = 'Password is required.';
  }

  if (!data.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone is required.';
  }

  if (data.roleType === 'horse_owner' && !data.stableName?.trim()) {
    errors.stableName = 'Stable name is required for horse owners.';
  }

  if ((data.roleType === 'jockey' || data.roleType === 'race_referee') && !data.licenseNumber?.trim()) {
    errors.licenseNumber = 'License number is required for this role.';
  }

  if (data.roleType === 'jockey' && data.experienceYears !== undefined && Number(data.experienceYears) < 0) {
    errors.experienceYears = 'Experience years cannot be negative.';
  }

  return errors;
};

const toUpdatePayload = (data: UserFormData): AdminUpdateUserRequest => ({
  username: data.username,
  email: data.email,
  fullName: data.fullName,
  phone: data.phone,
  stableName: data.stableName,
  licenseNumber: data.licenseNumber,
  experienceYears: data.experienceYears,
  address: data.address,
});

const UserManagementPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, owners: 0, jockeys: 0 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionUserId, setActionUserId] = useState<number | string | null>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [keyword]);

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await adminUserService.getUsers({
        keyword: debouncedKeyword,
        roleType: roleFilter,
        status: statusFilter,
        page,
        size,
        sort: 'createdAt,desc',
      });

      setUsers(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setPage(data.number);
      setSize(data.size);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load users.'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [allUsers, activeUsers, horseOwners, jockeys] = await Promise.all([
        adminUserService.getUsers({ page: 0, size: 1 }),
        adminUserService.getUsers({ status: 'active', page: 0, size: 1 }),
        adminUserService.getUsers({ roleType: 'horse_owner', page: 0, size: 1 }),
        adminUserService.getUsers({ roleType: 'jockey', page: 0, size: 1 }),
      ]);

      setStats({
        total: allUsers.totalElements,
        active: activeUsers.totalElements,
        owners: horseOwners.totalElements,
        jockeys: jockeys.totalElements,
      });
    } catch {
      setStats((current) => ({ ...current, total: totalElements }));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await adminUserService.getUsers({
          keyword: debouncedKeyword,
          roleType: roleFilter,
          status: statusFilter,
          page,
          size,
          sort: 'createdAt,desc',
        });

        if (isMounted) {
          setUsers(data.content);
          setTotalElements(data.totalElements);
          setTotalPages(data.totalPages);
          setPage(data.number);
          setSize(data.size);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load users.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [debouncedKeyword, page, roleFilter, size, statusFilter]);

  useEffect(() => {
    void loadStats();
  }, []);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) {
      return [0];
    }

    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    const end = Math.min(totalPages, start + 5);

    return Array.from({ length: end - start }, (_, index) => start + index);
  }, [page, totalPages]);

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData(emptyUserForm);
    setFormErrors({});
    setSelectedImageFile(null);
    setMessage('');
    setIsFormOpen(true);
  };

  const openEditModal = async (user: AdminUser) => {
    setActionUserId(user.userId);
    setMessage('');
    setErrorMessage('');

    try {
      const detail = await adminUserService.getUserDetail(user.userId);
      setSelectedUser(detail);
      setFormData(toFormData(detail));
      setFormErrors({});
      setSelectedImageFile(null);
      setIsFormOpen(true);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load user details.'));
    } finally {
      setActionUserId(null);
    }
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
    setFormErrors({});
    setSelectedImageFile(null);
  };

  const handleFilterRoleChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setPage(0);
  };

  const handleFilterStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handlePageSizeChange = (nextSize: number) => {
    setSize(nextSize);
    setPage(0);
  };

  const handleFieldChange = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));

    if (formErrors[field]) {
      setFormErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isEditing = Boolean(selectedUser);
    const errors = validateUserForm(formData, isEditing);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      let nextFormData = formData;

      if (selectedImageFile) {
        const uploadResponse = selectedUser
          ? await uploadService.uploadUserImage(selectedUser.userId, selectedImageFile)
          : await uploadService.uploadNewUserImage(selectedImageFile);
        const avatarUrl = getUploadedImageUrl(uploadResponse);

        if (!avatarUrl) {
          throw new Error('The image upload did not return an image URL.');
        }

        nextFormData = { ...formData, avatarUrl };
      }

      if (selectedUser) {
        await adminUserService.updateUser(selectedUser.userId, toUpdatePayload(nextFormData));
        setMessage('User updated.');
      } else {
        await adminUserService.createUser(nextFormData);
        setMessage('User created.');
      }

      closeFormModal();
      await loadUsers();
      await loadStats();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save user.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmed = window.confirm(`Set "${user.username}" to ${nextStatus}?`);

    if (!confirmed) {
      return;
    }

    setActionUserId(user.userId);
    setMessage('');
    setErrorMessage('');

    try {
      await adminUserService.updateStatus(user.userId, nextStatus);
      setMessage(`User marked ${nextStatus}.`);
      await loadUsers();
      await loadStats();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to update user status.'));
    } finally {
      setActionUserId(null);
    }
  };

  const openResetPasswordModal = (user: AdminUser) => {
    setResetUser(user);
    setNewPassword('');
    setMessage('');
  };

  const closeResetPasswordModal = () => {
    setResetUser(null);
    setNewPassword('');
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resetUser) {
      return;
    }

    if (newPassword.trim().length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    setActionUserId(resetUser.userId);
    setErrorMessage('');

    try {
      await adminUserService.resetPassword(resetUser.userId, newPassword);
      setMessage(`Password reset for ${resetUser.username}.`);
      closeResetPasswordModal();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to reset password.'));
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl border border-slate-700 p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">User Management</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">User Management</h1>
              <p className="max-w-2xl text-body-md text-gray-300">
                Manage account access, role profiles, and security actions across the racing platform.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[640px] xl:grid-cols-4">
              <MetricCard icon={<Users className="h-4 w-4" />} label="Total Users" value={String(stats.total).padStart(2, '0')} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={String(stats.active).padStart(2, '0')} />
              <MetricCard icon={<Shield className="h-4 w-4" />} label="Horse Owners" value={String(stats.owners).padStart(2, '0')} />
              <MetricCard icon={<UserCheck className="h-4 w-4" />} label="Jockeys" value={String(stats.jockeys).padStart(2, '0')} />
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/80 p-4 shadow-xl shadow-black/20">
          <div className="flex min-w-0 flex-row items-center gap-4 overflow-x-auto">
            <div className="relative min-w-[280px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search username, name, email..."
                className={filterInputClassName}
              />
            </div>

            <div className="relative w-[220px] shrink-0">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <select
                value={roleFilter}
                onChange={(event) => handleFilterRoleChange(event.target.value as RoleFilter)}
                className={filterInputClassName}
                aria-label="Role type filter"
              >
                <option value="All">All roles</option>
                {roleOptions.map((roleType) => (
                  <option key={roleType} value={roleType}>{roleLabels[roleType]}</option>
                ))}
              </select>
            </div>

            <div className="relative w-[200px] shrink-0">
              <CircleSlash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <select
                value={statusFilter}
                onChange={(event) => handleFilterStatusChange(event.target.value as StatusFilter)}
                className={filterInputClassName}
                aria-label="Status filter"
              >
                <option value="All">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="gold-gradient ml-auto inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-body-sm font-extrabold text-on-primary transition-all"
            >
              <Plus className="h-4 w-4" />
              Create User
            </button>
          </div>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="glass-panel overflow-hidden rounded-xl border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="border-b border-slate-700 bg-slate-800">
                <tr>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Avatar</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Username</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Full Name</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Email</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Role Type</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {!isLoading && users.map((user) => (
                  <tr key={String(user.userId)} className="transition-colors hover:bg-slate-800/70">
                    <td className="px-5 py-4">
                      <Avatar user={user} />
                    </td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{user.username}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-gray-300">{user.fullName}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-gray-300">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-slate-700/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                        {formatRoleLabel(user.roleType)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton label={`Edit ${user.username}`} onClick={() => void openEditModal(user)} disabled={actionUserId === user.userId}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={`${user.status === 'active' ? 'Deactivate' : 'Activate'} ${user.username}`}
                          onClick={() => void handleToggleStatus(user)}
                          danger={user.status === 'active'}
                          disabled={user.status === 'pending' || actionUserId === user.userId}
                        >
                          {user.status === 'active' ? <CircleSlash className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </IconButton>
                        <IconButton
                          label={`Reset password for ${user.username}`}
                          onClick={() => openResetPasswordModal(user)}
                          disabled={actionUserId === user.userId}
                        >
                          <KeyRound className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(isLoading || users.length === 0) && (
            <EmptyTableState
              isLoading={isLoading}
              title={isLoading ? 'Loading users' : 'No users found'}
              description={isLoading ? 'Fetching user records.' : 'No users match the current search and filters.'}
            />
          )}

          <PaginationBar
            page={page}
            size={size}
            totalElements={totalElements}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>

      {isFormOpen && (
        <Modal
          title={selectedUser ? 'Edit User' : 'Create User'}
          subtitle={selectedUser?.username ?? 'New User'}
          onClose={closeFormModal}
        >
          <UserForm
            formData={formData}
            formErrors={formErrors}
            isSaving={isSaving}
            isEditing={Boolean(selectedUser)}
            selectedImageFile={selectedImageFile}
            onImageFileChange={setSelectedImageFile}
            onChange={handleFieldChange}
            onSubmit={handleSubmit}
            onCancel={closeFormModal}
          />
        </Modal>
      )}

      {resetUser && (
        <Modal title="Reset Password" subtitle={resetUser.username} onClose={closeResetPasswordModal} maxWidthClassName="max-w-lg">
          <ResetPasswordForm
            newPassword={newPassword}
            isSaving={actionUserId === resetUser.userId}
            onPasswordChange={setNewPassword}
            onSubmit={handleResetPassword}
            onCancel={closeResetPasswordModal}
          />
        </Modal>
      )}
    </div>
  );
};

const filterInputClassName =
  'h-12 w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 pl-10 text-body-sm text-gray-300 transition-colors focus:border-primary focus:outline-none';

const inputClassName =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-body-sm text-gray-300 transition-colors focus:border-primary focus:outline-none';

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4">
    <div className="mb-3 flex items-center justify-between text-outline">
      <span className="text-label-sm font-bold uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <p className="font-display text-2xl font-extrabold text-primary">{value}</p>
  </div>
);

const Avatar = ({ user }: { user: AdminUser }) => (
  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-800 text-label-md font-extrabold text-primary">
    {user.avatarUrl ? (
      <img src={user.avatarUrl} alt={`${user.username} avatar`} className="h-full w-full object-cover" />
    ) : (
      getUserInitials(user)
    )}
  </div>
);

const UserStatusBadge = ({ status }: { status: AdminUserStatus }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(status)}`}>
    {formatStatusLabel(status)}
  </span>
);

const IconButton = ({
  label,
  danger = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      danger
        ? 'border-error-container/60 text-error hover:border-error hover:bg-error-container/20'
        : 'border-slate-700 text-gray-300 hover:border-primary hover:text-primary'
    }`}
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div
    className={`mb-4 rounded-lg border px-4 py-3 text-body-sm font-semibold ${
      tone === 'success'
        ? 'border-secondary/40 bg-secondary/10 text-secondary'
        : 'border-error/40 bg-error-container/20 text-error'
    }`}
  >
    {text}
  </div>
);

const EmptyTableState = ({
  isLoading,
  title,
  description,
}: {
  isLoading: boolean;
  title: string;
  description: string;
}) => (
  <div className="px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
      {isLoading ? <Users className="h-6 w-6 text-outline" /> : <Search className="h-6 w-6 text-outline" />}
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-gray-300">{description}</p>
  </div>
);

const PaginationBar = ({
  page,
  size,
  totalElements,
  totalPages,
  pageNumbers,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const startItem = totalElements === 0 ? 0 : page * size + 1;
  const endItem = Math.min(totalElements, (page + 1) * size);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-700 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 text-body-sm text-gray-300">
        <span>
          Showing {startItem}-{endItem} of {totalElements}
        </span>
        <select
          value={size}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-body-sm text-gray-300 focus:border-primary focus:outline-none"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option} / page</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page <= 0}
          className="rounded-md border border-slate-700 px-4 py-2 text-body-sm font-bold text-gray-300 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-body-sm font-bold transition-colors ${
              pageNumber === page
                ? 'border-primary bg-primary text-on-primary'
                : 'border-slate-700 text-gray-300 hover:border-primary hover:text-primary'
            }`}
            aria-label={`Page ${pageNumber + 1}`}
          >
            {pageNumber + 1}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(Math.max(totalPages - 1, 0), page + 1))}
          disabled={totalPages === 0 || page >= totalPages - 1}
          className="rounded-md border border-slate-700 px-4 py-2 text-body-sm font-bold text-gray-300 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClassName = 'max-w-5xl',
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 px-4 py-8">
    <div className={`mx-auto ${maxWidthClassName} rounded-lg border border-slate-700 bg-slate-800 shadow-xl`}>
      <div className="flex items-start justify-between gap-6 border-b border-slate-700 p-6">
        <div>
          <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-gray-300 transition-colors hover:border-primary hover:text-primary"
          aria-label="Close modal"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="block text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    {children}
    {error && <span className="block text-label-md text-error">{error}</span>}
  </label>
);

const UserForm = ({
  formData,
  formErrors,
  isSaving,
  isEditing,
  selectedImageFile,
  onImageFileChange,
  onChange,
  onSubmit,
  onCancel,
}: {
  formData: UserFormData;
  formErrors: UserFormErrors;
  isSaving: boolean;
  isEditing: boolean;
  selectedImageFile: File | null;
  onImageFileChange: (file: File | null) => void;
  onChange: <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-8 p-6">
    <ImageUploadField
      currentImageUrl={formData.avatarUrl}
      alt={formData.fullName || formData.username || 'User avatar preview'}
      file={selectedImageFile}
      onFileChange={onImageFileChange}
      disabled={isSaving}
      shape="circle"
      label="User avatar"
      tone="dark"
    />
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Username" error={formErrors.username}>
        <input type="text" value={formData.username} onChange={(event) => onChange('username', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Email" error={formErrors.email}>
        <input type="email" value={formData.email} onChange={(event) => onChange('email', event.target.value)} className={inputClassName} />
      </Field>
      {!isEditing && (
        <Field label="Password" error={formErrors.password}>
          <input type="password" value={formData.password} onChange={(event) => onChange('password', event.target.value)} className={inputClassName} />
        </Field>
      )}
      <Field label="Full Name" error={formErrors.fullName}>
        <input type="text" value={formData.fullName} onChange={(event) => onChange('fullName', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Phone" error={formErrors.phone}>
        <input type="tel" value={formData.phone} onChange={(event) => onChange('phone', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Role Type">
        {isEditing ? (
          <div className="flex min-h-12 items-center rounded-md border border-slate-700 bg-slate-900/60 px-4 py-3 text-body-sm font-semibold text-gray-300">
            {roleLabels[formData.roleType]}
          </div>
        ) : (
          <select value={formData.roleType} onChange={(event) => onChange('roleType', event.target.value as UserRoleType)} className={inputClassName}>
            {roleOptions.map((roleType) => (
              <option key={roleType} value={roleType}>{roleLabels[roleType]}</option>
            ))}
          </select>
        )}
      </Field>

      {formData.roleType === 'horse_owner' && (
        <>
          <Field label="Stable Name" error={formErrors.stableName}>
            <input type="text" value={formData.stableName ?? ''} onChange={(event) => onChange('stableName', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Owner Address">
            <input type="text" value={formData.address ?? ''} onChange={(event) => onChange('address', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="License Number">
            <input type="text" value={formData.licenseNumber ?? ''} onChange={(event) => onChange('licenseNumber', event.target.value)} className={inputClassName} />
          </Field>
        </>
      )}

      {formData.roleType === 'jockey' && (
        <>
          <Field label="License Number" error={formErrors.licenseNumber}>
            <input type="text" value={formData.licenseNumber ?? ''} onChange={(event) => onChange('licenseNumber', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Experience Years" error={formErrors.experienceYears}>
            <input
              type="number"
              min="0"
              value={formData.experienceYears ?? ''}
              onChange={(event) => onChange('experienceYears', event.target.value === '' ? undefined : Number(event.target.value))}
              className={inputClassName}
            />
          </Field>
        </>
      )}

      {formData.roleType === 'race_referee' && (
        <>
          <Field label="License Number" error={formErrors.licenseNumber}>
            <input type="text" value={formData.licenseNumber ?? ''} onChange={(event) => onChange('licenseNumber', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Referee Address">
            <input type="text" value={formData.address ?? ''} onChange={(event) => onChange('address', event.target.value)} className={inputClassName} />
          </Field>
        </>
      )}
    </div>

    <div className="flex flex-col-reverse gap-3 border-t border-slate-700 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-700 px-6 py-3 text-body-sm font-bold text-gray-300 transition-colors hover:border-primary hover:text-primary"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:opacity-70"
      >
        {isSaving ? 'Saving...' : isEditing ? 'Save User' : 'Create User'}
      </button>
    </div>
  </form>
);

const ResetPasswordForm = ({
  newPassword,
  isSaving,
  onPasswordChange,
  onSubmit,
  onCancel,
}: {
  newPassword: string;
  isSaving: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-6 p-6">
    <Field label="New Password">
      <input
        type="password"
        value={newPassword}
        onChange={(event) => onPasswordChange(event.target.value)}
        className={inputClassName}
        autoFocus
      />
    </Field>

    <div className="flex flex-col-reverse gap-3 border-t border-slate-700 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-700 px-6 py-3 text-body-sm font-bold text-gray-300 transition-colors hover:border-primary hover:text-primary"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:opacity-70"
      >
        {isSaving ? 'Resetting...' : 'Reset Password'}
      </button>
    </div>
  </form>
);

export default UserManagementPage;
