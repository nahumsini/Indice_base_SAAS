export interface RHIncentivo {
  id: string;
  nombre: string;
  tipo: 'Automatizado' | 'Manual';
  alcance: string;
  monto: string;
  aplicacion: string;
  estado: 'Activo' | 'Programado' | 'Pausado';
}
