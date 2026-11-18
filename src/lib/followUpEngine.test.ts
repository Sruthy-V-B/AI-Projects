import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addBusinessDays,
  buildFollowUpDraft,
  createFictionalDemoRecords,
  resolveEffectiveFollowUp,
  sortByFollowUpPriority,
  suggestTemplateId,
  validateApplicationForm,
} from './followUpEngine.ts';
import {type JobApplication} from '../types/application.ts';

function makeApp(overrides: Partial<JobApplication>): JobApplication {
  return {
    id: overrides.id ?? 'id-1',
    company: overrides.company ?? 'Acme Automation',
    role: overrides.role ?? 'RPA Developer',
    applicationDate: overrides.applicationDate ?? '2026-11-10',
    status: overrides.status ?? 'Applied',
    recruiterName: overrides.recruiterName ?? '',
    followUpDate: overrides.followUpDate ?? '',
    notes: overrides.notes ?? '',
    createdAt: '2026-11-10T09:00:00.000Z',
    updatedAt: '2026-11-10T09:00:00.000Z',
    ...overrides,
  };
}

test('TC-01: sortByFollowUpPriority puts Overdue (oldest first), Due Today, Upcoming, Unscheduled, Closed', () => {
  const today = '2026-11-17';
  const records: JobApplication[] = [
    makeApp({id: 'closed', company: 'Zeta Corp', status: 'Closed', followUpDate: '2026-11-01'}),
    makeApp({id: 'unsched', company: 'Omega Ops', status: 'On Hold', followUpDate: ''}),
    makeApp({id: 'upcoming', company: 'Delta AI', status: 'Applied', followUpDate: '2026-11-20'}),
    makeApp({id: 'due', company: 'Gamma Bots', status: 'Applied', followUpDate: '2026-11-17'}),
    makeApp({id: 'overdue-1', company: 'Beta RPA', status: 'Applied', followUpDate: '2026-11-16'}),
    makeApp({id: 'overdue-4', company: 'Alpha Systems', status: 'Applied', followUpDate: '2026-11-13'}),
  ];

  const sorted = sortByFollowUpPriority(records, today);
  assert.deepEqual(
    sorted.map((item) => item.application.id),
    ['overdue-4', 'overdue-1', 'due', 'upcoming', 'unsched', 'closed']
  );
});

test('TC-02: Auto follow-up adds 5 business days skipping weekends', () => {
  // 2026-11-10 is Tuesday -> +5 business days = 2026-11-17 (Tuesday)
  assert.equal(addBusinessDays('2026-11-10', 5), '2026-11-17');

  const record = makeApp({
    applicationDate: '2026-11-10',
    status: 'Applied',
    followUpDate: '',
  });
  const resolved = resolveEffectiveFollowUp(record, '2026-11-17');
  assert.equal(resolved.effectiveDate, '2026-11-17');
  assert.equal(resolved.source, 'auto');
  assert.equal(resolved.bucket, 'due_today');
});

test('TC-03: Manual follow-up date overrides auto-scheduled date', () => {
  const record = makeApp({
    applicationDate: '2026-11-10',
    status: 'Applied',
    followUpDate: '2026-11-13',
  });
  const resolved = resolveEffectiveFollowUp(record, '2026-11-17');
  assert.equal(resolved.effectiveDate, '2026-11-13');
  assert.equal(resolved.source, 'manual');
  assert.equal(resolved.bucket, 'overdue');
  assert.equal(resolved.dayOffset, -4);
});

test('TC-04: Closed status is excluded from overdue even when followUpDate is in the past', () => {
  const record = makeApp({
    status: 'Closed',
    followUpDate: '2026-11-01',
  });
  const resolved = resolveEffectiveFollowUp(record, '2026-11-17');
  assert.equal(resolved.bucket, 'closed');
});

test('TC-05: Form validation enforces required company, role, and valid dates', () => {
  const invalid = validateApplicationForm({
    company: '   ',
    role: '',
    applicationDate: 'not-a-date',
    status: 'Applied',
    recruiterName: '',
    followUpDate: '2026-02-31',
    notes: '',
  });

  assert.ok(invalid.company);
  assert.ok(invalid.role);
  assert.ok(invalid.applicationDate);
  assert.ok(invalid.followUpDate);

  const valid = validateApplicationForm({
    company: 'Northstar Health Systems',
    role: 'Intelligent Automation Lead',
    applicationDate: '2026-11-17',
    status: 'Applied',
    recruiterName: '',
    followUpDate: '',
    notes: '',
  });
  assert.deepEqual(valid, {});
});

test('TC-07: Demo seed generates 7 fictional RPA records anchored to today', () => {
  const today = '2026-11-17';
  const demo = createFictionalDemoRecords(today);
  assert.equal(demo.length, 7);

  const sorted = sortByFollowUpPriority(demo, today);
  const buckets = sorted.map((item) => item.followUp.bucket);
  assert.ok(buckets.includes('overdue'));
  assert.ok(buckets.includes('due_today'));
  assert.ok(buckets.includes('upcoming'));
  assert.ok(buckets.includes('closed'));
});

test('TC-08: Follow-up draft templates handle named recruiter vs unassigned fallback', () => {
  const named = makeApp({
    company: 'Vanguard Logistics Corp',
    role: 'Senior UiPath Developer',
    recruiterName: 'Elena Rostova',
    status: 'Applied',
    notes: 'REFramework and SAP GUI automation.',
  });
  const draftNamed = buildFollowUpDraft(named, 'post_application', {includeNoteContext: true});
  assert.match(draftNamed.body, /^Hi Elena,/);
  assert.match(draftNamed.body, /REFramework and SAP GUI automation/);

  const unnamed = makeApp({
    company: 'Meridian FinOps',
    role: 'Automation Anywhere Architect',
    recruiterName: '',
    status: 'Recruiter Screen',
  });
  const suggested = suggestTemplateId(unnamed, '2026-11-17');
  assert.equal(suggested, 'interview_follow_up');
  const draftUnnamed = buildFollowUpDraft(unnamed, suggested);
  assert.match(draftUnnamed.body, /^Hi Meridian FinOps Recruiting Team,/);
});
