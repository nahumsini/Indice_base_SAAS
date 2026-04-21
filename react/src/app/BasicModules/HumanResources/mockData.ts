export interface RHColaborador {
  id: number;
  codigo: string;
  nombre: string;
  puesto: string;
  departamento: string;
  unidad: number;
  negocio: string;
  correo: string;
  telefono: string;
  fechaIngreso: string;
  fechaNacimiento?: string;
  direccion?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  salario: number;
  periodoPago: 'weekly' | 'biweekly' | 'monthly';
  estado: 'Activo' | 'Vacaciones' | 'Capacitacion' | 'Inactivo';
}

export interface RHComunicado {
  id: string;
  titulo: string;
  tipo: 'General' | 'Urgente' | 'Recordatorio' | 'Celebracion';
  destinatarios: string;
  estado: 'Publicado' | 'Programado' | 'Borrador';
  fecha: string;
  autor: string;
}

export interface RHActivoAsignado {
  id: string;
  nombre: string;
  categoria: string;
  colaborador: string;
  departamento: string;
  estado: 'Asignado' | 'Mantenimiento' | 'Resguardo' | 'Disponible';
  condicion: 'Excelente' | 'Bueno' | 'Revision';
  fechaAsignacion: string;
}

export interface RHActaRegistro {
  id: string;
  colaborador: string;
  tipo: string;
  gravedad: 'Baja' | 'Media' | 'Alta';
  fecha: string;
  estado: 'Pendiente' | 'Cerrada';
}

export interface RHIncentivo {
  id: string;
  nombre: string;
  tipo: 'Automatizado' | 'Manual';
  alcance: string;
  monto: string;
  aplicacion: string;
  estado: 'Activo' | 'Programado' | 'Pausado';
}

export interface RHAsistenciaHoy {
  id: number;
  colaborador: string;
  unidad: number;
  hora: string;
  estado: 'A tiempo' | 'Retardo' | 'Permiso' | 'Descanso';
}

