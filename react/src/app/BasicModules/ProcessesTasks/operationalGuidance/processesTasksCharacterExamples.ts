import type { LearningCharacterId } from '../../../learningMode';
import type { ProcessesTasksGuidanceTabId } from './types';

type ProcessesTasksCharacterExamples = Record<
  LearningCharacterId,
  Record<ProcessesTasksGuidanceTabId, string>
>;

export const processesTasksCharacterExamples: ProcessesTasksCharacterExamples = {
  emily: {
    calendar: 'Emily convierte la preparación diaria de cada cafetería en tareas con responsable, horario y evidencia. Así puede revisar el trabajo de varias sucursales sin estar físicamente en cada apertura.',
    projects: 'Emily agrupa la apertura de una nueva cafetería como proyecto y conecta adecuaciones, contratación, capacitación y abastecimiento. Cada gerente entiende qué resultado prepara y qué retraso pone en riesgo la fecha de apertura.',
    processes: 'Emily transforma la limpieza, la calibración de equipos y el control de calidad en rutinas recurrentes. La consistencia deja de depender de que ella recuerde pedir cada actividad.',
    kpis: 'Emily compara cumplimiento, retrasos y evidencia entre cafeterías. Usa la tendencia para detectar qué sucursal necesita apoyo antes de que la experiencia del cliente pierda consistencia.',
  },
  juanito: {
    calendar: 'Juanito sabe leer ventas e inventario, pero usa la Agenda para hacer visible quién debe corregir una diferencia y cuándo. Así los pendientes que no caben en el reporte numérico dejan de depender de su memoria.',
    projects: 'Juanito organiza la apertura de una tienda como proyecto y relaciona compras, contratación, acomodo y sistemas. Puede medir el avance sin perseguir personalmente a cada responsable.',
    processes: 'Juanito programa conteos, cambios de precio y revisiones de merma como procesos recurrentes. Sus números se vuelven más confiables porque las tareas que los producen se ejecutan con el mismo ritmo.',
    kpis: 'Juanito conecta los indicadores de ejecución con sus resultados comerciales. Cuando una tienda acumula tareas vencidas, investiga el proceso y al responsable antes de asumir que el problema es solamente de ventas.',
  },
  camila: {
    calendar: 'Camila registra pendientes de mostrador y almacén con responsables claros, incluso cuando participan familiares. La cercanía se conserva, pero ya no necesita recordar por todos ni resolver cada olvido.',
    projects: 'Camila reúne el crecimiento de su refaccionaria en proyectos con tareas y fechas visibles. Los acuerdos familiares se convierten en compromisos operativos sin perder el trato cercano del negocio.',
    processes: 'Camila convierte recepción de piezas, resurtido y revisión de pedidos en rutinas recurrentes. El negocio deja de esperar a que ella detecte personalmente cada necesidad.',
    kpis: 'Camila revisa cumplimiento y atrasos para saber dónde hace falta ordenar responsabilidades. Usa los indicadores para acompañar al equipo, no para convertir cada problema en una discusión personal.',
  },
};
