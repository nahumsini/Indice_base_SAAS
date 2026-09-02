import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('task completion trusts authoritative items and refreshes only as a compatibility fallback', async () => {
  const source = await readFile(
    new URL(
      '../src/app/BasicModules/ProcessesTasks/Kiosk/hooks/useEmployeeTaskMultiKioskWorkspace.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /const receivedUpdatedItems = Array\.isArray\(result\.items\)/);
  assert.match(source, /if \(receivedUpdatedItems\) setTasks\(result\.items\)/);
  assert.match(
    source,
    /if \(!receivedUpdatedItems\) \{[\s\S]*?await onRefresh\(\)[\s\S]*?onAuthorizationFailure\(refreshError\)/,
  );
  assert.doesNotMatch(
    source,
    /setSelectedTaskId\(null\);\s*try \{\s*await onRefresh\(\)/,
  );
  assert.match(source, /const completeRequestInFlightRef = useRef\(false\)/);
  assert.match(source, /busy \|\| completeRequestInFlightRef\.current/);
  assert.match(source, /finally \{\s*completeRequestInFlightRef\.current = false/);
});

test('native task quick capture is capability-bound, guarded and updates from returned items', async () => {
  const [hook, workspace, dialog] = await Promise.all([
    readFile(
      new URL(
        '../src/app/BasicModules/ProcessesTasks/Kiosk/hooks/useEmployeeTaskMultiKioskWorkspace.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../src/app/BasicModules/ProcessesTasks/Kiosk/EmployeeTaskMultiKioskWorkspace.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../src/app/BasicModules/ProcessesTasks/Kiosk/components/EmployeeTaskMultiKioskCreateDialog.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  assert.match(hook, /create: 'process-tasks\.task\.create@1'/);
  assert.match(hook, /const createRequestInFlightRef = useRef\(false\)/);
  assert.match(hook, /if \(!canCreate \|\| busy \|\| createRequestInFlightRef\.current\) return/);
  assert.match(hook, /createRequestInFlightRef\.current = true/);
  assert.match(hook, /finally \{\s*createRequestInFlightRef\.current = false/);
  assert.match(hook, /due_date: createDraft\.dueDate \|\| null/);
  assert.match(
    hook,
    /const receivedUpdatedItems = Array\.isArray\(result\.items\)[\s\S]*?if \(receivedUpdatedItems\) setTasks\(result\.items\)[\s\S]*?if \(!receivedUpdatedItems\)/,
  );
  assert.match(workspace, /granted\.includes\(employeeTaskCapabilities\.create\)/);
  assert.match(workspace, /<EmployeeTaskMultiKioskCreateDialog/);
  assert.match(dialog, /<KioskModalFrame/);
  assert.match(dialog, /aria-busy=\{busy \|\| undefined\}/);
  assert.match(dialog, /min-\[360px\]:grid-cols-2/);
  assert.match(dialog, /maxLength=\{220\}/);
  assert.match(dialog, /maxLength=\{2000\}/);
  assert.doesNotMatch(dialog, /responsibleLabel|evidence|attachment/i);
});
