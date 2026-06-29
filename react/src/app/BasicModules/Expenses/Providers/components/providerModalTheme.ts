export type ProviderModalVariant = 'finance' | 'sales';

export const getProviderModalTheme = (variant: ProviderModalVariant = 'finance') => {
  if (variant === 'sales') {
    return {
      accent: '#FF6B5E',
      accentDark: '#E8564B',
      accentText: '#B63B32',
      softBackground: 'rgba(255, 107, 94, 0.1)',
      softBorder: 'rgba(255, 107, 94, 0.28)',
    };
  }

  return {
    accent: '#147514',
    accentDark: '#105010',
    accentText: '#147514',
    softBackground: 'rgba(20, 117, 20, 0.1)',
    softBorder: 'rgba(20, 117, 20, 0.28)',
  };
};