export const rhColaboradores: RHColaborador[] = [
  {
    id: 1,
    codigo: 'RH-001',
    nombre: 'Ana Garcia Soto',
    puesto: 'Coordinadora de Operaciones',
    departamento: 'Operaciones',
    unidad: 7,
    negocio: 'Negocio A',
    correo: 'ana.garcia@indiceerp.com',
    telefono: '+52 81 5550 0101',
    fechaIngreso: '2024-01-15',
    fechaNacimiento: '1992-05-13',
    direccion: 'Av. Reforma 245, Monterrey, Nuevo León',
    curp: 'AGSN920513MNLRTA01',
    rfc: 'AGSN9205132F1',
    nss: '12345678901',
    salario: 2200,
    periodoPago: 'weekly',
    estado: 'Activo',
  },
  {
    id: 2,
    codigo: 'RH-002',
    nombre: 'Carlos Ruiz Mendoza',
    puesto: 'Supervisor de Turno',
    departamento: 'Operaciones',
    unidad: 8,
    negocio: 'Negocio B',
    correo: 'carlos.ruiz@indiceerp.com',
    telefono: '+52 81 5550 0102',
    fechaIngreso: '2023-11-02',
    fechaNacimiento: '1989-09-21',
    direccion: 'Calle Fresno 88, San Pedro, Nuevo León',
    curp: 'RUMC890921HNLZRN05',
    rfc: 'RUMC8909217Q2',
    nss: '12345678902',
    salario: 3000,
    periodoPago: 'weekly',
    estado: 'Activo',
  },
  {
    id: 3,
    codigo: 'RH-003',
    nombre: 'Diana Moreno Castro',
    puesto: 'Analista de RH',
    departamento: 'Administracion',
    unidad: 7,
    negocio: 'Negocio A',
    correo: 'diana.moreno@indiceerp.com',
    telefono: '+52 81 5550 0103',
    fechaIngreso: '2025-02-10',
    fechaNacimiento: '1995-02-04',
    direccion: 'Blvd. Acacias 442, Monterrey, Nuevo León',
    curp: 'MODD950204MNLRNN09',
    rfc: 'MODD9502049N8',
    nss: '12345678903',
    salario: 2200,
    periodoPago: 'weekly',
    estado: 'Activo',
  },
  {
    id: 4,
    codigo: 'RH-004',
    nombre: 'Mariana Torres Vega',
    puesto: 'Encargada de Limpieza',
    departamento: 'Limpieza',
    unidad: 9,
    negocio: 'Negocio C',
    correo: 'mariana.torres@indiceerp.com',
    telefono: '+52 81 5550 0104',
    fechaIngreso: '2022-08-19',
    fechaNacimiento: '1990-11-27',
    direccion: 'Priv. del Lago 76, Monterrey, Nuevo León',
    curp: 'TOVM901127MNLRGR08',
    rfc: 'TOVM9011274P6',
    nss: '12345678904',
    salario: 2400,
    periodoPago: 'weekly',
    estado: 'Vacaciones',
  },
  {
    id: 5,
    codigo: 'RH-005',
    nombre: 'Pedro Sanchez Lara',
    puesto: 'Tecnico de Mantenimiento',
    departamento: 'Mantenimiento',
    unidad: 10,
    negocio: 'Negocio C',
    correo: 'pedro.sanchez@indiceerp.com',
    telefono: '+52 81 5550 0105',
    fechaIngreso: '2021-06-05',
    fechaNacimiento: '1988-03-18',
    direccion: 'Av. Las Torres 190, Guadalupe, Nuevo León',
    curp: 'SALP880318HNLRRD03',
    rfc: 'SALP8803183K4',
    nss: '12345678905',
    salario: 2500,
    periodoPago: 'weekly',
    estado: 'Activo',
  },
  {
    id: 6,
    codigo: 'RH-006',
    nombre: 'Laura Castillo Perez',
    puesto: 'Auxiliar Administrativo',
    departamento: 'Administracion',
    unidad: 8,
    negocio: 'Negocio B',
    correo: 'laura.castillo@indiceerp.com',
    telefono: '+52 81 5550 0106',
    fechaIngreso: '2024-09-01',
    fechaNacimiento: '1997-07-15',
    direccion: 'Calle Magnolia 301, Monterrey, Nuevo León',
    curp: 'CAPL970715MNLSTR07',
    rfc: 'CAPL9707151V0',
    nss: '12345678906',
    salario: 2600,
    periodoPago: 'weekly',
    estado: 'Capacitacion',
  },
  {
    id: 7,
    codigo: 'RH-007',
    nombre: 'Jorge Martinez Leon',
    puesto: 'Operador de Kiosco',
    departamento: 'Operaciones',
    unidad: 7,
    negocio: 'Negocio A',
    correo: 'jorge.martinez@indiceerp.com',
    telefono: '+52 81 5550 0107',
    fechaIngreso: '2023-03-17',
    fechaNacimiento: '1991-01-30',
    direccion: 'Camino Real 58, Monterrey, Nuevo León',
    curp: 'MALJ910130HNLRRN02',
    rfc: 'MALJ9101306D7',
    nss: '12345678907',
    salario: 2750,
    periodoPago: 'weekly',
    estado: 'Activo',
  },
  {
    id: 8,
    codigo: 'RH-008',
    nombre: 'Monica Alvarez Cruz',
    puesto: 'Auxiliar de Lavanderia',
    departamento: 'Lavanderia',
    unidad: 9,
    negocio: 'Negocio C',
    correo: 'monica.alvarez@indiceerp.com',
    telefono: '+52 81 5550 0108',
    fechaIngreso: '2022-12-12',
    fechaNacimiento: '1993-08-09',
    direccion: 'Paseo del Valle 12, Monterrey, Nuevo León',
    curp: 'AUCM930809MNLRLR04',
    rfc: 'AUCM9308092A5',
    nss: '12345678908',
    salario: 2200,
    periodoPago: 'weekly',
    estado: 'Inactivo',
  },
];

export const rhComunicadosSeed: RHComunicado[] = [
  {
    id: 'COM-301',
    titulo: 'Cambio de horario operativo',
    tipo: 'Urgente',
    destinatarios: 'Operaciones · Unidades 7 y 8',
    estado: 'Publicado',
    fecha: '15 Mar 2026 · 08:00',
    autor: 'RH Central',
  },
  {
    id: 'COM-302',
    titulo: 'Recordatorio de evaluaciones mensuales',
    tipo: 'Recordatorio',
    destinatarios: 'Todos los lideres',
    estado: 'Programado',
    fecha: '18 Mar 2026 · 09:30',
    autor: 'Diana Moreno',
  },
  {
    id: 'COM-303',
    titulo: 'Celebracion de aniversarios del mes',
    tipo: 'Celebracion',
    destinatarios: 'Todo el personal',
    estado: 'Borrador',
    fecha: '20 Mar 2026 · 14:00',
    autor: 'Comunicacion Interna',
  },
];

