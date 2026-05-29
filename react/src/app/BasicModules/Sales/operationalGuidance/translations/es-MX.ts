export const esMX = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guia operativa de Ventas',
  subtitle: 'Conecta oportunidades, cotizaciones, cierre comercial, preparacion de inventario, validacion financiera y postventa.',
  controlLabel: 'Control comercial',
  functionsLabel: 'Flujo recomendado',
  guideProgressLabel: 'Progreso de guia',
  guideProgressCompleteLabel: 'revisado',
  previousStepLabel: 'Recomendacion anterior',
  nextStepLabel: 'Siguiente recomendacion',
  stepIndicatorLabel: 'Mostrar recomendacion',
  collapseLabel: 'Contraer guia',
  expandLabel: 'Expandir guia',
  tabs: {
    leads: {
      label: 'Prospectos',
      ctaLabel: 'Revisar oportunidades',
      title: 'Construye un pipeline disciplinado',
      summary: 'Usa Prospectos para capturar demanda, calificar interes, asignar responsable y definir la siguiente accion comercial.',
      value: 'Un pipeline limpio mantiene visible el seguimiento y evita que el ingreso dependa de la memoria.',
      steps: [
        {
          title: 'Califica antes de cotizar',
          description: 'Confirma necesidad, presupuesto, tiempo y contexto de decision antes de avanzar a cotizacion.',
        },
        {
          title: 'Asigna un vendedor responsable',
          description: 'Cada oportunidad activa debe tener un dueno claro y una siguiente accion con fecha.',
        },
        {
          title: 'Mantén etapas honestas',
          description: 'Mueve oportunidades solo cuando el cliente realmente avanzo en el proceso de compra.',
        },
      ],
    },
    contacts: {
      label: 'Contactos',
      ctaLabel: 'Revisar contactos',
      title: 'Convierte relaciones en control comercial',
      summary: 'Usa Contactos como base de clientes, prospectos, responsables y contexto de seguimiento.',
      value: 'Datos confiables facilitan cotizaciones, ventas, entrega y seguimiento para todo el equipo.',
      steps: [
        {
          title: 'Completa el perfil de relacion',
          description: 'Mantén visibles empresa, rol, telefono, correo, datos fiscales y responsable.',
        },
        {
          title: 'Separa contacto de oportunidad',
          description: 'Crea primero el contacto y luego conecta oportunidades y cotizaciones a la relacion correcta.',
        },
        {
          title: 'Evita responsables vacios',
          description: 'Los contactos sin responsable generan seguimientos perdidos y responsabilidad confusa.',
        },
      ],
    },
    quotes: {
      label: 'Cotizaciones',
      ctaLabel: 'Revisar cotizaciones',
      title: 'Cotiza con margen y preparacion',
      summary: 'Usa Cotizaciones para preparar la oferta, validar productos, proteger margen y controlar vigencia.',
      value: 'Una cotizacion debe estar lista para enviarse, entenderse financieramente y convertirse cuando el cliente acepta.',
      steps: [
        {
          title: 'Revisa preparacion antes de enviar',
          description: 'Valida cliente, partidas, impuestos, vigencia, productos y margen antes de compartir.',
        },
        {
          title: 'Observa riesgo de margen',
          description: 'Margen bajo o costo faltante debe resolverse antes de convertir la cotizacion en venta.',
        },
        {
          title: 'Mantén visible la vigencia',
          description: 'Cotizaciones vencidas o por vencer necesitan seguimiento antes de enfriar el pipeline.',
        },
      ],
    },
    sales: {
      label: 'Ventas',
      ctaLabel: 'Revisar ventas cerradas',
      title: 'Convierte cotizaciones aceptadas en ejecucion',
      summary: 'Usa Ventas para registrar cierres ganados y preparar el traspaso a finanzas, inventario, comisiones y postventa.',
      value: 'Una cotizacion ganada no es el final. El registro de venta dice que debe validarse y ejecutarse despues.',
      steps: [
        {
          title: 'Parte de una cotizacion aceptada',
          description: 'Ventas normalmente debe heredar cliente, vendedor, productos, totales y contexto de la cotizacion.',
        },
        {
          title: 'Valida evidencia de pago',
          description: 'Finanzas avanza mejor cuando metodo, referencia y estado de evidencia estan claros.',
        },
        {
          title: 'Prepara el traspaso a inventario',
          description: 'Ventas mide preparacion; inventario conserva la responsabilidad de stock y aprobacion de movimientos.',
        },
      ],
    },
    products: {
      label: 'Productos',
      ctaLabel: 'Revisar productos',
      title: 'Mantén limpio el catalogo vendible',
      summary: 'Usa Productos para mantener disponibilidad comercial, precio, categoria, medios y preparacion.',
      value: 'La claridad del producto protege cotizaciones, evita promesas incorrectas y prepara alineacion con inventario.',
      steps: [
        {
          title: 'Define visibilidad',
          description: 'Marca si el producto es interno, comercial, listo para POS o solo para cotizacion.',
        },
        {
          title: 'Revisa costo antes de cotizar',
          description: 'Costo faltante o desactualizado hace menos confiables las decisiones de margen y venta.',
        },
        {
          title: 'Usa categorias consistentes',
          description: 'Categorias limpias facilitan filtros de catalogo y reportes comerciales.',
        },
      ],
    },
    inventory: {
      label: 'Inventario',
      ctaLabel: 'Revisar inventario',
      title: 'Protege la ejecucion de stock',
      summary: 'Usa Inventario para seguir existencias, almacenes, movimientos, transferencias, ajustes y trazabilidad.',
      value: 'Inventario es dueno del stock. Ventas solo prepara el traspaso comercial y lee la preparacion del movimiento.',
      steps: [
        {
          title: 'Separa venta de movimiento',
          description: 'La venta cerrada prepara la necesidad; inventario valida disponibilidad y ejecuta cambios de stock.',
        },
        {
          title: 'Usa estados con intencion',
          description: 'Borrador, en transito, recibido, completado y cancelado deben explicar que paso operativamente.',
        },
        {
          title: 'Mantén contexto de almacen',
          description: 'Almacen y ubicacion claros evitan confusion cuando el equipo cumple compromisos con clientes.',
        },
      ],
    },
    contracts: {
      label: 'Contratos',
      ctaLabel: 'Revisar contratos',
      title: 'Formaliza compromisos comerciales',
      summary: 'Usa Contratos para controlar compromisos firmados, renovaciones, terminos, responsables y contexto.',
      value: 'Los contratos convierten promesas comerciales en acuerdos operativos trazables.',
      steps: [
        {
          title: 'Conecta contrato con venta',
          description: 'Mantén cotizacion, cliente, vendedor, fechas y alcance unidos para que entrega tenga contexto.',
        },
        {
          title: 'Controla renovacion y vencimiento',
          description: 'Fechas visibles ayudan a actuar antes de poner en riesgo ingreso o continuidad del servicio.',
        },
      ],
    },
    'after-sales': {
      label: 'Postventa',
      ctaLabel: 'Revisar postventa',
      title: 'Cierra el ciclo con el cliente',
      summary: 'Usa Postventa para seguir entrega, incidentes, satisfaccion, servicio y compromisos posteriores.',
      value: 'Un buen control postventa convierte la entrega en retencion y no en seguimiento suelto.',
      steps: [
        {
          title: 'Confirma que debe pasar despues del cierre',
          description: 'Captura responsabilidades de entrega, onboarding, servicio y seguimiento al cliente.',
        },
        {
          title: 'Mantén incidentes trazables',
          description: 'Los problemas operativos deben tener responsable, estado y siguiente accion hasta resolverse.',
        },
      ],
    },
    kpis: {
      label: 'KPIs',
      ctaLabel: 'Revisar KPIs',
      title: 'Convierte actividad comercial en decisiones',
      summary: 'Usa KPIs para leer pipeline, cotizaciones, ventas, margen, traspaso a inventario y disciplina de seguimiento.',
      value: 'Las metricas ayudan a decidir donde poner atencion antes de que los problemas afecten caja o entrega.',
      steps: [
        {
          title: 'Lee conversion y margen juntos',
          description: 'Mucho volumen sin margen puede crear presion operativa sin crecimiento sano.',
        },
        {
          title: 'Observa validaciones pendientes',
          description: 'Cuellos de botella en finanzas, inventario y comisiones muestran donde se frena la ejecucion.',
        },
      ],
    },
  },
} as const;
