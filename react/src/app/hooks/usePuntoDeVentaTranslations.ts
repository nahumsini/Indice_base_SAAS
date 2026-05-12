import { useLanguage } from '../shared/context';

export const usePuntoDeVentaTranslations = () => {
  const { currentLanguage } = useLanguage();

  const translations = {
    es: {
      title: 'Punto de Venta',
      subtitle: 'Sistema de facturación y gestión de ventas',
      back: 'Volver',
      tabs: {
        cortes: 'Cortes',
        facturacion: 'Facturación',
        inventario: 'Inventario',
        historial: 'Historial',
        precios: 'Precios',
        arqueos: 'Arqueos',
        turnos: 'Turnos',
        clientes: 'Clientes',
        productos: 'Productos',
        ordenesCompra: 'Órdenes de Compra',
        descuentos: 'Descuentos',
        kpis: 'KPIs',
      },
    },
    en: {
      title: 'Point of Sale',
      subtitle: 'Billing system and sales management',
      back: 'Back',
      tabs: {
        cortes: 'Cash Cuts',
        facturacion: 'Billing',
        inventario: 'Inventory',
        historial: 'History',
        precios: 'Prices',
        arqueos: 'Cash Counts',
        turnos: 'Shifts',
        clientes: 'Customers',
        productos: 'Products',
        ordenesCompra: 'Purchase Orders',
        descuentos: 'Discounts',
        kpis: 'KPIs',
      },
    },
    pt: {
      title: 'Ponto de Venda',
      subtitle: 'Sistema de faturação e gestão de vendas',
      back: 'Voltar',
      tabs: {
        cortes: 'Cortes',
        facturacion: 'Faturação',
        inventario: 'Inventário',
        historial: 'Histórico',
        precios: 'Preços',
        arqueos: 'Contagens de Caixa',
        turnos: 'Turnos',
        clientes: 'Clientes',
        productos: 'Produtos',
        ordenesCompra: 'Ordens de Compra',
        descuentos: 'Descontos',
        kpis: 'KPIs',
      },
    },
    fr: {
      title: 'Point de Vente',
      subtitle: 'Système de facturation et gestion des ventes',
      back: 'Retour',
      tabs: {
        cortes: 'Coupes de caisse',
        facturacion: 'Facturation',
        inventario: 'Inventaire',
        historial: 'Historique',
        precios: 'Prix',
        arqueos: 'Comptages de Caisse',
        turnos: 'Quarts',
        clientes: 'Clients',
        productos: 'Produits',
        ordenesCompra: 'Bons de Commande',
        descuentos: 'Remises',
        kpis: 'KPIs',
      },
    },
    de: {
      title: 'Verkaufsstelle',
      subtitle: 'Abrechnungssystem und Verkaufsverwaltung',
      back: 'Zurück',
      tabs: {
        cortes: 'Kassenabschlüsse',
        facturacion: 'Abrechnung',
        inventario: 'Inventar',
        historial: 'Verlauf',
        precios: 'Preise',
        arqueos: 'Kassenzählungen',
        turnos: 'Schichten',
        clientes: 'Kunden',
        productos: 'Produkte',
        ordenesCompra: 'Bestellungen',
        descuentos: 'Rabatte',
        kpis: 'KPIs',
      },
    },
    it: {
      title: 'Punto Vendita',
      subtitle: 'Sistema di fatturazione e gestione vendite',
      back: 'Indietro',
      tabs: {
        cortes: 'Chiusure di Cassa',
        facturacion: 'Fatturazione',
        inventario: 'Inventario',
        historial: 'Cronologia',
        precios: 'Prezzi',
        arqueos: 'Conteggi di Cassa',
        turnos: 'Turni',
        clientes: 'Clienti',
        productos: 'Prodotti',
        ordenesCompra: 'Ordini di Acquisto',
        descuentos: 'Sconti',
        kpis: 'KPIs',
      },
    },
  };

  // Map language codes to translation keys (es-MX -> es, en-US -> en, etc.)
  const languageMap: Record<string, string> = {
    'es-MX': 'es',
    'es-CO': 'es',
    'en-US': 'en',
    'en-CA': 'en',
    'pt-BR': 'pt',
    'fr-CA': 'fr',
    'ko-CA': 'en',
    'zh-CA': 'en',
  };

  const translationKey = languageMap[currentLanguage.code] || 'es';
  return translations[translationKey as keyof typeof translations] || translations.es;
};