export const rhActivosSeed: RHActivoAsignado[] = [
  {
    id: 'AT-110',
    nombre: 'Laptop Dell Latitude',
    categoria: 'Equipo de computo',
    colaborador: 'Diana Moreno Castro',
    departamento: 'Administracion',
    estado: 'Asignado',
    condicion: 'Excelente',
    fechaAsignacion: '12 Ene 2026',
  },
  {
    id: 'AT-111',
    nombre: 'Terminal biometrica kiosco',
    categoria: 'Control de asistencia',
    colaborador: 'Jorge Martinez Leon',
    departamento: 'Operaciones',
    estado: 'Mantenimiento',
    condicion: 'Revision',
    fechaAsignacion: '03 Feb 2026',
  },
  {
    id: 'AT-112',
    nombre: 'Radio de comunicacion',
    categoria: 'Operacion',
    colaborador: 'Carlos Ruiz Mendoza',
    departamento: 'Operaciones',
    estado: 'Asignado',
    condicion: 'Bueno',
    fechaAsignacion: '22 Feb 2026',
  },
  {
    id: 'AT-113',
    nombre: 'Kit de herramientas',
    categoria: 'Mantenimiento',
    colaborador: 'Pedro Sanchez Lara',
    departamento: 'Mantenimiento',
    estado: 'Disponible',
    condicion: 'Bueno',
    fechaAsignacion: '11 Mar 2026',
  },
];

export const rhActasSeed: RHActaRegistro[] = [
  {
    id: 'ACT-401',
    colaborador: 'Ana Garcia Soto',
    tipo: 'Reconocimiento',
    gravedad: 'Baja',
    fecha: '11 Mar 2026',
    estado: 'Cerrada',
  },
  {
    id: 'ACT-402',
    colaborador: 'Carlos Ruiz Mendoza',
    tipo: 'Observacion',
    gravedad: 'Media',
    fecha: '12 Mar 2026',
    estado: 'Pendiente',
  },
  {
    id: 'ACT-403',
    colaborador: 'Monica Alvarez Cruz',
    tipo: 'Sancion',
    gravedad: 'Alta',
    fecha: '08 Mar 2026',
    estado: 'Cerrada',
  },
];

export const rhIncentivosSeed: RHIncentivo[] = [
  {
    id: 'INC-210',
    nombre: 'Bono por puntualidad',
    tipo: 'Automatizado',
    alcance: 'Equipo operativo',
    monto: '$800 fijo',
    aplicacion: 'Siguiente nomina',
    estado: 'Activo',
  },
  {
    id: 'INC-211',
    nombre: 'Incentivo por cumplimiento de meta',
    tipo: 'Automatizado',
    alcance: 'Supervisores',
    monto: '5% variable',
    aplicacion: 'Cierre mensual',
    estado: 'Programado',
  },
  {
    id: 'INC-212',
    nombre: 'Reconocimiento extraordinario',
    tipo: 'Manual',
    alcance: 'Diana Moreno Castro',
    monto: '$1,500 fijo',
    aplicacion: '15 Abr 2026',
    estado: 'Pausado',
  },
];

export const rhAsistenciaHoySeed: RHAsistenciaHoy[] = [
  { id: 1, colaborador: 'Ana Garcia Soto', unidad: 7, hora: '08:12', estado: 'A tiempo' },
  { id: 2, colaborador: 'Carlos Ruiz Mendoza', unidad: 8, hora: '09:04', estado: 'Retardo' },
  { id: 3, colaborador: 'Diana Moreno Castro', unidad: 7, hora: '08:27', estado: 'A tiempo' },
  { id: 4, colaborador: 'Mariana Torres Vega', unidad: 9, hora: '--:--', estado: 'Permiso' },
  { id: 5, colaborador: 'Pedro Sanchez Lara', unidad: 10, hora: '08:05', estado: 'A tiempo' },
  { id: 6, colaborador: 'Laura Castillo Perez', unidad: 8, hora: '--:--', estado: 'Descanso' },
];

export const rhRegisteredLocationsSeed = [
  {
    id: '1',
    nombre: 'Oficina Central - Monterrey',
    latitud: 25.6866,
    longitud: -100.3161,
    radio: 80,
    enlaceGoogleMaps: 'https://maps.google.com/?q=25.6866,-100.3161',
  },
  {
    id: '2',
    nombre: 'Sucursal Norte',
    latitud: 25.7428,
    longitud: -100.3112,
    radio: 90,
    enlaceGoogleMaps: 'https://maps.google.com/?q=25.7428,-100.3112',
  },
];
