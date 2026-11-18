import {type JobApplication} from '../types/application.ts';
import {createFictionalDemoRecords, getTodayLocalDate} from './followUpEngine.ts';

export const STORAGE_KEY = 'rpa_recruiter_tracker_v1';

interface StoredPayload {
  version: 1;
  applications: JobApplication[];
}

function isJobApplication(value: unknown): value is JobApplication {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.company === 'string' &&
    typeof item.role === 'string' &&
    typeof item.applicationDate === 'string' &&
    typeof item.status === 'string' &&
    typeof item.recruiterName === 'string' &&
    typeof item.followUpDate === 'string' &&
    typeof item.notes === 'string'
  );
}

export function loadApplicationsFromBrowser(): {
  applications: JobApplication[];
  initializedFromDemo: boolean;
} {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = createFictionalDemoRecords(getTodayLocalDate());
      saveApplicationsToBrowser(demo);
      return {applications: demo, initializedFromDemo: true};
    }

    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'applications' in parsed &&
      Array.isArray((parsed as StoredPayload).applications)
    ) {
      const valid = (parsed as StoredPayload).applications.filter(isJobApplication);
      return {applications: valid, initializedFromDemo: false};
    }
  } catch {
    // Fallback to clean demo seed if localStorage is unreadable or corrupted
  }

  const demo = createFictionalDemoRecords(getTodayLocalDate());
  saveApplicationsToBrowser(demo);
  return {applications: demo, initializedFromDemo: true};
}

export function saveApplicationsToBrowser(applications: JobApplication[]): boolean {
  try {
    const payload: StoredPayload = {
      version: 1,
      applications,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function resetToFictionalDemoData(): JobApplication[] {
  const demo = createFictionalDemoRecords(getTodayLocalDate());
  saveApplicationsToBrowser(demo);
  return demo;
}

export function clearAllBrowserRecords(): JobApplication[] {
  saveApplicationsToBrowser([]);
  return [];
}
