export type ApplicationStatus =
  | 'Applied'
  | 'Recruiter Screen'
  | 'Technical / RPA Case'
  | 'Final Interview'
  | 'Offer'
  | 'On Hold'
  | 'Closed';

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'Applied',
  'Recruiter Screen',
  'Technical / RPA Case',
  'Final Interview',
  'Offer',
  'On Hold',
  'Closed',
] as const;

export const AUTO_SCHEDULE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'Applied',
  'Recruiter Screen',
  'Technical / RPA Case',
  'Final Interview',
]);

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  applicationDate: string; // YYYY-MM-DD
  status: ApplicationStatus;
  recruiterName: string;
  followUpDate: string; // YYYY-MM-DD or ''
  notes: string;
  lastFollowedUpAt?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type ApplicationFormValues = {
  company: string;
  role: string;
  applicationDate: string;
  status: ApplicationStatus;
  recruiterName: string;
  followUpDate: string;
  notes: string;
};

export type UrgencyBucket =
  | 'overdue'
  | 'due_today'
  | 'upcoming'
  | 'unscheduled'
  | 'closed';

export type FollowUpDateSource = 'manual' | 'auto' | 'none';

export interface ResolvedFollowUp {
  effectiveDate: string | null;
  source: FollowUpDateSource;
  bucket: UrgencyBucket;
  dayOffset: number | null; // negative = overdue days, 0 = due today, positive = days until due
}

export type DraftTemplateId =
  | 'post_application'
  | 'interview_follow_up'
  | 'overdue_nudge';

export interface FollowUpDraft {
  templateId: DraftTemplateId;
  templateLabel: string;
  subject: string;
  body: string;
}
