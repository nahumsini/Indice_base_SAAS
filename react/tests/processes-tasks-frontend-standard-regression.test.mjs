import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/ProcessesTasks');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Procesos y Tareas respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Procesos y Tareas conserva el shell, los modales y el Kiosk Engine compartidos', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'ProcessesTasks.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(moduleRoot, 'Kiosk/PublicTaskKioskPage.tsx'), 'utf8');
  const managerSource = readFileSync(resolve(moduleRoot, 'Kiosk/TaskKioskManagementModal.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(kioskSource, /<KioskIdentityGate/);
  assert.match(managerSource, /<KioskModalFrame/);
});

test('tareas y agenda mantienen nombres relacionados, actualización y lista móvil compacta', () => {
  const taskApiSource = readFileSync(resolve(moduleRoot, 'Tasks/tasksApi.ts'), 'utf8');
  const tasksSource = readFileSync(resolve(moduleRoot, 'Tasks/Tasks.tsx'), 'utf8');
  const agendaSource = readFileSync(resolve(moduleRoot, 'Agenda/Agenda.tsx'), 'utf8');
  const mobileSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaTableView.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(moduleRoot, 'Kiosk/PublicTaskKioskPage.tsx'), 'utf8');

  assert.match(taskApiSource, /projectName: record\.projectName/);
  assert.match(taskApiSource, /processTitle: record\.processTitle/);
  assert.match(tasksSource, /task\.projectName \?\? task\.projectFolio/);
  assert.match(tasksSource, /task\.processTitle \?\? task\.processFolio/);
  assert.match(tasksSource, /window\.setInterval\(refreshTasks, 30_000\)/);
  assert.match(agendaSource, /window\.setInterval\(refreshAgenda, 30_000\)/);
  assert.match(kioskSource, /window\.setInterval\(refreshWhenVisible, 20_000\)/);
  assert.match(mobileSource, /mobileDetailTask/);
  assert.match(mobileSource, /agendaCopy\.actions\.viewDetails/);
});
