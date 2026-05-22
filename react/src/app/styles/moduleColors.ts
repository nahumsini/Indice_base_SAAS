// Colores consistentes de módulos - deben coincidir con los del home
export const MODULE_COLORS = {
  // Human Resources - operational aqua
  aqua: {
    primary: '#59C3A5',
    primaryHover: '#3AAE90',
    lightBg: 'bg-[#59C3A5]/5',
    darkBg: 'dark:bg-[#59C3A5]/10',
    border: 'border-[#59C3A5]/20',
    darkBorder: 'dark:border-[#59C3A5]/30',
    text: 'text-[#257B68]',
    darkText: 'dark:text-[#8FE0CA]',
    button: 'bg-[#59C3A5] hover:bg-[#3AAE90]',
    iconHover: 'hover:bg-[#59C3A5]/5',
  },

  // Home Panel / index identity - blue
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
