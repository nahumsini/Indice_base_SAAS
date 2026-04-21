// Colores consistentes de módulos - deben coincidir con los del home
export const MODULE_COLORS = {
  // Recursos Humanos (Personas) - Azul
  blue: {
    primary: '#143675',
    primaryHover: '#0f2855',
    lightBg: 'bg-[#143675]/5',
    darkBg: 'dark:bg-[#143675]/10',
    border: 'border-[#143675]/20',
    darkBorder: 'dark:border-[#143675]/30',
    text: 'text-[#143675]',
    darkText: 'dark:text-[#4a7bc8]',
    button: 'bg-[#143675] hover:bg-[#0f2855]',
    iconHover: 'hover:bg-[#143675]/5',
  },
  
  // Procesos y Tareas - Amarillo
  yellow: {
    primary: '#FFC300',
    border: 'border-[#FFC300]',
    lightBg: 'bg-[#FFC300]/5',
    text: 'text-[#FFC300]',
  },
  
  // Finanzas - Verde
  green: {
    primary: '#147514',
    border: 'border-[#147514]',
    lightBg: 'bg-[#147514]/5',
    text: 'text-[#147514]',
  },
} as const;
