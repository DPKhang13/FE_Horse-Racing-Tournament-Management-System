import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Bell,
  CalendarCheck2,
  Check,
  ClipboardCheck,
  Edit3,
  Flag,
  Gift,
  Inbox,
  Search,
  Send,
  Trash2,
  Trophy,
  UserCheck,
  X,
} from 'lucide-react';
import { mockNotifications } from '../../mocks/notificationMockData';
import { getApiErrorMessage } from '../../services/apiClient';
import { notificationService, type NotificationFormData, type NotificationItem } from '../../services/notificationService';

type ReadFilter = 'all' | 'unread' | 'read';
type NotificationTone = 'success' | 'warning' | 'info' | 'premium';

const initialForm: NotificationFormData = {
  title: '',
  message: '',
  type: 'general',
  refId: undefined,
  refType: '',
  isRead: false,
};

const typeOptions = [
  { value: 'registration_approved', label: 'Registration Approved' },
  { value: 'jockey_assignment', label: 'Jockey Assignment' },
  { value: 'race_result_published', label: 'Race Result Published' },
  { value: 'prediction_reward', label: 'Prediction Reward' },
  { value: 'schedule_update', label: 'Schedule Update' },
  { value: 'general', label: 'General' },
];

const typeMeta: Record<string, { label: string; tone: NotificationTone; icon: ReactNode }> = {
  registration_approved: {
    label: 'Registration',
    tone: 'success',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  jockey_assignment: {
    label: 'Assignment',
    tone: 'info',
    icon: <UserCheck className="h-5 w-5" />,
  },
  race_result_published: {
    label: 'Result',
    tone: 'premium',
    icon: <Trophy className="h-5 w-5" />,
  },
  prediction_reward: {
    label: 'Reward',
    tone: 'premium',
    icon: <Gift className="h-5 w-5" />,
  },
  schedule_update: {
    label: 'Schedule',
    tone: 'warning',
    icon: <CalendarCheck2 className="h-5 w-5" />,
  },
  general: {
    label: 'General',
    tone: 'info',
    icon: <Bell className="h-5 w-5" />,
  },
};

const isReadNotification = (item: NotificationItem) => {
  if (item.isRead !== undefined) {
    return item.isRead;
  }

  const status = item.status?.toLowerCase();
  return status === 'read' || Boolean(item.readAt);
};

const getNotificationMeta = (type?: string) => typeMeta[type ?? 'general'] ?? {
  label: type ? titleCase(type) : 'General',
  tone: 'info' as const,
  icon: <Flag className="h-5 w-5" />,
};

const titleCase = (value: string) => value
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'No timestamp';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [form, setForm] = useState<NotificationFormData>(initialForm);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadNotifications = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const notificationList = await notificationService.getNotifications();
      setNotifications(notificationList.length > 0 ? notificationList : mockNotifications);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load notifications. Showing sample notification data.'));
      setNotifications(mockNotifications);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return notifications.filter((item) => {
      const isRead = isReadNotification(item);
      const matchesReadFilter =
        readFilter === 'all' ||
        (readFilter === 'read' && isRead) ||
        (readFilter === 'unread' && !isRead);
      const matchesTypeFilter = typeFilter === 'all' || item.type === typeFilter;
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.message.toLowerCase().includes(normalizedSearch) ||
        (item.type ?? '').toLowerCase().includes(normalizedSearch);

      return matchesReadFilter && matchesTypeFilter && matchesSearch;
    });
  }, [notifications, readFilter, searchTerm, typeFilter]);

  const metrics = useMemo(() => {
    const unreadCount = notifications.filter((item) => !isReadNotification(item)).length;
    const resultCount = notifications.filter((item) => item.type === 'race_result_published').length;
    const rewardCount = notifications.filter((item) => item.type === 'prediction_reward').length;

    return [
      { label: 'Total Alerts', value: notifications.length, tone: 'text-primary' },
      { label: 'Unread', value: unreadCount, tone: 'text-error' },
      { label: 'Results', value: resultCount, tone: 'text-secondary' },
      { label: 'Rewards', value: rewardCount, tone: 'text-primary' },
    ];
  }, [notifications]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      if (editingId) {
        await notificationService.updateNotification(editingId, form);
        setMessage('Notification updated.');
      } else {
        await notificationService.createNotification(form);
        setMessage('Notification created.');
      }
      setForm(initialForm);
      setEditingId(undefined);
      await loadNotifications();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not save notification.'));
    }
  };

  const handleEdit = (item: NotificationItem) => {
    setEditingId(item.notificationId);
    setForm({
      title: item.title,
      message: item.message,
      type: item.type ?? 'general',
      refId: item.refId,
      refType: item.refType ?? '',
      isRead: isReadNotification(item),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(undefined);
    setForm(initialForm);
  };

  const handleMarkRead = async (id: number) => {
    setMessage('');
    setErrorMessage('');

    try {
      await notificationService.markAsRead(id);
      setMessage('Notification marked as read.');
      await loadNotifications();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not mark notification as read.'));
    }
  };

  const handleDelete = async (id: number) => {
    setMessage('');
    setErrorMessage('');

    try {
      await notificationService.deleteNotification(id);
      setMessage('Notification deleted.');
      await loadNotifications();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not delete notification.'));
    }
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <section className="border-b border-outline-variant/40 bg-surface-container-low/80">
        <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Notification Center</p>
              <h1 className="font-display mt-3 text-4xl font-extrabold text-primary md:text-5xl">Race operations inbox</h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">{item.label}</p>
                  <strong className={`font-display mt-2 block text-3xl font-extrabold ${item.tone}`}>
                    {String(item.value).padStart(2, '0')}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-8 md:px-8 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
        <aside className="space-y-6">
          {message && <StatusBanner tone="success" text={message} />}
          {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

          <section className="glass-panel rounded-xl p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Composer</p>
                <h2 className="font-display mt-1 text-2xl font-bold text-on-surface">
                  {editingId ? 'Edit alert' : 'Create alert'}
                </h2>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg border border-outline-variant/60 p-2 text-on-surface-variant transition hover:border-primary hover:text-primary"
                  aria-label="Cancel edit"
                  title="Cancel edit"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <Send className="h-5 w-5 text-secondary" />
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <TextInput label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
              <TextArea label="Message" value={form.message} onChange={(value) => setForm((current) => ({ ...current, message: value }))} required />
              <SelectInput label="Notification type" value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value }))} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <TextInput label="Reference ID" type="number" value={form.refId ? String(form.refId) : ''} onChange={(value) => setForm((current) => ({ ...current, refId: value ? Number(value) : undefined }))} />
                <TextInput label="Reference type" value={form.refType ?? ''} onChange={(value) => setForm((current) => ({ ...current, refType: value }))} />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-lowest/50 px-4 py-3 text-sm font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={form.isRead}
                  onChange={(event) => setForm((current) => ({ ...current, isRead: event.target.checked }))}
                  className="h-4 w-4 accent-secondary"
                />
                Mark as read after sending
              </label>
              <button className="gold-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-extrabold text-on-primary transition active:scale-[0.99]">
                {editingId ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {editingId ? 'Update alert' : 'Create alert'}
              </button>
            </form>
          </section>
        </aside>

        <section className="glass-panel min-w-0 rounded-xl p-5 md:p-6">
          <div className="flex flex-col gap-5 border-b border-outline-variant/40 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Inbox</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-on-surface">All notifications</h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search notifications"
                  className="min-w-0 w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest/60 py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['all', 'unread', 'read'] as ReadFilter[]).map((item) => (
                <FilterButton key={item} isActive={readFilter === item} onClick={() => setReadFilter(item)}>
                  {titleCase(item)}
                </FilterButton>
              ))}
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest/60 px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-72"
            >
              <option value="all">All notification types</option>
              {typeOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 space-y-3">
            {isLoading && <EmptyState icon={<Inbox className="h-6 w-6" />} title="Loading notifications" text="Fetching the latest racing updates." />}

            {!isLoading && filteredNotifications.map((item) => (
              <NotificationCard
                key={item.notificationId}
                item={item}
                onEdit={handleEdit}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}

            {!isLoading && filteredNotifications.length === 0 && (
              <EmptyState
                icon={<Inbox className="h-6 w-6" />}
                title="No notifications found"
                text="Try changing the filters or search keyword."
              />
            )}
          </div>
        </section>
      </section>
    </main>
  );
};

const NotificationCard = ({
  item,
  onEdit,
  onMarkRead,
  onDelete,
}: {
  item: NotificationItem;
  onEdit: (item: NotificationItem) => void;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) => {
  const isRead = isReadNotification(item);
  const meta = getNotificationMeta(item.type);
  const toneClasses: Record<NotificationTone, string> = {
    success: 'border-secondary/50 bg-secondary-container/20 text-secondary',
    warning: 'border-primary/50 bg-primary/10 text-primary',
    info: 'border-outline-variant/60 bg-surface-container-high/50 text-on-surface',
    premium: 'border-primary/60 bg-primary/15 text-primary',
  };

  return (
    <article className={`group rounded-xl border bg-surface-container-lowest/55 p-4 transition hover:border-primary/60 hover:bg-surface-container-low ${isRead ? 'border-outline-variant/40' : 'border-secondary/50'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${toneClasses[meta.tone]}`}>
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${toneClasses[meta.tone]}`}>
                {meta.label}
              </span>
              <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${isRead ? 'bg-surface-container-high text-on-surface-variant' : 'bg-error-container/35 text-error'}`}>
                {isRead ? 'Read' : 'Unread'}
              </span>
            </div>
            <h3 className="font-display mt-3 break-words text-xl font-bold text-on-surface">{item.title}</h3>
            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-on-surface-variant">{item.message}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-outline">
              <span>{formatDateTime(item.createdAt)}</span>
              {item.refType && <span>{titleCase(item.refType)}</span>}
              {item.refId !== undefined && <span>Ref #{item.refId}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 lg:opacity-80 lg:transition lg:group-hover:opacity-100">
          <IconButton label="Edit notification" onClick={() => onEdit(item)}>
            <Edit3 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Mark as read" onClick={() => onMarkRead(item.notificationId)} disabled={isRead}>
            <Check className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete notification" onClick={() => onDelete(item.notificationId)} danger>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </article>
  );
};

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone === 'success' ? 'border-secondary/40 bg-secondary-container/25 text-secondary' : 'border-error/40 bg-error-container/25 text-error'}`}>
    {text}
  </div>
);

const FilterButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition ${
      isActive
        ? 'border-primary bg-primary text-on-primary'
        : 'border-outline-variant/60 bg-surface-container-lowest/50 text-on-surface-variant hover:border-primary hover:text-primary'
    }`}
  >
    {children}
  </button>
);

const IconButton = ({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? 'border-error/40 text-error hover:bg-error-container/20'
        : 'border-outline-variant/60 text-on-surface-variant hover:border-primary hover:text-primary'
    }`}
  >
    {children}
  </button>
);

const TextInput = ({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) => (
  <label className="grid min-w-0 gap-2">
    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-outline">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="min-w-0 w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest/60 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </label>
);

const TextArea = ({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) => (
  <label className="grid min-w-0 gap-2">
    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-outline">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      rows={4}
      className="min-w-0 w-full resize-none rounded-lg border border-outline-variant/60 bg-surface-container-lowest/60 px-4 py-3 text-sm leading-6 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </label>
);

const SelectInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="grid min-w-0 gap-2">
    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-outline">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest/60 px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {typeOptions.map((item) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  </label>
);

const EmptyState = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-lowest/35 p-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface-variant">
      {icon}
    </div>
    <h3 className="font-display mt-4 text-xl font-bold text-on-surface">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">{text}</p>
  </div>
);

export default NotificationsPage;
