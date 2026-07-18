import type { LearningCharacterId } from '../../../learningMode/characters';
import type { HumanResourcesGuidanceTabId } from './types';

type HumanResourcesCharacterExamples = Record<
  LearningCharacterId,
  Record<HumanResourcesGuidanceTabId, string>
>;

export const humanResourcesCharacterExamples: HumanResourcesCharacterExamples = {
  emily: {
    collaborators: 'Emily registra a cada barista, gerente y responsable de turno con su puesto, sucursal y documentos. Así puede abrir nuevas cafeterías sin perder claridad sobre quién hace qué.',
    attendance: 'Emily revisa la asistencia por sucursal para detectar ausencias antes de la apertura y asegurar que cada cafetería tenga la cobertura necesaria.',
    control: 'Emily configura horarios y accesos por sucursal para que cada equipo registre su jornada donde realmente trabaja.',
    payroll: 'Emily mantiene salarios, bonos y ajustes vinculados a cada colaborador para revisar el costo laboral de cada cafetería antes de pagar.',
    announcements: 'Emily envía cambios de menú, estándares de servicio y avisos únicamente a las sucursales o puestos que deben aplicarlos.',
    assets: 'Emily asigna tabletas, terminales y equipo de trabajo a responsables concretos para saber dónde están y en qué condición se encuentran.',
    records: 'Emily documenta acuerdos e incidentes con el contexto de la sucursal para dar seguimiento justo y consistente.',
    permissions: 'Emily evalúa permisos considerando la cobertura de cada turno, evitando dejar una cafetería sin personal suficiente.',
    incentives: 'Emily reconoce a los equipos que sostienen los estándares de servicio, puntualidad y experiencia del cliente.',
    kpis: 'Emily compara rotación, asistencia y costo laboral entre sucursales para identificar dónde necesita fortalecer liderazgo o capacitación.',
  },
  juanito: {
    collaborators: 'Juanito registra cajeros, encargados, compradores y responsables de inventario por tienda. Así deja de depender de su memoria para saber funciones y responsabilidades.',
    attendance: 'Juanito consulta la asistencia por tienda para anticipar faltantes en cajas, piso de venta y recepción de mercancía.',
    control: 'Juanito organiza turnos y puntos de registro para que cada supermercado tenga cobertura durante toda la jornada.',
    payroll: 'Juanito concentra salarios, bonos y ajustes para entender cuánto cuesta operar cada tienda y preparar pagos con menos correcciones.',
    announcements: 'Juanito comunica promociones, cambios de precio y reglas operativas al personal de las tiendas que deben ejecutarlos.',
    assets: 'Juanito asigna terminales, escáneres y dispositivos a responsables para reducir pérdidas y detener compras duplicadas.',
    records: 'Juanito documenta acuerdos e incidentes de cada tienda para que los responsables den seguimiento con el mismo criterio.',
    permissions: 'Juanito revisa permisos contra la cobertura de cajas y piso de venta antes de aprobarlos.',
    incentives: 'Juanito vincula incentivos con disponibilidad de producto, servicio y cumplimiento de procesos, no solo con ventas.',
    kpis: 'Juanito compara asistencia, rotación y costo laboral entre tiendas para decidir dónde contratar, capacitar o ajustar turnos.',
  },
  camila: {
    collaborators: 'Camila registra a familiares, vendedores, almacenistas y responsables de mostrador con funciones claras. Así transforma acuerdos informales en responsabilidades visibles.',
    attendance: 'Camila revisa quién está disponible en mostrador y almacén para organizar la atención sin depender de llamadas o mensajes.',
    control: 'Camila define horarios y accesos para separar responsabilidades familiares de los turnos reales de trabajo.',
    payroll: 'Camila registra salarios, bonos y ajustes para diferenciar pagos laborales de retiros o acuerdos familiares informales.',
    announcements: 'Camila comunica cambios de proveedores, precios y procedimientos al personal que atiende mostrador o almacén.',
    assets: 'Camila asigna herramientas, lectores y equipo de reparto para saber quién los utiliza y cuándo deben devolverse.',
    records: 'Camila documenta acuerdos e incidentes para que las decisiones no dependan de versiones distintas dentro de la familia.',
    permissions: 'Camila organiza permisos considerando quién cubrirá mostrador, almacén y entregas durante la ausencia.',
    incentives: 'Camila reconoce resultados ligados a surtido correcto, atención y orden del inventario con criterios conocidos por todos.',
    kpis: 'Camila observa asistencia, rotación y costo laboral para profesionalizar el negocio sin perder control durante el crecimiento.',
  },
};
