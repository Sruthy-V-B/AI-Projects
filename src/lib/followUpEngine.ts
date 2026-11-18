import {
  AUTO_SCHEDULE_STATUSES,
  type ApplicationFormValues,
  type ApplicationStatus,
  type DraftTemplateId,
  type FollowUpDraft,
  type JobApplication,
  type ResolvedFollowUp,
  type UrgencyBucket,
} from '../types/application.ts';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const BUCKET_PRIORITY: Record<UrgencyBucket, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  unscheduled: 3,
  closed: 4,
};

export function formatLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate(now: Date = new Date()): string {
  return formatLocalISODate(now);
}

export function parseISODateLocal(isoDate: string): Date | null {
  if (!ISO_DATE_RE.test(isoDate)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function isValidISODate(isoDate: string): boolean {
  return parseISODateLocal(isoDate) !== null;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const date = parseISODateLocal(isoDate);
  if (!date) return isoDate;
  date.setDate(date.getDate() + days);
  return formatLocalISODate(date);
}

export function addBusinessDays(isoDate: string, businessDays: number): string {
  const date = parseISODateLocal(isoDate);
  if (!date) return isoDate;
  if (businessDays === 0) return formatLocalISODate(date);

  const step = businessDays > 0 ? 1 : -1;
  let remaining = Math.abs(businessDays);

  while (remaining > 0) {
    date.setDate(date.getDate() + step);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining -= 1;
    }
  }
  return formatLocalISODate(date);
}

export function diffCalendarDays(fromISO: string, toISO: string): number | null {
  const from = parseISODateLocal(fromISO);
  const to = parseISODateLocal(toISO);
  if (!from || !to) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

export function formatDisplayDate(isoDate: string): string {
  const parsed = parseISODateLocal(isoDate);
  if (!parsed) return isoDate;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthDay(isoDate: string): string {
  const parsed = parseISODateLocal(isoDate);
  if (!parsed) return isoDate;
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

export function resolveEffectiveFollowUp(
  record: Pick<JobApplication, 'applicationDate' | 'followUpDate' | 'status'>,
  today: string = getTodayLocalDate()
): ResolvedFollowUp {
  const manualDate = record.followUpDate.trim();
  let effectiveDate: string | null = null;
  let source: ResolvedFollowUp['source'] = 'none';

  if (manualDate && isValidISODate(manualDate)) {
    effectiveDate = manualDate;
    source = 'manual';
  } else if (AUTO_SCHEDULE_STATUSES.has(record.status) && isValidISODate(record.applicationDate)) {
    effectiveDate = addBusinessDays(record.applicationDate, 5);
    source = 'auto';
  }

  if (record.status === 'Closed') {
    return {
      effectiveDate,
      source,
      bucket: 'closed',
      dayOffset: effectiveDate ? diffCalendarDays(today, effectiveDate) : null,
    };
  }

  if (!effectiveDate) {
    return {
      effectiveDate: null,
      source: 'none',
      bucket: 'unscheduled',
      dayOffset: null,
    };
  }

  const dayOffset = diffCalendarDays(today, effectiveDate);
  if (dayOffset === null) {
    return {
      effectiveDate: null,
      source: 'none',
      bucket: 'unscheduled',
      dayOffset: null,
    };
  }

  let bucket: UrgencyBucket = 'upcoming';
  if (dayOffset < 0) {
    bucket = 'overdue';
  } else if (dayOffset === 0) {
    bucket = 'due_today';
  }

  return {
    effectiveDate,
    source,
    bucket,
    dayOffset,
  };
}

export function formatRelativeUrgency(resolved: ResolvedFollowUp): string {
  if (resolved.bucket === 'closed') {
    return 'Closed';
  }
  if (resolved.bucket === 'unscheduled' || resolved.dayOffset === null) {
    return 'No date set';
  }
  if (resolved.dayOffset < 0) {
    const days = Math.abs(resolved.dayOffset);
    return days === 1 ? '1 day overdue' : `${days} days overdue`;
  }
  if (resolved.dayOffset === 0) {
    return 'Due today';
  }
  if (resolved.dayOffset === 1) {
    return 'Due tomorrow';
  }
  return `In ${resolved.dayOffset} days`;
}

export interface EnrichedApplication {
  application: JobApplication;
  followUp: ResolvedFollowUp;
}

export function sortByFollowUpPriority(
  records: readonly JobApplication[],
  today: string = getTodayLocalDate()
): EnrichedApplication[] {
  return records
    .map((application) => ({
      application,
      followUp: resolveEffectiveFollowUp(application, today),
    }))
    .sort((a, b) => {
      const priorityDiff =
        BUCKET_PRIORITY[a.followUp.bucket] - BUCKET_PRIORITY[b.followUp.bucket];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      if (a.followUp.bucket === 'overdue') {
        const dateA = a.followUp.effectiveDate ?? '';
        const dateB = b.followUp.effectiveDate ?? '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
      }

      if (a.followUp.bucket === 'due_today') {
        if (a.application.applicationDate !== b.application.applicationDate) {
          return a.application.applicationDate.localeCompare(b.application.applicationDate);
        }
      }

      if (a.followUp.bucket === 'upcoming') {
        const dateA = a.followUp.effectiveDate ?? '';
        const dateB = b.followUp.effectiveDate ?? '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
      }

      return a.application.company.localeCompare(b.application.company, undefined, {
        sensitivity: 'base',
      });
    });
}

export function suggestTemplateId(
  record: Pick<JobApplication, 'status' | 'followUpDate' | 'applicationDate'>,
  today: string = getTodayLocalDate()
): DraftTemplateId {
  const resolved = resolveEffectiveFollowUp(record, today);
  if (
    resolved.bucket === 'overdue' &&
    resolved.dayOffset !== null &&
    Math.abs(resolved.dayOffset) >= 3
  ) {
    return 'overdue_nudge';
  }
  if (
    record.status === 'Recruiter Screen' ||
    record.status === 'Technical / RPA Case' ||
    record.status === 'Final Interview'
  ) {
    return 'interview_follow_up';
  }
  return 'post_application';
}

export const DRAFT_TEMPLATE_OPTIONS: ReadonlyArray<{
  id: DraftTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: 'post_application',
    label: 'Initial Post-Application Check-In',
    description: 'Best 5 business days after submitting an application.',
  },
  {
    id: 'interview_follow_up',
    label: 'Post-Screen / Interview Follow-Up',
    description: 'Best after a recruiter call, technical case, or panel.',
  },
  {
    id: 'overdue_nudge',
    label: 'Gentle Second Follow-Up',
    description: 'Short, low-friction bump when a thread has gone quiet.',
  },
];

function extractFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

function summarizeNoteSnippet(notes: string): string {
  const clean = notes.replace(/\[\d{4}-\d{2}-\d{2}\]\s*Sent follow-up\.?/gi, '').trim();
  if (!clean) return '';
  const firstSentence = clean.split(/[.\n]/)[0]?.trim() ?? '';
  if (!firstSentence) return '';
  return firstSentence.length > 120 ? `${firstSentence.slice(0, 117)}...` : firstSentence;
}

export function buildFollowUpDraft(
  record: JobApplication,
  templateId: DraftTemplateId,
  options: {includeNoteContext?: boolean} = {}
): FollowUpDraft {
  const firstName = extractFirstName(record.recruiterName);
  const greeting = firstName
    ? `Hi ${firstName},`
    : `Hi ${record.company} Recruiting Team,`;
  const appliedFormatted = formatMonthDay(record.applicationDate);
  const noteSnippet = options.includeNoteContext ? summarizeNoteSnippet(record.notes) : '';
  const noteLine = noteSnippet ? ` Quick context from my application: ${noteSnippet}.` : '';

  if (templateId === 'interview_follow_up') {
    const stagePhrase =
      record.status === 'Technical / RPA Case'
        ? 'reviewing my technical automation case study'
        : record.status === 'Final Interview'
          ? 'coordinating the final interview panel'
          : 'our recent conversation';

    return {
      templateId,
      templateLabel: 'Post-Screen / Interview Follow-Up',
      subject: `Following up: ${record.role} at ${record.company}`,
      body: [
        greeting,
        '',
        `Thank you again for ${stagePhrase} for the ${record.role} position at ${record.company}. I remain very enthusiastic about helping your team scale resilient RPA and intelligent automation workflows.${noteLine}`,
        '',
        'Could you share any update on your hiring timeline or next steps? Happy to provide any additional examples or references if helpful.',
        '',
        'Best regards,',
        '[Your Name]',
      ].join('\n'),
    };
  }

  if (templateId === 'overdue_nudge') {
    return {
      templateId,
      templateLabel: 'Gentle Second Follow-Up',
      subject: `Re: ${record.role} application at ${record.company}`,
      body: [
        greeting,
        '',
        `I wanted to briefly bump my earlier note regarding the ${record.role} opening at ${record.company} (applied ${appliedFormatted}). With my background delivering production RPA and intelligent automation pipelines, I would welcome a quick conversation if the role is still active.${noteLine}`,
        '',
        'No rush—just let me know if there is a better time or point of contact to check in with.',
        '',
        'Best regards,',
        '[Your Name]',
      ].join('\n'),
    };
  }

  return {
    templateId: 'post_application',
    templateLabel: 'Initial Post-Application Check-In',
    subject: `Application follow-up: ${record.role} — ${record.company}`,
    body: [
      greeting,
      '',
      `I applied for the ${record.role} role at ${record.company} on ${appliedFormatted} and wanted to follow up briefly. My experience building end-to-end RPA and intelligent automation solutions aligns closely with what your team is hiring for.${noteLine}`,
      '',
      'Are you the right person to connect with regarding interview timelines, or is there another recruiter handling this search?',
      '',
      'Best regards,',
      '[Your Name]',
    ].join('\n'),
  };
}

export interface ValidationErrors {
  company?: string;
  role?: string;
  applicationDate?: string;
  status?: string;
  followUpDate?: string;
}

export function validateApplicationForm(values: ApplicationFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!values.company.trim()) {
    errors.company = 'Company name is required.';
  } else if (values.company.trim().length > 100) {
    errors.company = 'Keep company name under 100 characters.';
  }

  if (!values.role.trim()) {
    errors.role = 'Role title is required.';
  } else if (values.role.trim().length > 120) {
    errors.role = 'Keep role title under 120 characters.';
  }

  if (!values.applicationDate.trim() || !isValidISODate(values.applicationDate.trim())) {
    errors.applicationDate = 'Enter a valid application date (YYYY-MM-DD).';
  }

  const validStatuses: ApplicationStatus[] = [
    'Applied',
    'Recruiter Screen',
    'Technical / RPA Case',
    'Final Interview',
    'Offer',
    'On Hold',
    'Closed',
  ];
  if (!validStatuses.includes(values.status)) {
    errors.status = 'Select a valid application status.';
  }

  if (values.followUpDate.trim() && !isValidISODate(values.followUpDate.trim())) {
    errors.followUpDate = 'Follow-up date must be a valid date (YYYY-MM-DD).';
  }

  return errors;
}

export function createFictionalDemoRecords(today: string = getTodayLocalDate()): JobApplication[] {
  const timestamp = `${today}T09:00:00.000Z`;
  return [
    {
      id: 'demo-vanguard-uipath',
      company: 'Vanguard Logistics Corp',
      role: 'Senior UiPath Developer',
      applicationDate: addBusinessDays(today, -10),
      status: 'Applied',
      recruiterName: 'Elena Rostova',
      followUpDate: addCalendarDays(today, -3),
      notes: 'Submitted via career portal; highlighted REFramework and SAP GUI invoice automation.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-northstar-idp',
      company: 'Northstar Health Systems',
      role: 'Intelligent Automation Lead',
      applicationDate: addBusinessDays(today, -7),
      status: 'Recruiter Screen',
      recruiterName: 'Marcus Vance',
      followUpDate: addCalendarDays(today, -1),
      notes: '30-min intro call completed; discussed HIPAA claims IDP pipeline and queue SLAs.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-meridian-aa',
      company: 'Meridian FinOps',
      role: 'Automation Anywhere Architect',
      applicationDate: addBusinessDays(today, -5),
      status: 'Applied',
      recruiterName: '',
      followUpDate: '',
      notes: 'A360 cloud migration and Document Automation role; check LinkedIn for recruiter name.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-helios-agentic',
      company: 'Helios Manufacturing',
      role: 'RPA & Agentic Workflow Engineer',
      applicationDate: addCalendarDays(today, -6),
      status: 'Technical / RPA Case',
      recruiterName: 'Priya Nair',
      followUpDate: today,
      notes: 'Sent Blue Prism + Python FastAPI exception-handling case study for review.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-crestline-power',
      company: 'Crestline Insurance Group',
      role: 'Power Automate CoE Specialist',
      applicationDate: addBusinessDays(today, -2),
      status: 'Applied',
      recruiterName: 'David Chen',
      followUpDate: '',
      notes: 'Referred by former colleague; enterprise Power Platform governance & ALM.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-borealis-idp',
      company: 'Borealis Retail Tech',
      role: 'Intelligent Document Processing Engineer',
      applicationDate: addCalendarDays(today, -4),
      status: 'Final Interview',
      recruiterName: 'Hannah Lindqvist',
      followUpDate: addCalendarDays(today, 2),
      notes: 'Panel with VP of Operations scheduled; prepare OCR accuracy & ROI metrics.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-kestrel-closed',
      company: 'Kestrel Energy Partners',
      role: 'RPA Solutions Consultant',
      applicationDate: addCalendarDays(today, -24),
      status: 'Closed',
      recruiterName: 'Jordan Alvarez',
      followUpDate: '',
      notes: 'Role paused for Q1 budget review; reconnect next quarter.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}
