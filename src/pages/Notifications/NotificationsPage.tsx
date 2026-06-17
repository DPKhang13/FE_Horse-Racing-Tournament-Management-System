import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { notificationService, type NotificationFormData, type NotificationItem } from '../../services/notificationService';

const initialForm: NotificationFormData = {
  title: '',
  message: '',
  type: 'general',
  refId: undefined,
  refType: '',
  isRead: false,
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [form, setForm] = useState<NotificationFormData>(initialForm);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      setNotifications(await notificationService.getNotifications());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load notifications.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

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
      refId: undefined,
      refType: '',
      isRead: item.status === 'read',
    });
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
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Notifications</p>
          <h1 className="mt-2 text-headline-lg font-bold text-primary">Notification center</h1>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
          <section className="glass-panel min-w-0 rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Bell className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-large font-bold text-primary">{editingId ? 'Edit notification' : 'Create notification'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <TextInput label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
              <TextInput label="Message" value={form.message} onChange={(value) => setForm((current) => ({ ...current, message: value }))} />
              <TextInput label="Type" value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value }))} required />
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <TextInput label="Ref ID" type="number" value={form.refId ? String(form.refId) : ''} onChange={(value) => setForm((current) => ({ ...current, refId: value ? Number(value) : undefined }))} />
                <TextInput label="Ref type" value={form.refType ?? ''} onChange={(value) => setForm((current) => ({ ...current, refType: value }))} />
              </div>
              <label className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-primary">
                <input type="checkbox" checked={form.isRead} onChange={(event) => setForm((current) => ({ ...current, isRead: event.target.checked }))} />
                Mark as read
              </label>
              <button className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-on-secondary hover:bg-opacity-90">{editingId ? 'Update Notification' : 'Create Notification'}</button>
            </form>
          </section>

          <section className="glass-panel min-w-0 rounded-xl p-6">
            <h2 className="font-display mb-5 text-title-large font-bold text-primary">All notifications</h2>
            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-body-sm text-on-surface-variant">Loading notifications...</div>
              ) : notifications.map((item) => (
                <article key={item.notificationId} className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{item.type ?? 'general'}</p>
                      <h3 className="mt-2 break-words text-title-medium font-bold text-primary">{item.title}</h3>
                      <p className="mt-1 break-words text-body-sm text-on-surface-variant">{item.message}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => handleEdit(item)} className="rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary">Edit</button>
                      <button type="button" onClick={() => handleMarkRead(item.notificationId)} className="rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDelete(item.notificationId)} className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
              {!isLoading && notifications.length === 0 && (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-body-sm text-on-surface-variant">No notifications found.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
    {text}
  </div>
);

const TextInput = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="grid min-w-0 gap-2">
    <span className="min-w-0 break-words text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="min-w-0 w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
);

export default NotificationsPage;
