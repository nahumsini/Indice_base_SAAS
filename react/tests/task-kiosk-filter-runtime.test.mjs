import assert from 'node:assert/strict';
import test from 'node:test';
import { filterKioskTasks } from '../src/app/BasicModules/ProcessesTasks/Kiosk/taskKioskFilterEngine.ts';

const today = '2026-09-06';
const task = (id, due, extra = {}) => ({ id, status: 'pending', start_date: due, due_date: due,
  created_at: '2026-09-01T10:00:00', completed_at: null, is_overdue: false,
  assigned_user_company_id: 21, is_assigned_to_current_user: true,
  is_created_by_current_user: false, unit_id: 3, business_id: 4, ...extra });
const filters = { focus: 'mine', period: 'all', status: 'pending_overdue', unit: 'all', business: 'all' };
const ids = (rows, changes = {}) => filterKioskTasks(rows, { ...filters, ...changes }, today).map(row => row.id);

test('all periods include assigned future tasks without exposing another assignee', () => {
  assert.deepEqual(ids([task(1, '2026-09-07'), task(2, '2026-10-12'),
    task(3, today, { is_assigned_to_current_user: false })]), [1, 2]);
});
test('tomorrow uses the same reference date for period and status', () => {
  assert.deepEqual(ids([task(1, '2026-09-07'), task(2, '2026-09-08')], { period: 'tomorrow' }), [1]);
});
test('all resolved periods retain past completions while today does not', () => {
  const rows = [task(1, '2026-09-04', { status: 'completed', completed_at: '2026-09-04T12:00:00' })];
  assert.deepEqual(ids(rows, { status: 'completed' }), [1]);
  assert.deepEqual(ids(rows, { status: 'completed', period: 'today' }), []);
});
test('yesterday retains its completed work and excludes tasks created later', () => {
  const rows = [task(1, '2026-09-05', { status: 'completed', completed_at: '2026-09-05T12:00:00' }),
    task(2, '2026-09-05', { created_at: '2026-09-06T12:00:00' })];
  assert.deepEqual(ids(rows, { status: 'completed', period: 'yesterday' }), [1]);
});
test('organization, today and cancellation filters retain their boundaries', () => {
  const rows = [task(1, today), task(2, '2026-09-07'), task(3, today, { status: 'cancelled' }),
    task(4, today, { unit_id: 8 })];
  assert.deepEqual(ids(rows, { period: 'today', unit: '3' }), [1]);
  assert.deepEqual(ids(rows, { status: 'all', unit: '3' }), [1, 2]);
});

test('agenda placement makes scheduled work visible even when its due date is later', () => {
  const rows = [
    task(1, '2026-09-20', { agenda_date: today, agenda_start_time: '09:30' }),
    task(2, '2026-09-20', { agenda_date: '2026-09-07', agenda_start_time: '10:00' }),
  ];
  assert.deepEqual(ids(rows, { period: 'today' }), [1]);
});
