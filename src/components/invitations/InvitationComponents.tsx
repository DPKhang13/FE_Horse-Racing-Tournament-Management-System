import type { ReactNode } from 'react';
import { CalendarDays, Clock3, Eye, MapPin, Trophy, X } from 'lucide-react';
import type { JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import { formatInvitationDateTime, getEffectiveInvitationStatus } from './invitationUtils';
const statusClasses: Record<string, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  accepted: 'border-sky-300 bg-sky-50 text-sky-800',
  confirmed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-300 bg-rose-50 text-rose-800',
  cancelled: 'border-slate-300 bg-slate-50 text-slate-700',
  expired: 'border-slate-300 bg-slate-100 text-slate-700',
};

export const InvitationStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${
      statusClasses[status] ?? 'border-outline-variant bg-surface-container text-on-surface-variant'
    }`}
  >
    {status || 'unknown'}
  </span>
);

export const InvitationMetric = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) => (
  <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest/80 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display text-2xl font-extrabold text-on-surface">{String(value).padStart(2, '0')}</p>
  </div>
);

export const InvitationCard = ({
  assignment,
  counterpartLabel,
  counterpartName,
  counterpartAvatarUrl,
  onViewDetails,
  actions,
}: {
  assignment: JockeyAssignmentItem;
  counterpartLabel: string;
  counterpartName: string;
  counterpartAvatarUrl?: string;
  onViewDetails?: () => void;
  actions?: ReactNode;
}) => {
  const status = getEffectiveInvitationStatus(assignment);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
            Race {assignment.raceNumber ?? assignment.raceId ?? '-'}
          </p>
          <h3 className="mt-1 break-words text-body-lg font-bold text-primary">
            {assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`}
          </h3>
          <p className="mt-2 inline-flex min-w-0 items-center gap-2 break-words text-body-sm font-semibold text-on-surface-variant">
            <Trophy className="h-4 w-4 shrink-0 text-secondary" /> {assignment.tournamentName ?? 'Tournament information unavailable'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`View invitation details for ${assignment.horseName ?? assignment.raceName ?? 'invitation'}`}
              title="View invitation details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <InvitationStatusBadge status={status} />
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-container-low p-3">
          {assignment.horseAvatarUrl ? (
            <img src={assignment.horseAvatarUrl} alt={assignment.horseName ?? 'Horse'} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-xs font-bold text-primary">H</div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">Horse</p>
            <p className="truncate text-body-sm font-bold text-on-surface">{assignment.horseName ?? '-'}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-container-low p-3">
          {counterpartAvatarUrl ? (
            <img src={counterpartAvatarUrl} alt={counterpartName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-primary">{counterpartName.charAt(0) || '?'}</div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{counterpartLabel}</p>
            <p className="truncate text-body-sm font-bold text-on-surface">{counterpartName}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-body-sm text-on-surface-variant sm:grid-cols-2">
        <span className="inline-flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> Gate {assignment.gateNumber ?? '-'}</span>
        <span className="inline-flex min-w-0 items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" /> {formatInvitationDateTime(assignment.scheduledAt)}</span>
        <span className="inline-flex min-w-0 items-center gap-2 sm:col-span-2"><Clock3 className="h-4 w-4 shrink-0" /> Respond by {formatInvitationDateTime(assignment.responseDeadline)}</span>
      </div>

      {actions && <div className="mt-auto border-t border-outline-variant pt-4">{actions}</div>}
    </article>
  );
};

export const InvitationEmptyState = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/60 px-4 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">{icon}</div>
    <h3 className="mt-4 text-body-lg font-bold text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

export const InvitationModal = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 p-4 sm:p-8" role="presentation">
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="invitation-modal-title">
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant p-5 sm:p-6">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{subtitle}</p>
          <h2 id="invitation-modal-title" className="break-words text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Close dialog">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-hidden">{children}</div>
    </div>
  </div>
);

export const InvitationDetailModal = ({
  assignment,
  counterpartLabel,
  counterpartName,
  onClose,
}: {
  assignment: JockeyAssignmentItem;
  counterpartLabel: string;
  counterpartName: string;
  onClose: () => void;
}) => {
  const status = getEffectiveInvitationStatus(assignment);
  const invitationId = assignment.assignmentId ?? assignment.id;

  return (
    <InvitationModal
      title={assignment.horseName ?? assignment.raceName ?? 'Invitation details'}
      subtitle={`Invitation ${invitationId != null ? `#${invitationId}` : 'details'}`}
      onClose={onClose}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Current status</p>
            <p className="mt-1 text-body-sm font-semibold text-on-surface">Invitation lifecycle status</p>
          </div>
          <InvitationStatusBadge status={status} />
        </div>

        <DetailSection title="Race information">
          <DetailItem label="Tournament" value={assignment.tournamentName ?? 'Tournament information unavailable'} />
          <DetailItem label="Race" value={assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`} />
          <DetailItem label="Race number" value={assignment.raceNumber ?? assignment.raceId ?? '-'} />
          <DetailItem label="Scheduled at" value={formatInvitationDateTime(assignment.scheduledAt)} />
          <DetailItem label="Gate" value={assignment.gateNumber ?? '-'} />
        </DetailSection>

        <DetailSection title="Participants">
          <DetailItem label="Horse" value={assignment.horseName ?? `Horse ${assignment.horseId ?? '-'}`} />
          <DetailItem label={counterpartLabel} value={counterpartName} />
          {assignment.ownerFullName && <DetailItem label="Owner" value={assignment.ownerFullName} />}
          {assignment.ownerStableName && <DetailItem label="Stable" value={assignment.ownerStableName} />}
          {assignment.jockeyFullName && <DetailItem label="Jockey" value={assignment.jockeyFullName} />}
        </DetailSection>

        <DetailSection title="Invitation timeline">
          <DetailItem label="Invited at" value={formatInvitationDateTime(assignment.invitedAt)} />
          <DetailItem label="Response deadline" value={formatInvitationDateTime(assignment.responseDeadline)} />
          <DetailItem label="Responded at" value={formatInvitationDateTime(assignment.respondedAt)} />
          <DetailItem label="Cancelled at" value={formatInvitationDateTime(assignment.cancelledAt)} />
          <DetailItem label="Expired at" value={formatInvitationDateTime(assignment.expiredAt)} />
        </DetailSection>

      </div>
    </InvitationModal>
  );
};

const DetailSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h3 className="mb-3 text-label-md font-extrabold uppercase tracking-[0.14em] text-primary">{title}</h3>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </section>
);

const DetailItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="min-w-0 rounded-lg border border-outline-variant bg-white p-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{label}</p>
    <p className="mt-1 break-words text-body-sm font-semibold text-on-surface">{value}</p>
  </div>
);
