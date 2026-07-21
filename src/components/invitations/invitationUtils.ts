import type { JockeyAssignmentItem } from '../../services/jockeyAssignmentService';

export const normalizeInvitationStatus = (value?: string) => value?.trim().toLowerCase() ?? '';

export const isActiveInvitationStatus = (value?: string) =>
  ['pending', 'accepted', 'confirmed'].includes(normalizeInvitationStatus(value));

export const isPendingInvitationExpired = (assignment: JockeyAssignmentItem) => {
  if (normalizeInvitationStatus(assignment.status) !== 'pending' || !assignment.responseDeadline) {
    return false;
  }

  const deadlineTime = new Date(assignment.responseDeadline).getTime();
  return Number.isFinite(deadlineTime) && deadlineTime <= Date.now();
};

export const getEffectiveInvitationStatus = (assignment: JockeyAssignmentItem) =>
  isPendingInvitationExpired(assignment) ? 'expired' : normalizeInvitationStatus(assignment.status);

export const getAssignmentId = (assignment: JockeyAssignmentItem) =>
  assignment.assignmentId ?? assignment.id;

export const formatInvitationDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
