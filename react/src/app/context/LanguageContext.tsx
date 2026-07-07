import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Language {
  code: string;
  name: string;
  flag: string;
  greetings: {
    morning: string;
    afternoon: string;
    evening: string;
  };
}

export const languages: Language[] = [
  {
    code: 'es-MX',
    name: 'Español (México)',
    flag: '🇲🇽',
    greetings: {
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches',
    },
  },
  {
    code: 'es-CO',
    name: 'Español (Colombia)',
    flag: '🇨🇴',
    greetings: {
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches',
    },
  },
  {
    code: 'en-US',
    name: 'English (USA)',
    flag: '🇺🇸',
    greetings: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
  },
  {
    code: 'en-CA',
    name: 'English (Canada)',
    flag: '🇨🇦',
    greetings: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
  },
  {
    code: 'fr-CA',
    name: 'Français (Québec)',
    flag: '🇨🇦',
    greetings: {
      morning: 'Bonjour',
      afternoon: 'Bon après-midi',
      evening: 'Bonsoir',
    },
  },
  {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    flag: '🇧🇷',
    greetings: {
      morning: 'Bom dia',
      afternoon: 'Boa tarde',
      evening: 'Boa noite',
    },
  },
  {
    code: 'ko-CA',
    name: '한국어 (캐나다)',
    flag: '🇰🇷',
    greetings: {
      morning: '좋은 아침',
      afternoon: '좋은 오후',
      evening: '좋은 저녁',
    },
  },
  {
    code: 'zh-CA',
    name: '中文 (加拿大)',
    flag: '🇨🇳',
    greetings: {
      morning: '早上好',
      afternoon: '下午好',
      evening: '晚上好',
    },
  },
];

type PdfLevelCopy = {
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
};

type PdfInterpretationCopy = {
  critical: string;
  emerging: string;
  organized: string;
  scalable: string;
  optimized: string;
};

export type BusinessDiagnosisPdfCopy = {
  brandBadge: string;
  fileName: string;
  companyLabel: string;
  companyFallback: string;
  generatedLabel: string;
  answeredLabel: string;
  questionsLabel: string;
  executiveSummaryTitle: string;
  executiveSummaryCaption: string;
  dashboardTitle: string;
  dashboardCaption: string;
  totalScore: string;
  maturityLevel: string;
  strongestPillar: string;
  weakestPillar: string;
  outOf100: string;
  radarTitle: string;
  progressTitle: string;
  pillarBreakdownTitle: string;
  pillarBreakdownCaption: string;
  detailedAnswersTitle: string;
  detailedAnswersCaption: string;
  recommendationLabel: string;
  suggestedModuleLabel: string;
  priorityLabel: string;
  questionColumn: string;
  selectedAnswerColumn: string;
  scoreColumn: string;
  pending: string;
  footerLeft: string;
  footerRight: string;
  levelNames: PdfLevelCopy;
  progressLevels: string[];
  moduleLabels: {
    people: string;
    processes: string;
    products: string;
    finance: string;
  };
  summaryTemplate: string;
  overallInterpretations: PdfInterpretationCopy;
  pillarInterpretations: PdfInterpretationCopy;
  opportunityTemplate: string;
  incompleteOpportunity: string;
  priorityActions: {
    people: string[];
    processes: string[];
    products: string[];
    finance: string[];
  };
};

export type PersonalPerformancePdfCopy = {
  brandBadge: string;
  fileName: string;
  userLabel: string;
  userFallback: string;
  generatedLabel: string;
  answeredLabel: string;
  questionsLabel: string;
  executiveSummaryTitle: string;
  executiveSummaryCaption: string;
  dashboardTitle: string;
  dashboardCaption: string;
  totalScore: string;
  performanceLevel: string;
  strongestArea: string;
  weakestArea: string;
  outOf100: string;
  radarTitle: string;
  progressTitle: string;
  sectionBreakdownTitle: string;
  sectionBreakdownCaption: string;
  detailedAnswersTitle: string;
  detailedAnswersCaption: string;
  recommendationLabel: string;
  suggestedFocusLabel: string;
  priorityLabel: string;
  questionColumn: string;
  selectedAnswerColumn: string;
  scoreColumn: string;
  pending: string;
  footerLeft: string;
  footerRight: string;
  levelNames: PdfLevelCopy;
  progressLevels: string[];
  focusLabels: {
    sleep_recovery: string;
    nutrition_energy: string;
    stress_clarity: string;
    balance_sustainability: string;
  };
  summaryTemplate: string;
  overallInterpretations: PdfInterpretationCopy;
  sectionInterpretations: PdfInterpretationCopy;
  opportunityTemplate: string;
  incompleteOpportunity: string;
  priorityActions: {
    sleep_recovery: string[];
    nutrition_energy: string[];
    stress_clarity: string[];
    balance_sustainability: string[];
  };
};

type TranslationDictionary = {
    header: {
      notifications: string;
      profile: string;
      settings: string;
      logout: string;
      learningMode: string;
    };
    sections: {
      kpis: string;
      favorites: string;
      quickAccess: string;
      basicModules: string;
      main: string;
      complementaryModules: string;
      additional: string;
      aiModules: string;
      aiLabel: string;
      configureKpis: string;
    };
    kpis: {
      weeklyRevenue: string;
      netProfit: string;
      activeClients: string;
      activeEmployees: string;
      pendingTasks: string;
      monthlyExpenses: string;
      vsWeekBefore: string;
      thisMonth: string;
      newOnes: string;
      dueToday: string;
      vsMonthBefore: string;
    };
    modules: {
      panelInicial: string;
      recursosHumanos: string;
      procesosTareas: string;
      gastos: string;
      cajaChica: string;
      puntoVenta: string;
      ventas: string;
      cartera: string;
      kpis: string;
      mantenimiento: string;
      inventarios: string;
      controlMinutas: string;
      limpieza: string;
      lavanderia: string;
      transportacion: string;
      vehiculosMaquinaria: string;
      inmuebles: string;
      formularios: string;
      facturacion: string;
      correoElectronico: string;
      climaLaboral: string;
      afiliados: string;
      indiceAgenteVentas: string;
      indiceAnalitica: string;
      capacitacion: string;
      indiceCoach: string;
    };
    notifications: {
      newTask: string;
      expensePending: string;
      newClient: string;
      timeAgo: {
        minutes: string;
        hour: string;
        hours: string;
      };
	    };
	    loginPage: {
	      logoAlt: string;
	      workspaceBadge: string;
	      accessBadge: string;
	      operatingSystemLabel: string;
	      frameworkLabel: string;
	      title: string;
	      subtitle: string;
	      pillars: Array<{
	        icon: string;
	        title: string;
	        description: string;
	      }>;
	      featureCards: Array<{
	        title: string;
	        description: string;
	      }>;
	      visualTitle: string;
	      visualSubtitle: string;
	      visualMetricValue: string;
	      visualMetricLabel: string;
	      visualSignalLabel: string;
	      welcomeTitle: string;
	      welcomeText: string;
	      emailLabel: string;
	      emailPlaceholder: string;
	      emailError: string;
	      passwordLabel: string;
	      passwordPlaceholder: string;
	      forgotPassword: string;
	      hidePassword: string;
	      showPassword: string;
	      signIn: string;
	      signingIn: string;
	      successToast: string;
	      errorFallback: string;
	      insideTitle: string;
	      insideItems: string[];
	      resetBadge: string;
	      resetTitle: string;
	      resetDescription: string;
	      resetCloseLabel: string;
	      resetCancel: string;
	      resetSubmit: string;
	      resetSubmitting: string;
	      resetSuccessFallback: string;
	      resetErrorFallback: string;
	    };
    learningMode: {
      welcome: string;
      hide: string;
      show: string;
      businessBase: string;
      clearBusinessStable: string;
      functions: string;
      businessContext: string;
      indiceMethodology: string;
      addModule: string;
      viewBasicModules: string;
      previous: string;
      next: string;
      stepOf: string;
      modules: {
        panelInicial: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        recursosHumanos: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        procesosTareas: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        gastos: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        cajaChica: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        puntoVenta: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        ventas: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
        kpis: {
          title: string;
          subtitle: string;
          description: string;
          functions: string[];
          context: string;
          quote: string;
        };
      };
    };
    panelInicial: {
      title: string;
      back: string;
      tabs: {
        profile: string;
        businessStructure: string;
        businessProfile: string;
        personalPerformance: string;
        billing: string;
        plan: string;
        users: string;
      };
      personalPerformance: {
        title: string;
        description: string;
        centerTitle: string;
        centerDescription: string;
        questionCount: string;
        questionCountLabel: string;
        progress: string;
        progressOf: string;
        printReport: string;
        restart: string;
        onboarding: {
          answeredProgress: string;
          encouragementMid: string;
          encouragementNear: string;
          sections: {
            sleep_recovery: {
              title: string;
              intro: string;
              done: string;
            };
            nutrition_energy: {
              title: string;
              intro: string;
              done: string;
            };
            stress_clarity: {
              title: string;
              intro: string;
              done: string;
            };
            balance_sustainability: {
              title: string;
              intro: string;
              done: string;
            };
          };
        };
        pdf: PersonalPerformancePdfCopy;
        messages: {
          loading: string;
          loadError: string;
          saveSuccess: string;
          saveError: string;
          unsavedChanges: string;
        };
        sections: {
          sleep_recovery: {
            title: string;
            description: string;
          };
          nutrition_energy: {
            title: string;
            description: string;
          };
          stress_clarity: {
            title: string;
            description: string;
          };
          balance_sustainability: {
            title: string;
            description: string;
          };
        };
        questions: {
          sleep_recovery: Array<{
            question: string;
            options: string[];
          }>;
          nutrition_energy: Array<{
            question: string;
            options: string[];
          }>;
          stress_clarity: Array<{
            question: string;
            options: string[];
          }>;
          balance_sustainability: Array<{
            question: string;
            options: string[];
          }>;
        };
      };
      structure: {
        title: string;
        subtitle: string;
        status: {
          connected: string;
          backendNotice: string;
        };
        actions: {
          save: string;
          saving: string;
          extract: string;
          useLocation: string;
          addUnit: string;
          configure: string;
          configureGroup: string;
          createUnit: string;
        };
        messages: {
          loading: string;
          loadError: string;
          saveError: string;
          saveSuccess: string;
          saveOverlay: string;
          saveOverlayDescription: string;
          createUnitTitle: string;
          updateUnitTitle: string;
          unitOverlayDescription: string;
          createUnitSuccess: string;
          updateUnitSuccess: string;
          createBusinessTitle: string;
          updateBusinessTitle: string;
          businessOverlayDescription: string;
          createBusinessSuccess: string;
          updateBusinessSuccess: string;
        };
        mode: {
          title: string;
          description: string;
          helper: string;
          simple: string;
          multi: string;
          simpleTitle: string;
          simpleDescription: string;
          simpleExample: string;
          multiTitle: string;
          multiDescription: string;
          multiExample: string;
          switchPrompt: string;
          switchAction: string;
          multiNote: string;
          selected: string;
          structurePreviewTitle: string;
          structurePreviewLines: string[];
        };
        identity: {
          simple: string;
          holding: string;
          simpleDesc: string;
          holdingDesc: string;
          holdingNotice: string;
        };
        headquarters: {
          helper: string;
          context: string;
          basicInfo: string;
          industryHelper: string;
          locationTitle: string;
          locationHelper: string;
          addressTitle: string;
          addressHelper: string;
          addressNote: string;
        };
        fields: {
          companyName: string;
          holdingName: string;
          industry: string;
          selectIndustry: string;
          industryHint: string;
          country: string;
          selectCountry: string;
          logo: string;
          logoHolding: string;
          uploadImage: string;
          noFileSelected: string;
          uploadHint: string;
          removeLogo: string;
          description: string;
          optional: string;
          basicInfo: string;
          location: string;
          contact: string;
          operationalInfo: string;
          address: string;
          city: string;
          state: string;
          postalCode: string;
          phone: string;
          email: string;
          manager: string;
          schedule: string;
          logoPreviewAlt: string;
        };
        units: {
          title: string;
          subtitle: string;
          description: string;
          context: string;
          groupLabel: string;
          mainUnit: string;
          helper: string;
          tip: string;
          empty: string;
          emptyHelper: string;
          groupContext: string;
          tipAction: string;
          addUnit: string;
          addBusiness: string;
          unitName: string;
          unitCountry: string;
          businessName: string;
          configureUnit: string;
          configureBusiness: string;
          businessCountSingular: string;
          businessCountPlural: string;
        };
        modal: {
          newUnit: string;
          editUnit: string;
          newBusiness: string;
          editBusiness: string;
          save: string;
          cancel: string;
          delete: string;
          createBusiness: string;
          newUnitDescription: string;
          editUnitDescription: string;
          newBusinessDescription: string;
          editBusinessDescription: string;
          confirmDeleteUnit: string;
          confirmDeleteBusiness: string;
        };
        placeholders: {
          unitName: string;
          businessName: string;
          address: string;
          city: string;
          state: string;
          postalCode: string;
          phone: string;
          unitEmail: string;
          businessEmail: string;
          manager: string;
          schedule: string;
        };
        options: {
          businessIdentityIndustries: Array<{
            value: string;
            label: string;
          }>;
          unitIndustries: Array<{
            value: string;
            label: string;
          }>;
          countries: Array<{
            value: string;
            label: string;
          }>;
        };
      };
      profile: {
        title: string;
        subtitle: string;
        helper: string;
        fields: {
          fullName: string;
          email: string;
          phone: string;
          position: string;
          department: string;
          profilePhoto: string;
          country: string;
          uploadPhoto: string;
          firstNames: string;
          lastNames: string;
          preferredLanguage: string;
          newPassword: string;
          confirmNewPassword: string;
        };
        sections: {
          identityTitle: string;
          identitySubtitle: string;
          contactTitle: string;
          contactSubtitle: string;
          securityTitle: string;
          securitySubtitle: string;
          preferencesTitle: string;
          preferencesSubtitle: string;
          nameGroup: string;
        };
        hints: {
          photoFormat: string;
          firstNames: string;
          lastNames: string;
          phone: string;
          password: string;
          preferredLanguage: string;
        };
        actions: {
          save: string;
          saving: string;
          discard: string;
        };
        messages: {
          loading: string;
          saveSuccess: string;
          loadError: string;
          saveError: string;
          unsavedChanges: string;
          optional: string;
          savingOverlay: string;
          passwordMismatch: string;
          passwordMinLength: string;
          invalidPhone: string;
        };
      };
      users: {
        title: string;
        subtitle: string;
        invite: string;
        search: string;
        filters: {
          all: string;
          active: string;
          pending: string;
          inactive: string;
        };
        roles: {
          superAdmin: string;
          admin: string;
          user: string;
        };
        status: {
          active: string;
          pending: string;
          inactive: string;
        };
        table: {
          name: string;
          email: string;
          role: string;
          status: string;
          modules: string;
          actions: string;
        };
        businessStructure: {
          businessUnit: string;
          business: string;
          team: string;
          person: string;
          people: string;
          module: string;
          modules: string;
          empty: string;
          selectBusinessUnit: string;
          selectBusiness: string;
          noBusinessOptions: string;
          unitOptions: Array<{
            value: string;
            label: string;
          }>;
        };
        actions: {
          edit: string;
          resend: string;
          delete: string;
        };
        modal: {
          newUser: string;
          editUser: string;
          name: string;
          email: string;
          role: string;
          selectRole: string;
          modules: string;
          selectModules: string;
          inviteLink: string;
          copyLink: string;
          copied: string;
          save: string;
          cancel: string;
          send: string;
        };
      };
      plan: {
        title: string;
        subtitle: string;
        mostPopular?: string;
        plans?: {
          inicio: {
            name: string;
            description: string;
            button: string;
          };
          controla: {
            name: string;
            description: string;
            button: string;
          };
          escala: {
            name: string;
            description: string;
            button: string;
          };
          corporativiza: {
            name: string;
            description: string;
            button: string;
          };
        };
        features?: {
          humanResources: string;
          processes: string;
          products: string;
          finance: string;
          kpisBasic: string;
          kpisComplete: string;
          kpisAdvanced: string;
          kpisCorporate: string;
          users5: string;
          users10: string;
          users20: string;
          users25: string;
          complementaryModules: string;
          modules2: string;
          modules4: string;
          allModules: string;
          aiAnalytics: string;
          integrations: string;
          sessions1: string;
          sessions2: string;
          sessions4: string;
        };
        additionalInfo?: {
          title: string;
          extraUser: string;
          extraUserPrice: string;
          learningMode: string;
          learningModeDesc: string;
          updates: string;
          updatesDesc: string;
        };
      };
      billing: {
        title: string;
        subtitle: string;
        fiscalData: {
          title: string;
          subtitle: string;
          country: string;
          selectCountry: string;
          // México
          rfc: string;
          razonSocial: string;
          regimenFiscal: string;
          usoCFDI: string;
          codigoPostalFiscal: string;
          // Colombia
          nit: string;
          responsabilidadFiscal: string;
          // Brasil
          cnpjCpf: string;
          razaoSocial: string;
          inscricaoEstadual: string;
          // USA
          ein: string;
          legalName: string;
          state: string;
          // Canadá
          businessNumber: string;
          province: string;
          // Genéricos
          taxId: string;
          companyName: string;
          taxRegime: string;
          postalCode: string;
        };
        paymentMethod: {
          title: string;
          subtitle: string;
          type: string;
          selectMethod: string;
          cardNumber: string;
          cvv: string;
          expirationDate: string;
          cardholderName: string;
          addCard: string;
          cancel: string;
          savedCards: string;
          defaultCard: string;
          saveCard: string;
          placeholder: {
            cardNumber: string;
            cvv: string;
            expirationDate: string;
            cardholderName: string;
          };
        };
        automaticBilling: {
          title: string;
          subtitle: string;
          enable: string;
          description: string;
          billingDay: string;
          selectDay: string;
          emailForInvoices: string;
          reminderNote: string;
        };
        currentBilling: {
          title: string;
          plan: string;
          notConfigured: string;
          amount: string;
          nextPayment: string;
        };
        invoices: {
          title: string;
          subtitle: string;
          month: string;
          year: string;
          status: string;
          downloadPdf: string;
          date: string;
          concept: string;
          amount: string;
          paid: string;
          pending: string;
        };
        billingFrequency: {
          title: string;
          note: string;
          monthly: string;
          quarterly: string;
          semiannual: string;
          annual: string;
        };
      };
      diagnosis: {
        title: string;
        description: string;
        centerTitle: string;
        centerDescription: string;
        questionCount: string;
        questionCountLabel: string;
        progress: string;
        progressOf: string;
        onboarding: {
          answeredProgress: string;
          encouragementMid: string;
          encouragementNear: string;
          sections: {
            people: {
              title: string;
              intro: string;
              done: string;
            };
            processes: {
              title: string;
              intro: string;
              done: string;
            };
            products: {
              title: string;
              intro: string;
              done: string;
            };
            finance: {
              title: string;
              intro: string;
              done: string;
            };
          };
        };
        pdf: BusinessDiagnosisPdfCopy;
        printDiagnosis: string;
        start: string;
        continue: string;
        doAgain: string;
        reviewAnswers: string;
        close: string;
        question: string;
        of: string;
        completed: string;
        previous: string;
        next: string;
        finish: string;
        restart: string;
        actions: {
          save: string;
          saving: string;
          discard: string;
        };
        scoreSummary: {
          title: string;
          bmi: string;
          level: string;
          answered: string;
          score: string;
        };
        messages: {
          loading: string;
          loadError: string;
          saveSuccess: string;
          saveError: string;
          unsavedChanges: string;
        };
        pillars: {
          people: {
            title: string;
            description: string;
          };
          processes: {
            title: string;
            description: string;
          };
          products: {
            title: string;
            description: string;
          };
          finance: {
            title: string;
            description: string;
          };
        };
        questions: {
          people: Array<{
            question: string;
            options: string[];
          }>;
          processes: Array<{
            question: string;
            options: string[];
          }>;
          products: Array<{
            question: string;
            options: string[];
          }>;
          finance: Array<{
            question: string;
            options: string[];
          }>;
        };
      };
    };
};

interface Translations {
  [key: string]: TranslationDictionary;
}

type DiagnosisPdfTranslation = TranslationDictionary['panelInicial']['diagnosis']['pdf'];
type PerformancePdfTranslation = TranslationDictionary['panelInicial']['personalPerformance']['pdf'];

const ES_DIAGNOSIS_PDF_TRANSLATION: DiagnosisPdfTranslation = {
  brandBadge: 'Reporte ejecutivo de Índice',
  fileName: 'Índice de Madurez Empresarial (IME).pdf',
  companyLabel: 'Empresa',
  companyFallback: 'Negocio actual',
  generatedLabel: 'Fecha',
  answeredLabel: 'Respondidas',
  questionsLabel: 'preguntas',
  executiveSummaryTitle: 'Resumen ejecutivo',
  executiveSummaryCaption: 'Lectura rápida del nivel actual y dónde actuar primero',
  dashboardTitle: 'Panel de madurez',
  dashboardCaption: 'Vista comparativa de pilares, nivel y brechas principales',
  totalScore: 'Puntaje total',
  maturityLevel: 'Nivel de madurez',
  strongestPillar: 'Pilar más fuerte',
  weakestPillar: 'Pilar prioritario',
  outOf100: 'de 100',
  radarTitle: 'Radar de pilares',
  progressTitle: 'Progreso de madurez',
  pillarBreakdownTitle: 'Desglose por pilar',
  pillarBreakdownCaption: 'Puntaje, lectura corta y recomendación prioritaria',
  detailedAnswersTitle: 'Respuestas detalladas',
  detailedAnswersCaption: 'Preguntas agrupadas por pilar con respuesta seleccionada y puntaje',
  recommendationLabel: 'Recomendación',
  suggestedModuleLabel: 'Módulo sugerido',
  priorityLabel: 'Prioridad',
  questionColumn: 'Pregunta',
  selectedAnswerColumn: 'Respuesta seleccionada',
  scoreColumn: 'Puntaje',
  pending: 'Pendiente',
  footerLeft: 'Índice · Reporte de diagnóstico empresarial',
  footerRight: 'Generado automáticamente desde Perfil empresarial',
  levelNames: {
    level1: 'Supervivencia',
    level2: 'Base operativa',
    level3: 'Organizado',
    level4: 'Escalable',
    level5: 'Optimizado',
  },
  progressLevels: ['Supervivencia', 'Organizado', 'Escalable', 'Optimizado'],
  moduleLabels: {
    people: 'Recursos Humanos',
    processes: 'Procesos y tareas',
    products: 'CRM / Punto de venta',
    finance: 'Gastos y KPIs',
  },
  summaryTemplate: 'Tu negocio obtiene {score}/100. {strongest} es el pilar más fuerte, mientras que {weakest} necesita atención prioritaria.',
  overallInterpretations: {
    critical: 'El negocio todavía opera de forma reactiva. La prioridad es crear control básico, responsables claros y visibilidad diaria.',
    emerging: 'Existe una base operativa, pero todavía depende de seguimiento manual. El siguiente paso es convertir hábitos en procesos repetibles.',
    organized: 'La empresa ya muestra estructura. La oportunidad está en medir mejor, cerrar brechas y preparar la operación para crecer.',
    scalable: 'El negocio funciona con buena disciplina. Conviene reforzar consistencia, indicadores y delegación para escalar con menos fricción.',
    optimized: 'La empresa muestra una operación madura. El foco debe ser sostener estándares y mejorar de forma continua.',
  },
  pillarInterpretations: {
    critical: '{section} opera con alta dependencia e improvisación. Necesita reglas simples y seguimiento visible.',
    emerging: '{section} tiene una base útil, pero aún requiere mayor consistencia y menos control manual.',
    organized: '{section} está razonablemente ordenado. El siguiente paso es medirlo y hacerlo más repetible.',
    scalable: '{section} es fuerte. Mantén visibilidad y disciplina para que no dependa de pocas personas.',
    optimized: '{section} está en un nivel muy maduro. La prioridad es sostener el estándar mientras el negocio crece.',
  },
  opportunityTemplate: 'La oportunidad inmediata está en "{question}". La respuesta seleccionada fue "{answer}".',
  incompleteOpportunity: 'Completa esta sección para obtener una oportunidad más precisa.',
  priorityActions: {
    people: [
      'Clarifica responsabilidades y rituales de seguimiento semanal.',
      'Reduce dependencia del fundador con dueños claros por área.',
    ],
    processes: [
      'Documenta los flujos más repetidos y asigna un responsable.',
      'Haz visible la ejecución para reducir seguimiento manual.',
    ],
    products: [
      'Ajusta oferta, precios y revisión de canales comerciales.',
      'Alinea ventas y entrega con una historia comercial clara.',
    ],
    finance: [
      'Aumenta visibilidad de caja, márgenes y revisión financiera.',
      'Mueve decisiones de intuición a datos simples y frecuentes.',
    ],
  },
};

const EN_DIAGNOSIS_PDF_TRANSLATION: DiagnosisPdfTranslation = {
  brandBadge: 'Indice executive report',
  fileName: 'Business Maturity Index (BMI).pdf',
  companyLabel: 'Company',
  companyFallback: 'Current business',
  generatedLabel: 'Date',
  answeredLabel: 'Answered',
  questionsLabel: 'questions',
  executiveSummaryTitle: 'Executive summary',
  executiveSummaryCaption: 'A concise read of current maturity and where to act first',
  dashboardTitle: 'Maturity dashboard',
  dashboardCaption: 'Comparative view of pillars, level, and main gaps',
  totalScore: 'Overall score',
  maturityLevel: 'Maturity level',
  strongestPillar: 'Strongest pillar',
  weakestPillar: 'Priority pillar',
  outOf100: 'out of 100',
  radarTitle: 'Pillar radar',
  progressTitle: 'Maturity progress',
  pillarBreakdownTitle: 'Pillar breakdown',
  pillarBreakdownCaption: 'Score, short interpretation, and priority recommendation',
  detailedAnswersTitle: 'Detailed answers',
  detailedAnswersCaption: 'Questions grouped by pillar with selected answer and score',
  recommendationLabel: 'Recommendation',
  suggestedModuleLabel: 'Suggested module',
  priorityLabel: 'Priority',
  questionColumn: 'Question',
  selectedAnswerColumn: 'Selected answer',
  scoreColumn: 'Score',
  pending: 'Pending',
  footerLeft: 'Indice · Business diagnosis report',
  footerRight: 'Generated automatically from Business Profile answers',
  levelNames: {
    level1: 'Survival',
    level2: 'Operating base',
    level3: 'Organized',
    level4: 'Scalable',
    level5: 'Optimized',
  },
  progressLevels: ['Survival', 'Organized', 'Scalable', 'Optimized'],
  moduleLabels: {
    people: 'Human Resources',
    processes: 'Processes and tasks',
    products: 'CRM / Point of Sale',
    finance: 'Expenses and KPIs',
  },
  summaryTemplate: 'Your business scores {score}/100. {strongest} is the strongest pillar, while {weakest} needs priority attention.',
  overallInterpretations: {
    critical: 'The business is still operating reactively. The priority is basic control, clear owners, and daily visibility.',
    emerging: 'There is an operating base, but it still relies on manual follow-up. The next step is turning habits into repeatable routines.',
    organized: 'The company shows structure. The opportunity is to measure better, close gaps, and prepare operations for growth.',
    scalable: 'The business runs with good discipline. Reinforce consistency, indicators, and delegation to scale with less friction.',
    optimized: 'The company shows a mature operating model. The focus should be sustaining standards and continuous improvement.',
  },
  pillarInterpretations: {
    critical: '{section} operates with high dependency and improvisation. It needs simple rules and visible follow-up.',
    emerging: '{section} has a useful base, but still needs stronger consistency and less manual control.',
    organized: '{section} is reasonably structured. The next step is measuring it and making it more repeatable.',
    scalable: '{section} is strong. Keep visibility and discipline high so it does not depend on a few people.',
    optimized: '{section} is highly mature. The priority is sustaining the standard while the business grows.',
  },
  opportunityTemplate: 'The immediate opportunity is "{question}". The selected answer was "{answer}".',
  incompleteOpportunity: 'Complete this section to generate a more precise opportunity.',
  priorityActions: {
    people: [
      'Clarify responsibilities and weekly accountability rituals.',
      'Reduce founder dependency with clear owners by area.',
    ],
    processes: [
      'Document the most repeated workflows and assign an owner.',
      'Make execution visible to reduce manual follow-up.',
    ],
    products: [
      'Sharpen offer, pricing, and channel performance review.',
      'Align sales and delivery with a clearer commercial story.',
    ],
    finance: [
      'Increase visibility on cash, margins, and financial reviews.',
      'Move decisions from intuition to simple and frequent data.',
    ],
  },
};

const ES_PERFORMANCE_PDF_TRANSLATION: PerformancePdfTranslation = {
  brandBadge: 'Reporte ejecutivo de Índice',
  fileName: 'Índice de Rendimiento Personal (IRP).pdf',
  userLabel: 'Persona',
  userFallback: 'Usuario actual',
  generatedLabel: 'Fecha',
  answeredLabel: 'Respondidas',
  questionsLabel: 'preguntas',
  executiveSummaryTitle: 'Resumen ejecutivo',
  executiveSummaryCaption: 'Lectura rápida del rendimiento personal y dónde mejorar primero',
  dashboardTitle: 'Panel de rendimiento',
  dashboardCaption: 'Vista comparativa de energía, claridad, recuperación y sostenibilidad',
  totalScore: 'Puntaje total',
  performanceLevel: 'Nivel de rendimiento',
  strongestArea: 'Área más fuerte',
  weakestArea: 'Área prioritaria',
  outOf100: 'de 100',
  radarTitle: 'Radar personal',
  progressTitle: 'Progreso de rendimiento',
  sectionBreakdownTitle: 'Desglose por sección',
  sectionBreakdownCaption: 'Puntaje, lectura corta y recomendación prioritaria',
  detailedAnswersTitle: 'Respuestas detalladas',
  detailedAnswersCaption: 'Preguntas agrupadas por sección con respuesta seleccionada y puntaje',
  recommendationLabel: 'Recomendación',
  suggestedFocusLabel: 'Foco sugerido',
  priorityLabel: 'Prioridad',
  questionColumn: 'Pregunta',
  selectedAnswerColumn: 'Respuesta seleccionada',
  scoreColumn: 'Puntaje',
  pending: 'Pendiente',
  footerLeft: 'Índice · Reporte de rendimiento personal',
  footerRight: 'Generado automáticamente desde Rendimiento personal',
  levelNames: {
    level1: 'Crítico',
    level2: 'Inestable',
    level3: 'Funcional',
    level4: 'Saludable',
    level5: 'Alto rendimiento',
  },
  progressLevels: ['Crítico', 'Funcional', 'Saludable', 'Alto rendimiento'],
  focusLabels: {
    sleep_recovery: 'Rutina de sueño y recuperación',
    nutrition_energy: 'Nutrición, hidratación y movimiento',
    stress_clarity: 'Reducción de carga mental y claridad',
    balance_sustainability: 'Límites y sostenibilidad',
  },
  summaryTemplate: 'Tu índice personal es {score}/100. {strongest} es el área más fuerte, mientras que {weakest} necesita atención prioritaria.',
  overallInterpretations: {
    critical: 'Los hábitos actuales están afectando el rendimiento. La prioridad es recuperar energía y reducir fricción diaria.',
    emerging: 'Hay señales de inestabilidad. Conviene reforzar rutinas básicas antes de aumentar responsabilidades.',
    organized: 'El rendimiento es funcional. Pequeños ajustes pueden mejorar claridad, energía y consistencia.',
    scalable: 'Los hábitos sostienen un buen rendimiento. El foco es proteger estabilidad bajo presión.',
    optimized: 'La condición personal sostiene un rendimiento alto. La prioridad es mantener el estándar mientras crecen las responsabilidades.',
  },
  sectionInterpretations: {
    critical: '{section} está en estado crítico y probablemente reduce consistencia diaria.',
    emerging: '{section} es inestable. Reforzar rutinas aquí puede mejorar energía y claridad.',
    organized: '{section} funciona, pero todavía hay oportunidades de mejora simples.',
    scalable: '{section} está saludable. Conviene proteger esta fortaleza bajo presión.',
    optimized: '{section} muestra alto rendimiento. El reto es sostenerlo con el tiempo.',
  },
  opportunityTemplate: 'La oportunidad inmediata está en "{question}". La respuesta seleccionada fue "{answer}".',
  incompleteOpportunity: 'Completa esta sección para obtener una oportunidad más precisa.',
  priorityActions: {
    sleep_recovery: [
      'Mejora tu rutina de cierre y reduce trabajo nocturno.',
      'Protege recuperación después de días demandantes.',
    ],
    nutrition_energy: [
      'Estabiliza comidas e hidratación para reducir altibajos de energía.',
      'Agrega pausas breves de movimiento durante el trabajo.',
    ],
    stress_clarity: [
      'Reduce sobrecarga agrupando tareas y delegando recurrencias.',
      'Crea una rutina de cierre para dejar de cargar trabajo mentalmente.',
    ],
    balance_sustainability: [
      'Bloquea tiempo protegido para vida personal y recuperación real.',
      'Reduce dependencia de presencia constante con sistemas repetibles.',
    ],
  },
};

const EN_PERFORMANCE_PDF_TRANSLATION: PerformancePdfTranslation = {
  brandBadge: 'Indice executive report',
  fileName: 'Personal Performance Index (PPI).pdf',
  userLabel: 'Person',
  userFallback: 'Current user',
  generatedLabel: 'Date',
  answeredLabel: 'Answered',
  questionsLabel: 'questions',
  executiveSummaryTitle: 'Executive summary',
  executiveSummaryCaption: 'A concise read of personal performance and where to improve first',
  dashboardTitle: 'Performance dashboard',
  dashboardCaption: 'Comparative view of energy, clarity, recovery, and sustainability',
  totalScore: 'Overall score',
  performanceLevel: 'Performance level',
  strongestArea: 'Strongest area',
  weakestArea: 'Priority area',
  outOf100: 'out of 100',
  radarTitle: 'Personal radar',
  progressTitle: 'Performance progress',
  sectionBreakdownTitle: 'Section breakdown',
  sectionBreakdownCaption: 'Score, short interpretation, and priority recommendation',
  detailedAnswersTitle: 'Detailed answers',
  detailedAnswersCaption: 'Questions grouped by section with selected answer and score',
  recommendationLabel: 'Recommendation',
  suggestedFocusLabel: 'Suggested focus',
  priorityLabel: 'Priority',
  questionColumn: 'Question',
  selectedAnswerColumn: 'Selected answer',
  scoreColumn: 'Score',
  pending: 'Pending',
  footerLeft: 'Indice · Personal performance report',
  footerRight: 'Generated automatically from Personal Performance answers',
  levelNames: {
    level1: 'Critical',
    level2: 'Unstable',
    level3: 'Functional',
    level4: 'Healthy',
    level5: 'High performance',
  },
  progressLevels: ['Critical', 'Functional', 'Healthy', 'High performance'],
  focusLabels: {
    sleep_recovery: 'Sleep routine and recovery',
    nutrition_energy: 'Nutrition, hydration, and movement',
    stress_clarity: 'Overload reduction and clarity',
    balance_sustainability: 'Boundaries and sustainability',
  },
  summaryTemplate: 'Your personal index is {score}/100. {strongest} is the strongest area, while {weakest} needs priority attention.',
  overallInterpretations: {
    critical: 'Current habits are affecting performance. The priority is restoring energy and reducing daily friction.',
    emerging: 'There are signs of instability. Reinforce basic routines before increasing responsibilities.',
    organized: 'Performance is functional. Small adjustments can improve clarity, energy, and consistency.',
    scalable: 'Habits support good performance. The focus is protecting stability under pressure.',
    optimized: 'Personal condition supports high performance. The priority is maintaining standards as responsibilities grow.',
  },
  sectionInterpretations: {
    critical: '{section} is in a critical state and likely reduces daily consistency.',
    emerging: '{section} is unstable. Strengthening routines here can improve energy and clarity.',
    organized: '{section} is functional, but there are still simple improvement opportunities.',
    scalable: '{section} is healthy. Protect this strength under pressure.',
    optimized: '{section} shows high performance. The challenge is sustaining it over time.',
  },
  opportunityTemplate: 'The immediate opportunity is "{question}". The selected answer was "{answer}".',
  incompleteOpportunity: 'Complete this section to generate a more precise opportunity.',
  priorityActions: {
    sleep_recovery: [
      'Improve your shutdown routine and reduce late-night work.',
      'Protect recovery after demanding days.',
    ],
    nutrition_energy: [
      'Stabilize meals and hydration to reduce energy volatility.',
      'Add short movement breaks during work.',
    ],
    stress_clarity: [
      'Reduce overload by batching work and delegating recurring tasks.',
      'Create a shutdown routine to stop carrying work mentally.',
    ],
    balance_sustainability: [
      'Protect time blocks for personal life and real recovery.',
      'Reduce dependency on constant presence with repeatable systems.',
    ],
  },
};

const DIAGNOSIS_PDF_TRANSLATIONS: Record<string, DiagnosisPdfTranslation> = {
  'es-MX': ES_DIAGNOSIS_PDF_TRANSLATION,
  'es-CO': ES_DIAGNOSIS_PDF_TRANSLATION,
  'en-US': EN_DIAGNOSIS_PDF_TRANSLATION,
  'en-CA': EN_DIAGNOSIS_PDF_TRANSLATION,
  'fr-CA': EN_DIAGNOSIS_PDF_TRANSLATION,
  'pt-BR': EN_DIAGNOSIS_PDF_TRANSLATION,
  'ko-CA': EN_DIAGNOSIS_PDF_TRANSLATION,
  'zh-CA': EN_DIAGNOSIS_PDF_TRANSLATION,
};

const PERFORMANCE_PDF_TRANSLATIONS: Record<string, PerformancePdfTranslation> = {
  'es-MX': ES_PERFORMANCE_PDF_TRANSLATION,
  'es-CO': ES_PERFORMANCE_PDF_TRANSLATION,
  'en-US': EN_PERFORMANCE_PDF_TRANSLATION,
  'en-CA': EN_PERFORMANCE_PDF_TRANSLATION,
  'fr-CA': EN_PERFORMANCE_PDF_TRANSLATION,
  'pt-BR': EN_PERFORMANCE_PDF_TRANSLATION,
  'ko-CA': EN_PERFORMANCE_PDF_TRANSLATION,
  'zh-CA': EN_PERFORMANCE_PDF_TRANSLATION,
};

type PersonalPerformanceTranslation = TranslationDictionary['panelInicial']['personalPerformance'];

const ES_PERSONAL_PERFORMANCE_TRANSLATION: PersonalPerformanceTranslation = {
  title: 'Índice de rendimiento personal (PPI)',
  description: 'Mide hábitos y condiciones de bienestar que influyen en un rendimiento sostenible.',
  centerTitle: 'Centro de rendimiento personal',
  centerDescription: 'Completa las 4 secciones para entender recuperación, energía, claridad y sostenibilidad en el tiempo.',
  questionCount: '10 preguntas cada una',
  questionCountLabel: 'La evaluación contiene',
  progress: 'Progreso de rendimiento personal',
  progressOf: 'completado',
  printReport: 'Descargar PDF',
  restart: 'Reiniciar sección',
  onboarding: {
    answeredProgress: 'Has respondido {answered} de {total} preguntas',
    encouragementMid: 'Vas muy bien',
    encouragementNear: 'Ya casi terminas',
    sections: {
      sleep_recovery: {
        title: 'Paso 1 — Sueño y recuperación',
        intro: 'Entendamos cómo tu descanso sostiene tu trabajo diario',
        done: 'Listo — entendemos mejor tu recuperación',
      },
      nutrition_energy: {
        title: 'Paso 2 — Energía y nutrición',
        intro: 'Entendamos cómo se mantiene tu energía durante el día',
        done: 'Listo — entendemos mejor tu energía',
      },
      stress_clarity: {
        title: 'Paso 3 — Estrés y claridad mental',
        intro: 'Entendamos cómo la carga mental afecta tu claridad',
        done: 'Listo — entendemos mejor tu claridad',
      },
      balance_sustainability: {
        title: 'Paso 4 — Balance y sostenibilidad',
        intro: 'Entendamos si tu rutina puede sostenerse en el tiempo',
        done: 'Listo — entendemos mejor tu balance',
      },
    },
  },
  pdf: PERFORMANCE_PDF_TRANSLATIONS['es-MX'],
  messages: {
    loading: 'Cargando rendimiento personal...',
    loadError: 'No pudimos cargar el rendimiento personal.',
    saveSuccess: 'Rendimiento personal guardado.',
    saveError: 'No pudimos guardar el rendimiento personal.',
    unsavedChanges: 'Tienes cambios sin guardar en rendimiento personal.',
  },
  sections: {
    sleep_recovery: {
      title: 'Sueño y recuperación',
      description: 'Calidad del sueño, recuperación constante y riesgo de fatiga.',
    },
    nutrition_energy: {
      title: 'Nutrición y energía física',
      description: 'Alimentación, hidratación, movimiento y estabilidad de energía.',
    },
    stress_clarity: {
      title: 'Estrés y claridad mental',
      description: 'Carga emocional, ansiedad, fatiga mental y claridad para decidir.',
    },
    balance_sustainability: {
      title: 'Balance y sostenibilidad',
      description: 'Balance vida-trabajo, riesgo de agotamiento y sostenibilidad a largo plazo.',
    },
  },
  questions: {
    sleep_recovery: [
      { question: '¿Cuántas horas duermes normalmente por noche?', options: ['Menos de 5', '5 a 6', '6 a 7', '7 a 8+'] },
      { question: '¿Con qué frecuencia despiertas sintiéndote descansado?', options: ['Nunca', 'Rara vez', 'A menudo', 'Casi siempre'] },
      { question: '¿Qué tan regular es tu horario de sueño?', options: ['Totalmente irregular', 'Algo irregular', 'Mayormente regular', 'Muy regular'] },
      { question: '¿Con qué frecuencia te despiertas durante la noche?', options: ['Muy seguido', 'A veces', 'Rara vez', 'Casi nunca'] },
      { question: '¿Con qué frecuencia usas tu celular o laptop justo antes de dormir?', options: ['Siempre', 'A menudo', 'A veces', 'Rara vez/Nunca'] },
      { question: '¿Con qué frecuencia sientes sueño durante el día laboral?', options: ['Constantemente', 'Frecuentemente', 'A veces', 'Rara vez'] },
      { question: '¿Con qué frecuencia descansas bien en fines de semana o días libres?', options: ['Nunca', 'Rara vez', 'A veces', 'Normalmente'] },
      { question: '¿Qué tan rápido te recuperas después de un día exigente?', options: ['Muy mal', 'Lentamente', 'Razonablemente bien', 'Muy bien'] },
      { question: '¿Con qué frecuencia trabajas tarde en la noche?', options: ['Casi todos los días', 'Varias veces por semana', 'Ocasionalmente', 'Rara vez'] },
      { question: '¿Cómo calificarías tu calidad de sueño general?', options: ['Muy mala', 'Mala', 'Buena', 'Muy buena'] },
    ],
    nutrition_energy: [
      { question: '¿Cuántas comidas completas sueles hacer al día?', options: ['Una o menos', 'Dos', 'Tres', 'Tres o más de forma constante'] },
      { question: '¿Con qué frecuencia omites el desayuno o tu primera comida?', options: ['Siempre', 'A menudo', 'A veces', 'Rara vez/Nunca'] },
      { question: '¿Con qué frecuencia comes comida procesada o rápida?', options: ['Diario', 'Varias veces por semana', 'Ocasionalmente', 'Rara vez'] },
      { question: '¿Cuánta agua sueles tomar al día?', options: ['Muy poca', 'Menos de lo recomendado', 'Casi suficiente', 'Suficiente de forma constante'] },
      { question: '¿Con qué frecuencia comes frutas o verduras?', options: ['Casi nunca', 'A veces', 'Frecuentemente', 'Diario'] },
      { question: '¿Qué tan estable es tu energía durante el día?', options: ['Muy inestable', 'Algo inestable', 'Mayormente estable', 'Muy estable'] },
      { question: '¿Con qué frecuencia haces ejercicio o te mueves intencionalmente?', options: ['Nunca', '1 vez por semana', '2-3 veces por semana', '4+ veces por semana'] },
      { question: '¿Cuánto tiempo permaneces sentado sin pausas durante el trabajo?', options: ['Casi todo el día', 'Periodos largos', 'Periodos moderados', 'Hago pausas activas frecuentes'] },
      { question: '¿Con qué frecuencia te sientes físicamente pesado o lento mientras trabajas?', options: ['Constantemente', 'Frecuentemente', 'A veces', 'Rara vez'] },
      { question: '¿Cómo calificarías tu energía física general?', options: ['Muy baja', 'Baja', 'Buena', 'Alta'] },
    ],
    stress_clarity: [
      { question: '¿Con qué frecuencia te sientes abrumado por el trabajo?', options: ['Constantemente', 'Frecuentemente', 'A veces', 'Rara vez'] },
      { question: '¿Con qué frecuencia te sientes mentalmente saturado?', options: ['Todos los días', 'Varias veces por semana', 'Ocasionalmente', 'Rara vez'] },
      { question: '¿Qué tan fácil te resulta concentrarte en una tarea a la vez?', options: ['Muy difícil', 'Difícil', 'Manejable', 'Fácil'] },
      { question: '¿Con qué frecuencia sientes ansiedad por responsabilidades de trabajo?', options: ['Constantemente', 'Frecuentemente', 'A veces', 'Rara vez'] },
      { question: '¿Qué tan claro te sientes al tomar decisiones importantes?', options: ['Muy poco claro', 'Algo poco claro', 'Mayormente claro', 'Muy claro'] },
      { question: '¿Con qué frecuencia llevas problemas del trabajo a tu tiempo personal?', options: ['Siempre', 'A menudo', 'A veces', 'Rara vez'] },
      { question: '¿Qué tan bien puedes desconectarte mentalmente del trabajo?', options: ['No puedo desconectarme', 'Me cuesta', 'A veces puedo', 'Puedo hacerlo bien'] },
      { question: '¿Con qué frecuencia los asuntos pequeños se sienten más grandes de lo que son?', options: ['Muy seguido', 'A menudo', 'A veces', 'Rara vez'] },
      { question: '¿Qué tan apoyado te sientes emocionalmente en tu vida laboral actual?', options: ['Nada apoyado', 'Poco apoyado', 'Moderadamente apoyado', 'Bien apoyado'] },
      { question: '¿Cómo calificarías tu claridad mental general?', options: ['Muy mala', 'Mala', 'Buena', 'Muy buena'] },
    ],
    balance_sustainability: [
      { question: '¿Cuántos días a la semana trabajas?', options: ['7 días', '6 días', '5-6 días con algo de balance', '5 días o horario equilibrado'] },
      { question: '¿Con qué frecuencia trabajas en fines de semana?', options: ['Todos los fines de semana', 'La mayoría de fines de semana', 'A veces', 'Rara vez/Nunca'] },
      { question: '¿Tienes tiempo durante la semana para vida personal o hobbies?', options: ['Nunca', 'Rara vez', 'A veces', 'De forma constante'] },
      { question: '¿Con qué frecuencia sientes culpa al descansar?', options: ['Siempre', 'A menudo', 'A veces', 'Rara vez'] },
      { question: '¿Qué tan sostenible se siente tu rutina actual?', options: ['Nada sostenible', 'Difícil de sostener', 'Mayormente sostenible', 'Muy sostenible'] },
      { question: '¿Con qué frecuencia tomas descansos reales durante el día laboral?', options: ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'] },
      { question: '¿Con qué frecuencia tomas vacaciones o días de recuperación?', options: ['Nunca', 'Rara vez', 'Ocasionalmente', 'Regularmente'] },
      { question: '¿Qué tanto depende tu trabajo de tu presencia constante?', options: ['Dependencia completa', 'Alta dependencia', 'Dependencia moderada', 'Baja dependencia'] },
      { question: '¿Con qué frecuencia te sientes cerca del agotamiento?', options: ['Constantemente', 'Frecuentemente', 'A veces', 'Rara vez'] },
      { question: '¿Cómo calificarías tu balance vida-trabajo general?', options: ['Muy malo', 'Malo', 'Bueno', 'Muy bueno'] },
    ],
  },
};

const EN_PERSONAL_PERFORMANCE_TRANSLATION: PersonalPerformanceTranslation = {
  title: 'Personal Performance Index (PPI)',
  description: 'Measures habits and wellbeing conditions that affect sustainable work performance.',
  centerTitle: 'Personal Performance Center',
  centerDescription: 'Complete the 4 sections to understand recovery, energy, clarity, and sustainability over time.',
  questionCount: '10 questions each',
  questionCountLabel: 'The assessment contains',
  progress: 'Personal performance progress',
  progressOf: 'completed',
  printReport: 'Download PDF',
  restart: 'Restart section',
  onboarding: {
    answeredProgress: 'You\'ve answered {answered} of {total} questions',
    encouragementMid: 'You\'re making great progress',
    encouragementNear: 'Almost done',
    sections: {
      sleep_recovery: {
        title: 'Step 1 — Sleep & recovery',
        intro: 'Let\'s understand how your recovery supports your daily work',
        done: 'Done — we understand your recovery',
      },
      nutrition_energy: {
        title: 'Step 2 — Energy & nutrition',
        intro: 'Let\'s understand how your energy holds during the day',
        done: 'Done — we understand your energy',
      },
      stress_clarity: {
        title: 'Step 3 — Stress & mental clarity',
        intro: 'Let\'s understand how mental load affects your clarity',
        done: 'Done — we understand your clarity',
      },
      balance_sustainability: {
        title: 'Step 4 — Balance & sustainability',
        intro: 'Let\'s understand whether your routine can stay sustainable over time',
        done: 'Done — we understand your balance',
      },
    },
  },
  pdf: PERFORMANCE_PDF_TRANSLATIONS['en-US'],
  messages: {
    loading: 'Loading personal performance...',
    loadError: 'We could not load personal performance.',
    saveSuccess: 'Personal performance saved.',
    saveError: 'We could not save personal performance.',
    unsavedChanges: 'You have unsaved changes in personal performance.',
  },
  sections: {
    sleep_recovery: {
      title: 'Sleep & Recovery',
      description: 'Sleep quality, recovery consistency, and fatigue risk.',
    },
    nutrition_energy: {
      title: 'Nutrition & Physical Energy',
      description: 'Fueling, hydration, movement, and energy stability.',
    },
    stress_clarity: {
      title: 'Stress & Mental Clarity',
      description: 'Emotional load, anxiety, mental fatigue, and clarity for decisions.',
    },
    balance_sustainability: {
      title: 'Balance & Sustainability',
      description: 'Work-life balance, burnout risk, and long-term sustainability.',
    },
  },
  questions: {
    sleep_recovery: [
      { question: 'How many hours do you usually sleep per night?', options: ['Less than 5', '5 to 6', '6 to 7', '7 to 8+'] },
      { question: 'How often do you wake up feeling rested?', options: ['Never', 'Rarely', 'Often', 'Almost always'] },
      { question: 'How regular is your sleep schedule?', options: ['Totally irregular', 'Somewhat irregular', 'Mostly regular', 'Very regular'] },
      { question: 'How often do you wake up during the night?', options: ['Very often', 'Sometimes', 'Rarely', 'Almost never'] },
      { question: 'How often do you use your phone or laptop right before sleeping?', options: ['Always', 'Often', 'Sometimes', 'Rarely/Never'] },
      { question: 'How often do you feel sleepy during the workday?', options: ['Constantly', 'Frequently', 'Sometimes', 'Rarely'] },
      { question: 'How often do you rest properly on weekends or days off?', options: ['Never', 'Rarely', 'Sometimes', 'Usually'] },
      { question: 'How quickly do you recover after a demanding workday?', options: ['Very poorly', 'Slowly', 'Reasonably well', 'Very well'] },
      { question: 'How often do you work late at night?', options: ['Almost every day', 'Several times a week', 'Occasionally', 'Rarely'] },
      { question: 'How would you rate your overall sleep quality?', options: ['Very poor', 'Poor', 'Good', 'Very good'] },
    ],
    nutrition_energy: [
      { question: 'How many complete meals do you usually eat per day?', options: ['One or fewer', 'Two', 'Three', 'Three or more, consistently'] },
      { question: 'How often do you skip breakfast or your first meal?', options: ['Always', 'Often', 'Sometimes', 'Rarely/Never'] },
      { question: 'How often do you eat processed or fast food?', options: ['Daily', 'Several times a week', 'Occasionally', 'Rarely'] },
      { question: 'How much water do you usually drink per day?', options: ['Very little', 'Less than recommended', 'Close to enough', 'Enough consistently'] },
      { question: 'How often do you eat fruits or vegetables?', options: ['Almost never', 'Sometimes', 'Frequently', 'Daily'] },
      { question: 'How stable is your energy during the day?', options: ['Very unstable', 'Somewhat unstable', 'Mostly stable', 'Very stable'] },
      { question: 'How often do you exercise or move intentionally?', options: ['Never', '1 time per week', '2-3 times per week', '4+ times per week'] },
      { question: 'How long do you stay seated without breaks during work?', options: ['Almost all day', 'Long periods', 'Moderate periods', 'I take regular active breaks'] },
      { question: 'How often do you feel physically heavy or sluggish while working?', options: ['Constantly', 'Frequently', 'Sometimes', 'Rarely'] },
      { question: 'How would you rate your physical energy overall?', options: ['Very low', 'Low', 'Good', 'High'] },
    ],
    stress_clarity: [
      { question: 'How often do you feel overwhelmed by work?', options: ['Constantly', 'Frequently', 'Sometimes', 'Rarely'] },
      { question: 'How often do you feel mentally saturated?', options: ['Every day', 'Several times a week', 'Occasionally', 'Rarely'] },
      { question: 'How easy is it for you to focus on one task at a time?', options: ['Very difficult', 'Difficult', 'Manageable', 'Easy'] },
      { question: 'How often do you feel anxious because of work responsibilities?', options: ['Constantly', 'Frequently', 'Sometimes', 'Rarely'] },
      { question: 'How clear do you feel when making important decisions?', options: ['Very unclear', 'Somewhat unclear', 'Mostly clear', 'Very clear'] },
      { question: 'How often do you carry work problems into personal time?', options: ['Always', 'Often', 'Sometimes', 'Rarely'] },
      { question: 'How well can you disconnect mentally from work?', options: ['I cannot disconnect', 'It is difficult', 'I can sometimes', 'I can do it well'] },
      { question: 'How often do small issues feel bigger than they should?', options: ['Very often', 'Often', 'Sometimes', 'Rarely'] },
      { question: 'How supported do you feel emotionally in your current work life?', options: ['Not supported at all', 'Slightly supported', 'Moderately supported', 'Well supported'] },
      { question: 'How would you rate your mental clarity overall?', options: ['Very poor', 'Poor', 'Good', 'Very good'] },
    ],
    balance_sustainability: [
      { question: 'How many days per week do you work?', options: ['7 days', '6 days', '5-6 days with some balance', '5 days or balanced schedule'] },
      { question: 'How often do you work on weekends?', options: ['Every weekend', 'Most weekends', 'Sometimes', 'Rarely/Never'] },
      { question: 'Do you have time during the week for personal life or hobbies?', options: ['Never', 'Rarely', 'Sometimes', 'Consistently'] },
      { question: 'How often do you feel guilty when resting?', options: ['Always', 'Often', 'Sometimes', 'Rarely'] },
      { question: 'How sustainable does your current routine feel?', options: ['Not sustainable at all', 'Hard to sustain', 'Mostly sustainable', 'Very sustainable'] },
      { question: 'How often do you take real breaks during the workday?', options: ['Never', 'Rarely', 'Sometimes', 'Frequently'] },
      { question: 'How often do you take vacations or recovery days?', options: ['Never', 'Rarely', 'Occasionally', 'Regularly'] },
      { question: 'How dependent is your work on your constant presence?', options: ['Completely dependent', 'Highly dependent', 'Moderately dependent', 'Low dependency'] },
      { question: 'How often do you feel close to burnout?', options: ['Constantly', 'Frequently', 'Sometimes', 'Rarely'] },
      { question: 'How would you rate your life-work balance overall?', options: ['Very poor', 'Poor', 'Good', 'Very good'] },
    ],
  },
};

const PERSONAL_PERFORMANCE_TRANSLATIONS: Record<string, PersonalPerformanceTranslation> = {
  'es-MX': ES_PERSONAL_PERFORMANCE_TRANSLATION,
  'es-CO': ES_PERSONAL_PERFORMANCE_TRANSLATION,
  'en-US': EN_PERSONAL_PERFORMANCE_TRANSLATION,
  'en-CA': EN_PERSONAL_PERFORMANCE_TRANSLATION,
  'fr-CA': EN_PERSONAL_PERFORMANCE_TRANSLATION,
  'pt-BR': EN_PERSONAL_PERFORMANCE_TRANSLATION,
  'ko-CA': EN_PERSONAL_PERFORMANCE_TRANSLATION,
  'zh-CA': EN_PERSONAL_PERFORMANCE_TRANSLATION,
};

type UsersBusinessStructureTranslation = TranslationDictionary['panelInicial']['users']['businessStructure'];

const ES_USERS_BUSINESS_STRUCTURE_TRANSLATION: UsersBusinessStructureTranslation = {
  businessUnit: 'Unidad de negocio',
  business: 'Negocio',
  team: 'Equipo',
  person: 'persona',
  people: 'personas',
  module: 'módulo',
  modules: 'módulos',
  empty: '-',
  selectBusinessUnit: 'Selecciona una unidad',
  selectBusiness: 'Selecciona un negocio',
  noBusinessOptions: 'Sin negocios disponibles',
  unitOptions: [
    { value: 'main-unit', label: 'Unidad principal' },
    { value: 'operations', label: 'Operaciones' },
    { value: 'sales', label: 'Ventas' },
    { value: 'administration', label: 'Administración' },
  ],
};

const EN_USERS_BUSINESS_STRUCTURE_TRANSLATION: UsersBusinessStructureTranslation = {
  businessUnit: 'Business Unit',
  business: 'Business',
  team: 'Team',
  person: 'person',
  people: 'people',
  module: 'module',
  modules: 'modules',
  empty: '-',
  selectBusinessUnit: 'Select a unit',
  selectBusiness: 'Select a business',
  noBusinessOptions: 'No businesses available',
  unitOptions: [
    { value: 'main-unit', label: 'Main unit' },
    { value: 'operations', label: 'Operations' },
    { value: 'sales', label: 'Sales' },
    { value: 'administration', label: 'Administration' },
  ],
};

const USERS_BUSINESS_STRUCTURE_TRANSLATIONS: Record<string, UsersBusinessStructureTranslation> = {
  'es-MX': ES_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'es-CO': ES_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'en-US': EN_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'en-CA': EN_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'fr-CA': EN_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'pt-BR': EN_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'ko-CA': EN_USERS_BUSINESS_STRUCTURE_TRANSLATION,
  'zh-CA': EN_USERS_BUSINESS_STRUCTURE_TRANSLATION,
};

const translations: Translations = {
  'es-MX': {
    header: {
      notifications: 'Notificaciones',
      profile: 'Mi perfil',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
      learningMode: 'Ruta operativa',
    },
    sections: {
      kpis: 'Tus KPIs',
      favorites: 'Tus favoritos',
      quickAccess: 'Accesos rápidos',
      basicModules: 'Módulos básicos',
      main: 'Principales',
      complementaryModules: 'Módulos complementarios',
      additional: 'Adicionales',
      aiModules: 'Inteligencia artificial',
      aiLabel: 'Módulos de IA',
      configureKpis: 'Configurar KPIs',
    },
    kpis: {
      weeklyRevenue: 'Ventas Semanales',
      netProfit: 'Utilidad Neta',
      activeClients: 'Clientes Activos',
      activeEmployees: 'Empleados Activos',
      pendingTasks: 'Tareas Pendientes',
      monthlyExpenses: 'Gastos del Mes',
      vsWeekBefore: 'vs semana anterior',
      thisMonth: 'este mes',
      newOnes: 'nuevos',
      dueToday: 'vencen hoy',
      vsMonthBefore: 'vs mes anterior',
    },
    modules: {
      panelInicial: 'Panel Inicial',
      recursosHumanos: 'Recursos Humanos',
      procesosTareas: 'Procesos y tareas',
      gastos: 'Gastos',
      cajaChica: 'Caja chica',
      puntoVenta: 'Punto de venta',
      ventas: 'Ventas',
      cartera: 'Cartera',
      kpis: 'KPIs',
      mantenimiento: 'Mantenimiento',
      inventarios: 'Inventarios',
      controlMinutas: 'Control de minutas',
      limpieza: 'Limpieza',
      lavanderia: 'Lavandería',
      transportacion: 'Transportación',
      vehiculosMaquinaria: 'Vehículos y maquinaria',
      inmuebles: 'Inmuebles',
      formularios: 'Formularios',
      facturacion: 'Facturación',
      correoElectronico: 'Correo electrónico',
      climaLaboral: 'Clima laboral',
      afiliados: 'Afiliados',
      indiceAgenteVentas: 'Índice Agente de Ventas',
      indiceAnalitica: 'Índice Analítica',
      capacitacion: 'Capacitación',
      indiceCoach: 'Índice Coach',
    },
    notifications: {
      newTask: 'Nueva tarea asignada',
      expensePending: 'Gasto pendiente de aprobar',
      newClient: 'Nuevo cliente registrado',
      timeAgo: {
        minutes: 'Hace 5 minutos',
        hour: 'Hace 1 hora',
        hours: 'Hace 2 horas',
      },
    },
	    loginPage: {
	      logoAlt: 'Logo de Indice',
	      workspaceBadge: 'Claridad operacional',
	      accessBadge: 'Acceso Indice',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Marco operativo Indice',
	      title: 'Opera tu negocio con claridad.',
	      subtitle:
	        'Conecta personas, procesos, productos y finanzas en un espacio operativo diseñado para empresas en crecimiento.',
	      pillars: [
	        {
	          icon: '👥',
	          title: 'Personas',
	          description: 'Equipos, responsabilidades y actividad diaria con mayor visibilidad.',
	        },
	        {
	          icon: '⚙️',
	          title: 'Procesos',
	          description: 'Flujos claros para ejecutar, dar seguimiento y reducir desorden.',
	        },
	        {
	          icon: '📦',
	          title: 'Productos',
	          description: 'Catálogos, operación comercial e inventario conectados al negocio.',
	        },
	        {
	          icon: '📊',
	          title: 'Finanzas',
	          description: 'Control financiero y lectura operativa para decidir mejor.',
	        },
	      ],
	      featureCards: [
	        {
	          title: 'Visibilidad operativa',
	          description: 'Entiende qué está pasando en cada área del negocio.',
	        },
	        {
	          title: 'Control empresarial',
	          description: 'Centraliza la ejecución y reduce el caos operativo.',
	        },
	        {
	          title: 'Mejores decisiones',
	          description: 'Convierte la actividad diaria en señales claras para actuar.',
	        },
	      ],
	      visualTitle: 'Crecimiento estructurado',
	      visualSubtitle:
	        'Indice organiza la operación en pilares conectados para que cada equipo trabaje con contexto y dirección.',
	      visualMetricValue: '4',
	      visualMetricLabel: 'pilares conectados',
	      visualSignalLabel: 'Sistema operativo',
	      welcomeTitle: 'Accede a tu espacio operativo',
	      welcomeText:
	        'Continúa la ejecución diaria con visibilidad, control y contexto de negocio.',
	      emailLabel: 'Correo electrónico',
	      emailPlaceholder: 'tu@empresa.com',
	      emailError: 'Ingresa un correo electrónico válido.',
	      passwordLabel: 'Contraseña',
	      passwordPlaceholder: 'Escribe tu contraseña',
	      forgotPassword: '¿Olvidaste tu contraseña?',
	      hidePassword: 'Ocultar contraseña',
	      showPassword: 'Mostrar contraseña',
	      signIn: 'Iniciar sesión',
	      signingIn: 'Ingresando...',
	      successToast: 'Sesión iniciada correctamente.',
	      errorFallback: 'No fue posible iniciar sesión.',
	      insideTitle: 'Lo que tendrás disponible',
	      insideItems: ['Visibilidad operativa', 'Actividad del equipo', 'Control financiero', 'Desempeño del negocio'],
	      resetBadge: 'Recuperación de acceso',
	      resetTitle: 'Restablece tu contraseña',
	      resetDescription:
	        'Ingresa el correo de tu cuenta. Si existe, enviaremos un enlace de recuperación con vigencia limitada.',
	      resetCloseLabel: 'Cerrar recuperación de contraseña',
	      resetCancel: 'Cancelar',
	      resetSubmit: 'Enviar enlace',
	      resetSubmitting: 'Enviando enlace...',
	      resetSuccessFallback: 'Si ese correo existe, se envió un enlace para restablecer la contraseña.',
	      resetErrorFallback: 'No fue posible enviar la solicitud de recuperación.',
	    },
    learningMode: {
      welcome: '¡Bienvenido al modo de aprendizaje!',
      hide: 'Ocultar',
      show: 'Mostrar',
      businessBase: 'Base de negocios',
      clearBusinessStable: 'Limpiar base de negocios estable',
      functions: 'Funciones',
      businessContext: 'Contexto de negocio',
      indiceMethodology: 'Metodología Índice',
      addModule: 'Abrir',
      viewBasicModules: 'Ver módulos básicos',
      previous: 'Anterior',
      next: 'Siguiente',
      stepOf: 'Paso de',
      modules: {
        panelInicial: {
          title: 'Panel Inicial',
          subtitle: '🎯 Tu punto de partida',
          description: 'El Panel Inicial es el punto de partida para organizar tu empresa dentro del sistema Índice. 🏢 Aquí defines la información básica de tu negocio y configuras la estructura que permitirá que todos los demás módulos funcionen correctamente. ✨ Cuando esta base está bien configurada, el sistema puede ayudarte a gestionar personas, procesos, productos y finanzas con mayor claridad.',
          functions: [
            '📊 Actualizar los datos de tu empresa y mantener tu información siempre al día.',
            '⚙️ Configurar las preferencias del sistema, como idioma, moneda y ajustes operativos.',
            '📋 Definir la información básica del negocio que utilizarán los demás módulos.',
            '🏗️ Establecer la estructura de tu empresa y cómo está organizada su operación.',
            '👥 Invitar usuarios y administrar sus accesos, asignando roles y permisos a cada colaborador.',
            '🎓 Realizar evaluaciones iniciales del negocio que te ayudarán a entender en qué etapa se encuentra tu empresa.',
            '📈 Calcular el IME — Índice de Madurez Empresarial, una herramienta que analiza el estado actual de tu negocio y te orienta sobre cómo mejorar su gestión.',
          ],
          context: '💡 Este módulo te permite tener una visión general de tu empresa y comenzar a estructurar cómo funciona tu negocio. Cuando esta base está bien definida, todos los demás procesos del sistema se vuelven más claros y fáciles de administrar.',
          quote: '🏆 La organización es el primer paso para construir un negocio sólido.',
        },
        recursosHumanos: {
          title: 'Recursos Humanos',
          subtitle: 'Administra tu equipo',
          description: 'Gestiona la información de tus empleados y recursos humanos.',
          functions: ['Ver empleados', 'Administrar contratos'],
          context: 'Este módulo te permite administrar eficazmente a tu equipo.',
          quote: 'El talento es la clave para el éxito.',
        },
        procesosTareas: {
          title: 'Procesos y tareas',
          subtitle: 'Organiza tu trabajo',
          description: 'Administra y realiza tareas y procesos importantes para tu negocio.',
          functions: ['Crear tareas', 'Ver procesos'],
          context: 'Este módulo te ayuda a mantener tu negocio organizado.',
          quote: 'La organización es la clave para la eficiencia.',
        },
        gastos: {
          title: 'Gastos',
          subtitle: 'Controla tus gastos',
          description: 'Administra y controla tus gastos para mantener tu negocio en buen estado.',
          functions: ['Ver gastos', 'Aprobar gastos'],
          context: 'Este módulo te permite controlar tus gastos de manera efectiva.',
          quote: 'El control de gastos es fundamental para el éxito.',
        },
        cajaChica: {
          title: 'Caja chica',
          subtitle: 'Gastos menores',
          description: 'Administra gastos menores para tu negocio.',
          functions: ['Ver caja chica', 'Aprobar gastos'],
          context: 'Este módulo te permite gestionar gastos menores de manera eficiente.',
          quote: 'La caja chica es esencial para gastos menores.',
        },
        puntoVenta: {
          title: 'Punto de venta',
          subtitle: 'Vende tus productos',
          description: 'Administra y realiza ventas para tu negocio.',
          functions: ['Realizar ventas', 'Ver ventas'],
          context: 'Este módulo te permite vender tus productos de manera eficiente.',
          quote: 'La venta es la clave para el éxito.',
        },
        ventas: {
          title: 'Ventas',
          subtitle: 'Administra tus ventas',
          description: 'Gestiona y analiza tus ventas para mejorar tu negocio.',
          functions: ['Ver ventas', 'Analizar ventas'],
          context: 'Este módulo te permite administrar y analizar tus ventas.',
          quote: 'Las ventas son la base de tu negocio.',
        },
        kpis: {
          title: 'KPIs',
          subtitle: 'Métricas clave',
          description: 'Administra y analiza tus KPIs para mejorar tu negocio.',
          functions: ['Ver KPIs', 'Configurar KPIs'],
          context: 'Este módulo te permite administrar y analizar tus KPIs.',
          quote: 'Los KPIs son esenciales para el seguimiento del rendimiento.',
        },
      },
    },
    panelInicial: {
      title: 'Panel Inicial',
      back: 'Regresar',
      tabs: {
        profile: 'Perfil',
        businessStructure: 'Estructura Empresarial',
        businessProfile: 'Perfil empresarial',
        personalPerformance: 'Rendimiento personal',
        billing: 'Facturación',
        plan: 'Plan',
        users: 'Usuarios',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['es-MX'],
      diagnosis: {
        title: 'Diagnóstico empresarial',
        description: 'Ayúdanos a conocer mejor tu empresa y la etapa de gestión para personalizar Índice.',
        centerTitle: 'Centro de diagnóstico empresarial',
        centerDescription: 'Descubre el estado de gestión de tu empresa a través de 4 pilares: Personas, Procesos, Productos y Finanzas. Con las respuestas utilizaremos los índices de Madurez Empresarial (IME), que nos ayudará a personalizar recomendaciones, módulos y mejores compañeros detrás de Índice.',
        questionCount: '10 preguntas cada uno',
        questionCountLabel: 'El diagnóstico contiene',
        progress: 'Progreso del diagnóstico empresarial',
        progressOf: 'completado',
        onboarding: {
          answeredProgress: 'Has respondido {answered} de {total} preguntas',
          encouragementMid: 'Vas muy bien',
          encouragementNear: 'Ya casi terminas',
          sections: {
              people: {
                title: 'Paso 1 — Tu equipo',
                intro: 'Entendamos cómo trabaja tu equipo',
                done: 'Listo — entendemos mejor a tu equipo',
              },
              processes: {
                title: 'Paso 2 — Cómo operas',
                intro: 'Entendamos cómo funciona tu operación diaria',
                done: 'Listo — entendemos cómo operas',
              },
              products: {
                title: 'Paso 3 — Lo que vendes',
                intro: 'Entendamos tu oferta y cómo llega al mercado',
                done: 'Listo — entendemos lo que vendes',
              },
              finance: {
                title: 'Paso 4 — Tus finanzas',
                intro: 'Entendamos cómo controlas tus números',
                done: 'Listo — entendemos tus finanzas',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['es-MX'],
        printDiagnosis: 'Descargar PDF',
        start: 'Comenzar',
        continue: 'Continuar',
        doAgain: 'Hacer de nuevo',
        reviewAnswers: 'Revisar respuestas',
        close: 'Cerrar',
        question: 'Pregunta',
        of: 'de',
        completed: 'completadas',
        previous: 'Anterior',
        next: 'Siguiente',
        finish: 'Finalizar',
        restart: 'Reiniciar diagnóstico',
        actions: {
          save: 'Guardar',
          saving: 'Guardando...',
          discard: 'Descartar',
        },
        scoreSummary: {
          title: 'Puntuación del diagnóstico',
          bmi: 'IME',
          level: 'Nivel',
          answered: 'Respondidas',
          score: 'Puntaje',
        },
        messages: {
          loading: 'Cargando diagnóstico empresarial...',
          loadError: 'No pudimos cargar el diagnóstico empresarial.',
          saveSuccess: 'Se guardó el diagnóstico empresarial.',
          saveError: 'No pudimos guardar el diagnóstico empresarial.',
          unsavedChanges: 'Tienes cambios sin guardar en el diagnóstico empresarial.',
        },
        pillars: {
          people: {
            title: 'Personas',
            description: 'Analiza talentos, estructura de equipo y comunicación.',
          },
          processes: {
            title: 'Procesos',
            description: 'Evalúa flujos, tareas, escalabilidad y eficiencia.',
          },
          products: {
            title: 'Productos',
            description: 'Analiza oferta, mercado, comercial y propuesta de valor.',
          },
          finance: {
            title: 'Finanzas',
            description: 'Evalúa control financiero, gestión y toma de decisiones.',
          },
        },
        questions: {
          people: [
            { question: '¿Cuál es tu rol principal?', options: ['Fundador/CEO', 'Operaciones', 'Finanzas', 'Comercial/Otro'] },
            { question: '¿Cuántas personas trabajan?', options: ['Solo yo', '2 a 5', '6 a 20', '21 o más'] },
            { question: '¿Cómo está organizado tu equipo?', options: ['Sin estructura', 'Roles básicos', 'Áreas definidas', 'Organigrama formal'] },
            { question: '¿Cómo asignan tareas?', options: ['Improvisado', 'Listas', 'Asignación estructurada', 'Sistema de gestión'] },
            { question: '¿Revisión de desempeño?', options: ['Nunca', 'Por problemas', 'Semanal', 'Con KPIs'] },
            { question: '¿Delegación?', options: ['Hago todo', 'Delego y superviso', 'Delego con control', 'Equipo autónomo'] },
            { question: '¿Comunicación interna?', options: ['Informal', 'Chat', 'Reuniones', 'Herramientas formales'] },
            { question: '¿Frecuencia de reuniones?', options: ['Nunca', 'Esporádico', 'Semanal', 'Frecuente'] },
            { question: '¿Claridad de responsabilidades?', options: ['Nada clara', 'Algo clara', 'Bastante clara', 'Totalmente clara'] },
            { question: '¿Facilidad de integración?', options: ['Muy difícil', 'Difícil', 'Moderado', 'Fácil'] },
          ],
          processes: [
            { question: '¿Procesos documentados?', options: ['Nada', 'Algunos', 'Mayoría', 'Totalmente'] },
            { question: '¿Gestión de tareas?', options: ['Improvisado', 'Listas', 'Herramientas', 'Sistema formal'] },
            { question: '¿Monitoreo de avance?', options: ['No se monitorea', 'Ocasional', 'Reportes', 'KPIs'] },
            { question: '¿Automatización?', options: ['Manual', 'Herramientas aisladas', 'Automatización parcial', 'Alta automatización'] },
            { question: '¿Replicabilidad?', options: ['Muy difícil', 'Con esfuerzo', 'Posible', 'Fácil'] },
            { question: '¿Dónde se pierde tiempo?', options: ['Manual', 'Coordinación', 'Información', 'Seguimiento'] },
            { question: '¿Dependencia de personas?', options: ['Total', 'Bastante', 'Algo', 'Poco'] },
            { question: '¿Claridad de procesos?', options: ['Nada claros', 'Algo claros', 'Bastante claros', 'Totalmente claros'] },
            { question: '¿Gestión de errores?', options: ['Reacción', 'Informal', 'Revisión', 'Mejora continua'] },
            { question: '¿Escalabilidad?', options: ['Nula', 'Baja', 'Media', 'Alta'] },
          ],
          products: [
            { question: '¿Qué vendes?', options: ['Servicios', 'Productos', 'Digital', 'Mixto'] },
            { question: '¿Tipo de cliente?', options: ['B2C', 'B2B', 'Gobierno', 'Mixto'] },
            { question: '¿Ingresos principales?', options: ['Venta directa', 'Servicios', 'Suscripción', 'Contratos'] },
            { question: '¿Diversificación?', options: ['Uno', 'Algunos', 'Varias líneas', 'Amplio'] },
            { question: '¿Definición de precios?', options: ['Intuición', 'Competencia', 'Costos', 'Estrategia'] },
            { question: '¿Seguimiento desempeño?', options: ['No se mide', 'Solo ventas', 'Ventas+rentabilidad', 'Indicadores'] },
            { question: '¿Propuesta de valor?', options: ['No clara', 'Algo clara', 'Bastante clara', 'Muy clara'] },
            { question: '¿Feedback cliente?', options: ['No hay', 'Informal', 'Encuestas', 'Análisis'] },
            { question: '¿Evolución producto?', options: ['Sobre la marcha', 'Cambios ocasionales', 'Planes', 'Roadmap'] },
            { question: '¿Prioridad comercial?', options: ['Clientes', 'Ventas actuales', 'Rentabilidad', 'Escalar'] },
          ],
          finance: [
            { question: '¿Control financiero?', options: ['No estructurado', 'Excel', 'Software', 'Sistema integrado'] },
            { question: '¿Revisión de números?', options: ['Nunca', 'Mensual', 'Semanal', 'Diario'] },
            { question: '¿Flujo de efectivo?', options: ['No controlado', 'Reacción', 'Revisión', 'Proyección'] },
            { question: '¿Costos claros?', options: ['No claros', 'Aproximados', 'Bastante claros', 'Control total'] },
            { question: '¿Margen?', options: ['No sé', 'Estimado', 'Claro', 'Totalmente medido'] },
            { question: '¿Decisiones financieras?', options: ['Intuición', 'Experiencia', 'Datos', 'Modelos'] },
            { question: '¿Ingresos predecibles?', options: ['Muy variables', 'Variables', 'Estables', 'Muy estables'] },
            { question: '¿Gestión de deuda?', options: ['Sin control', 'Básico', 'Estrategia', 'Optimizado'] },
            { question: '¿Preparación ante crisis?', options: ['Nula', 'Baja', 'Media', 'Alta'] },
            { question: '¿Cumplimiento fiscal?', options: ['Sin control', 'Retrasos', 'Al día', 'Estrategia fiscal'] },
          ],
        },
      },
      structure: {
        title: 'Estructura Empresarial',
        subtitle: 'Organización y unidades de negocio',
        status: {
          connected: 'Backend Spring conectado',
          backendNotice: 'Esta pantalla ahora carga y guarda en el backend de Spring. La identidad de la empresa y los detalles de unidades y negocios capturados aquí se conservan a través de Spring.',
        },
        actions: {
          save: 'Guardar cambios',
          saving: 'Guardando...',
          extract: 'Obtener coordenadas',
          useLocation: 'Usar mi ubicación',
          addUnit: 'Agregar nueva unidad',
          configure: 'Configurar unidad',
          configureGroup: 'Configurar grupo',
          createUnit: 'Agregar otra unidad',
        },
        messages: {
          loading: 'Cargando estructura empresarial...',
          loadError: 'No fue posible cargar la estructura empresarial.',
          saveError: 'No fue posible guardar la estructura empresarial.',
          saveSuccess: 'Estructura Empresarial guardada correctamente.',
          saveOverlay: 'Guardando estructura empresarial...',
          saveOverlayDescription: 'Sincronizando empresa, unidades y negocios con el backend.',
          createUnitTitle: 'Creando unidad...',
          updateUnitTitle: 'Guardando unidad...',
          unitOverlayDescription: 'Actualizando los detalles de la unidad en tu Estructura Empresarial.',
          createUnitSuccess: 'Unidad agregada a la Estructura Empresarial.',
          updateUnitSuccess: 'Unidad actualizada en la Estructura Empresarial.',
          createBusinessTitle: 'Creando negocio...',
          updateBusinessTitle: 'Guardando negocio...',
          businessOverlayDescription: 'Actualizando los detalles del negocio en tu Estructura Empresarial.',
          createBusinessSuccess: 'Negocio agregado a la Estructura Empresarial.',
          updateBusinessSuccess: 'Negocio actualizado en la Estructura Empresarial.',
        },
        mode: {
          title: 'Tipo de operación',
          description: 'Selecciona la opción que mejor describe tu empresa:',
          helper: '💡 Elige cómo funciona tu negocio',
          simple: 'Simple',
          multi: 'Multi-unidad',
          simpleTitle: 'Tengo un solo negocio o sucursal',
          simpleDescription: 'Tienes una sola sucursal o empresa',
          simpleExample: 'Ejemplo: un restaurante, tienda o consultorio',
          multiTitle: 'Tengo varias sucursales o marcas',
          multiDescription: 'Múltiples sucursales, filiales o empresas relacionadas',
          multiExample: 'Ejemplo: varios restaurantes, sucursales o marcas',
          switchPrompt: '¿Tienes más de un negocio o sucursal?',
          switchAction: 'Cambia a multi-unidad',
          multiNote: 'Gestiona múltiples unidades desde una única administración.',
          selected: 'Seleccionado',
          structurePreviewTitle: '🧠 Así funcionará tu estructura',
          structurePreviewLines: [
            'Empresa',
            ' → Ubicación (ej: Cancún, CDMX)',
            '    → Negocio (ej: Restaurante, tienda, hotel)',
          ],
        },
        identity: {
          simple: 'Sede principal de la empresa',
          holding: 'Sede principal de la empresa',
          simpleDesc: 'Nombre, logo, coordenadas, radio y configuración base.',
          holdingDesc: 'Nombre, logo, coordenadas, radio y configuración base.',
          holdingNotice: '💡 Aquí defines desde dónde opera tu negocio',
        },
        headquarters: {
          helper: '💡 Aquí defines desde dónde opera tu negocio',
          context: 'Usaremos esta información para organizar tus operaciones, empleados y reportes',
          basicInfo: '🏢 Información básica de tu empresa',
          industryHelper: 'Esto nos ayuda a adaptar el sistema a tu tipo de negocio',
          locationTitle: '📍 Ubicación de tu negocio',
          locationHelper: 'Esto nos ayuda en funciones como asistencia y control de operaciones',
          addressTitle: '📍 Dirección del negocio',
          addressHelper: 'Completa la dirección para identificar mejor tu ubicación',
          addressNote: 'La dirección es informativa. Usaremos coordenadas para funciones del sistema',
        },
        fields: {
          companyName: 'Nombre de la empresa',
          holdingName: 'Nombre de la empresa',
          industry: 'Industria',
          selectIndustry: 'Selecciona una industria',
          industryHint: 'Esto nos ayuda a adaptar el sistema a tu tipo de negocio',
          country: 'País',
          selectCountry: 'Selecciona un país',
          logo: 'Logo de la empresa',
          logoHolding: 'Logo de oficina corporativa',
          uploadImage: 'Subir imagen',
          noFileSelected: 'Ningún archivo seleccionado',
          uploadHint: 'JPG/PNG/SVG. Máx 1MB.',
          removeLogo: 'Eliminar logo',
          description: 'Descripción',
          optional: '(opcional)',
          basicInfo: 'Información básica',
          location: 'Ubicación',
          contact: 'Contacto',
          operationalInfo: 'Información operativa',
          address: 'Dirección',
          city: 'Ciudad',
          state: 'Estado/Provincia',
          postalCode: 'C.P.',
          phone: 'Teléfono',
          email: 'Email',
          manager: 'Gerente/Responsable',
          schedule: 'Horario',
          logoPreviewAlt: 'Vista previa del logo',
        },
        units: {
          title: '🏬 Tus unidades de negocio',
          subtitle: 'Aquí puedes ver y administrar cómo está organizado tu negocio',
          description: 'Aquí puedes ver y administrar cómo está organizado tu negocio',
          context: 'Cada unidad representa una sucursal, marca o línea de negocio',
          groupLabel: '🧩 Grupo principal',
          mainUnit: 'Unidad principal',
          helper: 'Puedes empezar con una unidad y agregar más conforme tu negocio crezca',
          tip: '💡 Puedes crear unidades para cada sucursal o marca',
          empty: 'Sin negocios aún',
          emptyHelper: 'Agrega tu primer negocio en esta unidad',
          groupContext: 'Cada ubicación agrupa los negocios que operan ahí',
          tipAction: '💡 Puedes empezar con una unidad y agregar más después',
          addUnit: '+ Nueva unidad',
          addBusiness: '+ Agregar negocio',
          unitName: 'Nombre de la unidad',
          unitCountry: 'País de operación',
          businessName: 'Nombre del negocio',
          configureUnit: '⚙️ Configurar unidad',
          configureBusiness: '⚙️ Configurar',
          businessCountSingular: 'negocio',
          businessCountPlural: 'negocios',
        },
        modal: {
          newUnit: 'Nueva unidad de negocio',
          editUnit: 'Editar unidad de negocio',
          newBusiness: 'Nuevo negocio',
          editBusiness: 'Editar negocio',
          save: 'Guardar cambios',
          cancel: 'Cancelar',
          delete: 'Eliminar',
          createBusiness: 'Crear negocio',
          newUnitDescription: 'Agrega una nueva unidad operativa',
          editUnitDescription: 'Edita los datos de',
          newBusinessDescription: 'Agrega un nuevo negocio/sucursal',
          editBusinessDescription: 'Edita los datos de',
          confirmDeleteUnit: '¿Eliminar esta unidad?',
          confirmDeleteBusiness: '¿Eliminar este negocio?',
        },
        placeholders: {
          unitName: 'Ej. Ciudad de México, Norte, Región Centro...',
          businessName: 'Ej. Sucursal Centro, Tienda Polanco, Almacén Sur...',
          address: 'Calle, número, colonia...',
          city: 'Ciudad',
          state: 'Estado',
          postalCode: '00000',
          phone: '+52 55 1234 5678',
          unitEmail: 'unidad@empresa.com',
          businessEmail: 'negocio@empresa.com',
          manager: 'Nombre del responsable',
          schedule: 'Lun-Vie 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ Retail / Comercio' },
            { value: 'food', label: '🍔 Alimentos y Bebidas' },
            { value: 'hospitality', label: '🏨 Hotelería y Hospitalidad' },
            { value: 'tech', label: '💻 Tecnología' },
            { value: 'software-saas', label: '🧩 Software / SaaS' },
            { value: 'health', label: '🏥 Salud' },
            { value: 'beauty-wellness', label: '💅 Belleza y Bienestar' },
            { value: 'education', label: '🎓 Educación' },
            { value: 'services', label: '💼 Servicios Profesionales' },
            { value: 'consulting', label: '🧠 Consultoría' },
            { value: 'legal', label: '⚖️ Legal' },
            { value: 'accounting-tax', label: '🧾 Contabilidad e Impuestos' },
            { value: 'finance-insurance', label: '💰 Finanzas y Seguros' },
            { value: 'real-estate', label: '🏢 Bienes Raíces' },
            { value: 'construction', label: '🏗️ Construcción' },
            { value: 'architecture-engineering', label: '📐 Arquitectura e Ingeniería' },
            { value: 'manufacturing', label: '🏭 Manufactura' },
            { value: 'wholesale-distribution', label: '📦 Mayoreo y Distribución' },
            { value: 'logistics-transportation', label: '🚚 Transporte y Logística' },
            { value: 'automotive', label: '🚗 Automotriz' },
            { value: 'agriculture', label: '🌾 Agricultura' },
            { value: 'energy-utilities', label: '⚡ Energía y Servicios Públicos' },
            { value: 'telecommunications', label: '📡 Telecomunicaciones' },
            { value: 'marketing-advertising', label: '📣 Marketing y Publicidad' },
            { value: 'media-creative', label: '🎨 Medios y Creatividad' },
            { value: 'entertainment-events', label: '🎭 Entretenimiento y Eventos' },
            { value: 'tourism-travel', label: '✈️ Turismo y Viajes' },
            { value: 'sports-fitness', label: '🏋️ Deportes y Fitness' },
            { value: 'cleaning-facility', label: '🧹 Limpieza e Instalaciones' },
            { value: 'maintenance-repair', label: '🔧 Mantenimiento y Reparación' },
            { value: 'security', label: '🛡️ Seguridad' },
            { value: 'ecommerce', label: '🛒 E-commerce' },
            { value: 'import-export', label: '🌐 Importación / Exportación' },
            { value: 'nonprofit', label: '🤝 ONG / Sin fines de lucro' },
            { value: 'government-public', label: '🏛️ Gobierno / Sector público' },
            { value: 'pet-services', label: '🐾 Mascotas' },
            { value: 'childcare', label: '👶 Cuidado infantil' },
            { value: 'senior-care', label: '🧓 Cuidado de adultos mayores' },
            { value: 'pharmaceutical', label: '💊 Farmacéutica' },
            { value: 'other', label: '📦 Otro' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ Restaurante y Alimentos' },
            { value: 'retail', label: '🛍️ Retail y Comercio' },
            { value: 'servicios', label: '💼 Servicios Profesionales' },
            { value: 'salud', label: '⚕️ Salud y Bienestar' },
            { value: 'educacion', label: '📚 Educación' },
            { value: 'tecnologia', label: '💻 Tecnología' },
            { value: 'construccion', label: '🏗️ Construcción' },
            { value: 'manufactura', label: '🏭 Manufactura' },
            { value: 'hospitalidad', label: '🏨 Hospitalidad y Turismo' },
            { value: 'inmobiliaria', label: '🏢 Bienes Raíces' },
            { value: 'transporte', label: '🚚 Transporte y Logística' },
            { value: 'entretenimiento', label: '🎭 Entretenimiento' },
            { value: 'financiero', label: '💰 Servicios Financieros' },
            { value: 'agricultura', label: '🌾 Agricultura' },
            { value: 'otro', label: '📦 Otro' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 México' },
            { value: 'US', label: '🇺🇸 Estados Unidos' },
            { value: 'CA', label: '🇨🇦 Canadá' },
            { value: 'ES', label: '🇪🇸 España' },
            { value: 'CO', label: '🇨🇴 Colombia' },
            { value: 'AR', label: '🇦🇷 Argentina' },
            { value: 'BR', label: '🇧🇷 Brasil' },
            { value: 'CL', label: '🇨🇱 Chile' },
          ],
        },
      },
      profile: {
        title: 'Tu perfil',
        subtitle: 'Así aparecerás dentro del sistema',
        helper: 'Puedes completar esto en cualquier momento',
        fields: {
          fullName: 'Nombre completo',
          email: 'Correo electrónico',
          phone: 'Teléfono',
          position: 'Puesto',
          department: 'Departamento',
          profilePhoto: 'Foto de perfil',
          country: 'País',
          uploadPhoto: 'Subir mi foto',
          firstNames: 'Nombre o nombres',
          lastNames: 'Apellido o apellidos',
          preferredLanguage: 'Idioma preferido',
          newPassword: 'Nueva contraseña',
          confirmNewPassword: 'Confirmar contraseña',
        },
        sections: {
          identityTitle: 'Identidad',
          identitySubtitle: 'Así te verán dentro del sistema',
          contactTitle: 'Información de contacto',
          contactSubtitle: 'Aquí te avisaremos sobre lo importante',
          securityTitle: 'Seguridad de la cuenta',
          securitySubtitle: 'Mantén tu cuenta segura',
          preferencesTitle: 'Preferencias',
          preferencesSubtitle: 'Personaliza el idioma de la interfaz.',
          nameGroup: 'Tu nombre',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, máx. 25MB; se comprime al subir',
          firstNames: 'En algunos países puedes usar uno o varios nombres.',
          lastNames: 'Puede ser 1 (USA/Canadá) o 2 (México/Colombia).',
          phone: 'El país define la clave telefónica automáticamente.',
          password: 'Si no quieres cambiarla, déjala vacía.',
          preferredLanguage: 'Usaremos este idioma para la interfaz y plantillas.',
        },
        actions: {
          save: 'Guardar cambios',
          saving: 'Guardando...',
          discard: 'Descartar',
        },
        messages: {
          loading: 'Cargando perfil...',
          saveSuccess: 'Perfil guardado.',
          loadError: 'No fue posible cargar el perfil.',
          saveError: 'No fue posible guardar el perfil.',
          unsavedChanges: 'Tienes cambios sin guardar.',
          optional: '(opcional)',
          savingOverlay: 'Guardando perfil...',
          passwordMismatch: 'La nueva contraseña y su confirmación deben coincidir.',
          passwordMinLength: 'La nueva contraseña debe tener al menos 8 caracteres.',
          invalidPhone: 'Ingresa un número de teléfono válido para el país seleccionado.',
        },
      },
      users: {
        title: 'Usuarios',
        subtitle: 'Gestiona usuarios y permisos del sistema',
        invite: 'Invitar usuario',
        search: 'Buscar usuario...',
        filters: {
          all: 'Todos',
          active: 'Activos',
          pending: 'Pendientes',
          inactive: 'Inactivos',
        },
        roles: {
          superAdmin: 'Super Admin',
          admin: 'Admin',
          user: 'Usuario',
        },
        status: {
          active: 'Activo',
          pending: 'Pendiente',
          inactive: 'Inactivo',
        },
        table: {
          name: 'Nombre',
          email: 'Email',
          role: 'Rol',
          status: 'Estatus',
          modules: 'Módulos',
          actions: 'Acciones',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['es-MX'],
        actions: {
          edit: 'Editar',
          resend: 'Reenviar invitación',
          delete: 'Eliminar',
        },
        modal: {
          newUser: 'Nuevo usuario',
          editUser: 'Editar usuario',
          name: 'Nombre',
          email: 'Correo electrónico',
          role: 'Rol',
          selectRole: 'Selecciona un rol',
          modules: 'Módulos',
          selectModules: 'Selecciona módulos...',
          inviteLink: 'Link de invitación',
          copyLink: 'Copiar link',
          copied: '✓ Copiado',
          save: 'Guardar',
          cancel: 'Cancelar',
          send: 'Enviar invitación',
        },
      },
      plan: {
        title: 'Elige el plan que más se ajuste a tu empresa',
        subtitle: 'Todos los planes incluyen Modo Aprendiz y actualizaciones continuas',
        mostPopular: 'Más popular',
        plans: {
          inicio: {
            name: 'Inicio',
            description: 'Comienza a organizar tu negocio',
            button: 'Elegir Inicio',
          },
          controla: {
            name: 'Controla',
            description: 'Bases sólidas para ordenar y controlar',
            button: 'Elegir Controla',
          },
          escala: {
            name: 'Escala',
            description: 'Optimiza áreas, estandariza procesos',
            button: 'Elegir Escala',
          },
          corporativiza: {
            name: 'Corporativiza',
            description: 'Automatiza con IA corporativa y visión integral',
            button: 'Elegir Corporativiza',
          },
        },
        features: {
          humanResources: 'Recursos Humanos',
          processes: 'Procesos y Tareas',
          products: 'Productos (POS / CRM)',
          finance: 'Finanzas (Gastos / Caja)',
          kpisBasic: 'KPIs Básicos',
          kpisComplete: 'KPIs Completos',
          kpisAdvanced: 'KPIs Avanzados',
          kpisCorporate: 'KPIs Corporativos',
          users5: 'Hasta 5 usuarios',
          users10: 'Hasta 10 usuarios',
          users20: 'Hasta 20 usuarios',
          users25: 'Hasta 25 usuarios',
          complementaryModules: 'Módulos complementarios',
          modules2: '2 módulos complementarios',
          modules4: '4 módulos complementarios',
          allModules: 'Todos los módulos',
          aiAnalytics: 'IA Analítica y Ventas',
          integrations: 'Integraciones',
          sessions1: '1 sesión/mes',
          sessions2: '2 sesiones/mes',
          sessions4: '4 sesiones/mes',
        },
        additionalInfo: {
          title: 'Información adicional',
          extraUser: 'Usuario adicional',
          extraUserPrice: '+$10 USD por usuario extra en cualquier plan',
          learningMode: 'Modo Aprendiz',
          learningModeDesc: 'Incluido en todos los planes sin costo adicional',
          updates: 'Actualizaciones',
          updatesDesc: 'Todas las mejoras incluidas automáticamente',
        },
      },
      billing: {
        title: 'Facturación',
        subtitle: 'Datos fiscales, método de pago y facturas del servicio',
        fiscalData: {
          title: 'Datos fiscales',
          subtitle: 'Configura tus datos fiscales según el país',
          country: 'País',
          selectCountry: 'Selecciona un país...',
          rfc: 'RFC',
          razonSocial: 'Razón social',
          regimenFiscal: 'Régimen fiscal',
          usoCFDI: 'Uso CFDI (default)',
          codigoPostalFiscal: 'Código Postal (Fiscal)',
          nit: 'NIT',
          responsabilidadFiscal: 'Responsabilidad fiscal',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: 'Razão social',
          inscricaoEstadual: 'Inscrição estadual',
          ein: 'EIN (Tax ID)',
          legalName: 'Legal name',
          state: 'State',
          businessNumber: 'Business Number (BN)',
          province: 'Province',
          taxId: 'ID Fiscal',
          companyName: 'Nombre de la empresa',
          taxRegime: 'Régimen fiscal',
          postalCode: 'Código Postal',
        },
        paymentMethod: {
          title: 'Método de pago',
          subtitle: 'Configura tu método y frecuencia de pago',
          type: 'Tipo de pago preferido',
          selectMethod: 'Selecciona un método...',
          cardNumber: 'Número de tarjeta',
          cvv: 'CVV',
          expirationDate: 'Fecha de expiración',
          cardholderName: 'Nombre en la tarjeta',
          addCard: 'Agregar tarjeta',
          cancel: 'Cancelar',
          savedCards: 'Tarjetas guardadas',
          defaultCard: 'Predeterminada',
          saveCard: 'Guardar tarjeta',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/AA',
            cardholderName: 'Como aparece en la tarjeta',
          },
        },
        automaticBilling: {
          title: 'Facturación automática',
          subtitle: 'Configura renovación, día de cobro y correo de facturas',
          enable: 'Activar renovación automática',
          description: 'Tu suscripción se renovará automáticamente al final del período',
          billingDay: 'Día de facturación',
          selectDay: 'Día 1 de cada mes',
          emailForInvoices: 'Email para facturas',
          reminderNote: 'Recibirás tus facturas en este correo',
        },
        currentBilling: {
          title: 'Resumen de cobro actual',
          plan: 'Plan:',
          notConfigured: 'No configurado',
          amount: 'Monto:',
          nextPayment: 'Próximo cobro:',
        },
        invoices: {
          title: 'Facturas del servicio',
          subtitle: 'Historial de facturas de tu suscripción',
          month: 'Mes',
          year: 'Monto',
          status: 'Estatus',
          downloadPdf: 'Descargar PDF',
          date: 'Fecha',
          concept: 'Concepto',
          amount: 'Monto',
          paid: 'Pagada',
          pending: 'Pendiente',
        },
        billingFrequency: {
          title: 'Frecuencia de facturación',
          note: 'Los pagos pueden tener 100-30 descuento',
          monthly: 'Mensual',
          quarterly: 'Trimestral',
          semiannual: 'Semestral',
          annual: 'Anual',
        },
      },
    },
  },
  'es-CO': {
    header: {
      notifications: 'Notificaciones',
      profile: 'Mi perfil',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
      learningMode: 'Ruta operativa',
    },
    sections: {
      kpis: 'Tus KPIs',
      favorites: 'Tus favoritos',
      quickAccess: 'Accesos rápidos',
      basicModules: 'Módulos básicos',
      main: 'Principales',
      complementaryModules: 'Módulos complementarios',
      additional: 'Adicionales',
      aiModules: 'Inteligencia artificial',
      aiLabel: 'Módulos de IA',
      configureKpis: 'Configurar KPIs',
    },
    kpis: {
      weeklyRevenue: 'Ventas Semanales',
      netProfit: 'Utilidad Neta',
      activeClients: 'Clientes Activos',
      activeEmployees: 'Empleados Activos',
      pendingTasks: 'Tareas Pendientes',
      monthlyExpenses: 'Gastos del Mes',
      vsWeekBefore: 'vs semana anterior',
      thisMonth: 'este mes',
      newOnes: 'nuevos',
      dueToday: 'vencen hoy',
      vsMonthBefore: 'vs mes anterior',
    },
    modules: {
      panelInicial: 'Panel Inicial',
      recursosHumanos: 'Recursos Humanos',
      procesosTareas: 'Procesos y tareas',
      gastos: 'Gastos',
      cajaChica: 'Caja chica',
      puntoVenta: 'Punto de venta',
      ventas: 'Ventas',
      cartera: 'Cartera',
      kpis: 'KPIs',
      mantenimiento: 'Mantenimiento',
      inventarios: 'Inventarios',
      controlMinutas: 'Control de minutas',
      limpieza: 'Limpieza',
      lavanderia: 'Lavandería',
      transportacion: 'Transportación',
      vehiculosMaquinaria: 'Vehículos y maquinaria',
      inmuebles: 'Inmuebles',
      formularios: 'Formularios',
      facturacion: 'Facturación',
      correoElectronico: 'Correo electrónico',
      climaLaboral: 'Clima laboral',
      afiliados: 'Afiliados',
      indiceAgenteVentas: 'Índice Agente de Ventas',
      indiceAnalitica: 'Índice Analítica',
      capacitacion: 'Capacitación',
      indiceCoach: 'Índice Coach',
    },
    notifications: {
      newTask: 'Nueva tarea asignada',
      expensePending: 'Gasto pendiente de aprobar',
      newClient: 'Nuevo cliente registrado',
      timeAgo: {
        minutes: 'Hace 5 minutos',
        hour: 'Hace 1 hora',
        hours: 'Hace 2 horas',
      },
    },
	    loginPage: {
	      logoAlt: 'Logo de Indice',
	      workspaceBadge: 'Claridad operacional',
	      accessBadge: 'Acceso Indice',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Marco operativo Indice',
	      title: 'Opera tu negocio con claridad.',
	      subtitle:
	        'Conecta personal, procesos, productos y finanzas en un espacio operativo diseñado para empresas en crecimiento.',
	      pillars: [
	        {
	          icon: '👥',
	          title: 'Personal',
	          description: 'Equipos, responsabilidades y actividad diaria con mayor visibilidad.',
	        },
	        {
	          icon: '⚙️',
	          title: 'Procesos',
	          description: 'Flujos claros para ejecutar, hacer seguimiento y reducir desorden.',
	        },
	        {
	          icon: '📦',
	          title: 'Productos',
	          description: 'Catálogos, operación comercial e inventario conectados al negocio.',
	        },
	        {
	          icon: '📊',
	          title: 'Finanzas',
	          description: 'Control financiero y lectura operativa para decidir mejor.',
	        },
	      ],
	      featureCards: [
	        {
	          title: 'Visibilidad operativa',
	          description: 'Entiende qué está pasando en cada área del negocio.',
	        },
	        {
	          title: 'Control empresarial',
	          description: 'Centraliza la ejecución y reduce el caos operativo.',
	        },
	        {
	          title: 'Mejores decisiones',
	          description: 'Convierte la actividad diaria en señales claras para actuar.',
	        },
	      ],
	      visualTitle: 'Crecimiento estructurado',
	      visualSubtitle:
	        'Indice organiza la operación en pilares conectados para que cada equipo trabaje con contexto y dirección.',
	      visualMetricValue: '4',
	      visualMetricLabel: 'pilares conectados',
	      visualSignalLabel: 'Sistema operativo',
	      welcomeTitle: 'Accede a tu espacio operativo',
	      welcomeText:
	        'Continúa la ejecución diaria con visibilidad, control y contexto de negocio.',
	      emailLabel: 'Correo electrónico',
	      emailPlaceholder: 'tu@empresa.com',
	      emailError: 'Ingresa un correo electrónico válido.',
	      passwordLabel: 'Contraseña',
	      passwordPlaceholder: 'Escribe tu contraseña',
	      forgotPassword: '¿Olvidaste tu contraseña?',
	      hidePassword: 'Ocultar contraseña',
	      showPassword: 'Mostrar contraseña',
	      signIn: 'Iniciar sesión',
	      signingIn: 'Ingresando...',
	      successToast: 'Sesión iniciada correctamente.',
	      errorFallback: 'No fue posible iniciar sesión.',
	      insideTitle: 'Lo que tendrás disponible',
	      insideItems: ['Visibilidad operativa', 'Actividad del equipo', 'Control financiero', 'Desempeño del negocio'],
	      resetBadge: 'Recuperación de acceso',
	      resetTitle: 'Restablece tu contraseña',
	      resetDescription:
	        'Ingresa el correo de tu cuenta. Si existe, enviaremos un enlace de recuperación con vigencia limitada.',
	      resetCloseLabel: 'Cerrar recuperación de contraseña',
	      resetCancel: 'Cancelar',
	      resetSubmit: 'Enviar enlace',
	      resetSubmitting: 'Enviando enlace...',
	      resetSuccessFallback: 'Si ese correo existe, se envió un enlace para restablecer la contraseña.',
	      resetErrorFallback: 'No fue posible enviar la solicitud de recuperación.',
	    },
    learningMode: {
      welcome: '¡Bienvenido al modo de aprendizaje!',
      hide: 'Ocultar',
      show: 'Mostrar',
      businessBase: 'Base de negocios',
      clearBusinessStable: 'Limpiar base de negocios estable',
      functions: 'Funciones',
      businessContext: 'Contexto de negocio',
      indiceMethodology: 'Metodología Índice',
      addModule: 'Abrir',
      viewBasicModules: 'Ver módulos básicos',
      previous: 'Anterior',
      next: 'Siguiente',
      stepOf: 'Paso de',
      modules: {
        panelInicial: {
          title: 'Panel Inicial',
          subtitle: '🎯 Tu punto de partida',
          description: 'El Panel Inicial es el punto de partida para organizar tu empresa dentro del sistema Índice. 🏢 Aquí defines la información básica de tu negocio y configuras la estructura que permitirá que todos los demás módulos funcionen correctamente. ✨ Cuando esta base está bien configurada, el sistema puede ayudarte a gestionar personas, procesos, productos y finanzas con mayor claridad.',
          functions: [
            '📊 Actualizar los datos de tu empresa y mantener tu información siempre al día.',
            '⚙️ Configurar las preferencias del sistema, como idioma, moneda y ajustes operativos.',
            '📋 Definir la información básica del negocio que utilizarán los demás módulos.',
            '🏗️ Establecer la estructura de tu empresa y cómo está organizada su operación.',
            '👥 Invitar usuarios y administrar sus accesos, asignando roles y permisos a cada colaborador.',
            '🎓 Realizar evaluaciones iniciales del negocio que te ayudarán a entender en qué etapa se encuentra tu empresa.',
            '📈 Calcular el IME ��� Índice de Madurez Empresarial, una herramienta que analiza el estado actual de tu negocio y te orienta sobre cómo mejorar su gestión.',
          ],
          context: '💡 Este módulo te permite tener una visión general de tu empresa y comenzar a estructurar cómo funciona tu negocio. Cuando esta base está bien definida, todos los demás procesos del sistema se vuelven más claros y fáciles de administrar.',
          quote: '🏆 La organización es el primer paso para construir un negocio sólido.',
        },
        recursosHumanos: {
          title: 'Recursos Humanos',
          subtitle: 'Administra tu equipo',
          description: 'Gestiona la información de tus empleados y recursos humanos.',
          functions: ['Ver empleados', 'Administrar contratos'],
          context: 'Este módulo te permite administrar eficazmente a tu equipo.',
          quote: 'El talento es la clave para el éxito.',
        },
        procesosTareas: {
          title: 'Procesos y tareas',
          subtitle: 'Organiza tu trabajo',
          description: 'Administra y realiza tareas y procesos importantes para tu negocio.',
          functions: ['Crear tareas', 'Ver procesos'],
          context: 'Este módulo te ayuda a mantener tu negocio organizado.',
          quote: 'La organización es la clave para la eficiencia.',
        },
        gastos: {
          title: 'Gastos',
          subtitle: 'Controla tus gastos',
          description: 'Administra y controla tus gastos para mantener tu negocio en buen estado.',
          functions: ['Ver gastos', 'Aprobar gastos'],
          context: 'Este módulo te permite controlar tus gastos de manera efectiva.',
          quote: 'El control de gastos es fundamental para el éxito.',
        },
        cajaChica: {
          title: 'Caja chica',
          subtitle: 'Gastos menores',
          description: 'Administra gastos menores para tu negocio.',
          functions: ['Ver caja chica', 'Aprobar gastos'],
          context: 'Este módulo te permite gestionar gastos menores de manera eficiente.',
          quote: 'La caja chica es esencial para gastos menores.',
        },
        puntoVenta: {
          title: 'Punto de venta',
          subtitle: 'Vende tus productos',
          description: 'Administra y realiza ventas para tu negocio.',
          functions: ['Realizar ventas', 'Ver ventas'],
          context: 'Este módulo te permite vender tus productos de manera eficiente.',
          quote: 'La venta es la clave para el éxito.',
        },
        ventas: {
          title: 'Ventas',
          subtitle: 'Administra tus ventas',
          description: 'Gestiona y analiza tus ventas para mejorar tu negocio.',
          functions: ['Ver ventas', 'Analizar ventas'],
          context: 'Este módulo te permite administrar y analizar tus ventas.',
          quote: 'Las ventas son la base de tu negocio.',
        },
        kpis: {
          title: 'KPIs',
          subtitle: 'Métricas clave',
          description: 'Administra y analiza tus KPIs para mejorar tu negocio.',
          functions: ['Ver KPIs', 'Configurar KPIs'],
          context: 'Este módulo te permite administrar y analizar tus KPIs.',
          quote: 'Los KPIs son esenciales para el seguimiento del rendimiento.',
        },
      },
    },
    panelInicial: {
      title: 'Panel Inicial',
      back: 'Regresar',
      tabs: {
        profile: 'Perfil',
        businessStructure: 'Estructura Empresarial',
        businessProfile: 'Perfil empresarial',
        personalPerformance: 'Rendimiento personal',
        billing: 'Facturación',
        plan: 'Plan',
        users: 'Usuarios',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['es-CO'],
      diagnosis: {
        title: 'Diagnóstico empresarial',
        description: 'Ayúdanos a conocer mejor tu empresa y la etapa de gestión para personalizar Índice.',
        centerTitle: 'Centro de diagnóstico empresarial',
        centerDescription: 'Descubre el estado de gestión de tu empresa a través de 4 pilares: Personas, Procesos, Productos y Finanzas. Con las respuestas utilizaremos los índices de Madurez Empresarial (IME), que nos ayudará a personalizar recomendaciones, módulos y mejores compañeros detrás de Índice.',
        questionCount: '10 preguntas cada uno',
        questionCountLabel: 'El diagnóstico contiene',
        progress: 'Progreso del diagnóstico empresarial',
        progressOf: 'completado',
        onboarding: {
          answeredProgress: 'Has respondido {answered} de {total} preguntas',
          encouragementMid: 'Vas muy bien',
          encouragementNear: 'Ya casi terminas',
          sections: {
              people: {
                title: 'Paso 1 — Tu equipo',
                intro: 'Entendamos cómo trabaja tu equipo',
                done: 'Listo — entendemos mejor a tu equipo',
              },
              processes: {
                title: 'Paso 2 — Cómo operas',
                intro: 'Entendamos cómo funciona tu operación diaria',
                done: 'Listo — entendemos cómo operas',
              },
              products: {
                title: 'Paso 3 — Lo que vendes',
                intro: 'Entendamos tu oferta y cómo llega al mercado',
                done: 'Listo — entendemos lo que vendes',
              },
              finance: {
                title: 'Paso 4 — Tus finanzas',
                intro: 'Entendamos cómo controlas tus números',
                done: 'Listo — entendemos tus finanzas',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['es-CO'],
        printDiagnosis: 'Descargar PDF',
        start: 'Comenzar',
        continue: 'Continuar',
        doAgain: 'Hacer de nuevo',
        reviewAnswers: 'Revisar respuestas',
        close: 'Cerrar',
        question: 'Pregunta',
        of: 'de',
        completed: 'completadas',
        previous: 'Anterior',
        next: 'Siguiente',
        finish: 'Finalizar',
        restart: 'Reiniciar diagnóstico',
        actions: {
          save: 'Guardar',
          saving: 'Guardando...',
          discard: 'Descartar',
        },
        scoreSummary: {
          title: 'Puntuación del diagnóstico',
          bmi: 'IME',
          level: 'Nivel',
          answered: 'Respondidas',
          score: 'Puntaje',
        },
        messages: {
          loading: 'Cargando diagnóstico empresarial...',
          loadError: 'No pudimos cargar el diagnóstico empresarial.',
          saveSuccess: 'Se guardó el diagnóstico empresarial.',
          saveError: 'No pudimos guardar el diagnóstico empresarial.',
          unsavedChanges: 'Tienes cambios sin guardar en el diagnóstico empresarial.',
        },
        pillars: {
          people: {
            title: 'Personas',
            description: 'Analiza talentos, estructura de equipo y comunicación.',
          },
          processes: {
            title: 'Procesos',
            description: 'Evalúa flujos, tareas, escalabilidad y eficiencia.',
          },
          products: {
            title: 'Productos',
            description: 'Analiza oferta, mercado, comercial y propuesta de valor.',
          },
          finance: {
            title: 'Finanzas',
            description: 'Evalúa control financiero, gestión y toma de decisiones.',
          },
        },
        questions: {
          people: [
            { question: '¿Cuál es tu rol principal?', options: ['Fundador/CEO', 'Operaciones', 'Finanzas', 'Comercial/Otro'] },
            { question: '¿Cuántas personas trabajan?', options: ['Solo yo', '2 a 5', '6 a 20', '21 o más'] },
            { question: '¿Cómo está organizado tu equipo?', options: ['Sin estructura', 'Roles básicos', 'Áreas definidas', 'Organigrama formal'] },
            { question: '¿Cómo asignan tareas?', options: ['Improvisado', 'Listas', 'Asignación estructurada', 'Sistema de gestión'] },
            { question: '¿Revisión de desempeño?', options: ['Nunca', 'Por problemas', 'Semanal', 'Con KPIs'] },
            { question: '¿Delegación?', options: ['Hago todo', 'Delego y superviso', 'Delego con control', 'Equipo autónomo'] },
            { question: '¿Comunicación interna?', options: ['Informal', 'Chat', 'Reuniones', 'Herramientas formales'] },
            { question: '¿Frecuencia de reuniones?', options: ['Nunca', 'Esporádico', 'Semanal', 'Frecuente'] },
            { question: '¿Claridad de responsabilidades?', options: ['Nada clara', 'Algo clara', 'Bastante clara', 'Totalmente clara'] },
            { question: '¿Facilidad de integración?', options: ['Muy difícil', 'Difícil', 'Moderado', 'Fácil'] },
          ],
          processes: [
            { question: '¿Procesos documentados?', options: ['Nada', 'Algunos', 'Mayoría', 'Totalmente'] },
            { question: '¿Gestión de tareas?', options: ['Improvisado', 'Listas', 'Herramientas', 'Sistema formal'] },
            { question: '¿Monitoreo de avance?', options: ['No se monitorea', 'Ocasional', 'Reportes', 'KPIs'] },
            { question: '¿Automatización?', options: ['Manual', 'Herramientas aisladas', 'Automatización parcial', 'Alta automatización'] },
            { question: '¿Replicabilidad?', options: ['Muy difícil', 'Con esfuerzo', 'Posible', 'Fácil'] },
            { question: '¿Dónde se pierde tiempo?', options: ['Manual', 'Coordinación', 'Información', 'Seguimiento'] },
            { question: '¿Dependencia de personas?', options: ['Total', 'Bastante', 'Algo', 'Poco'] },
            { question: '¿Claridad de procesos?', options: ['Nada claros', 'Algo claros', 'Bastante claros', 'Totalmente claros'] },
            { question: '¿Gestión de errores?', options: ['Reacción', 'Informal', 'Revisión', 'Mejora continua'] },
            { question: '¿Escalabilidad?', options: ['Nula', 'Baja', 'Media', 'Alta'] },
          ],
          products: [
            { question: '¿Qué vendes?', options: ['Servicios', 'Productos', 'Digital', 'Mixto'] },
            { question: '¿Tipo de cliente?', options: ['B2C', 'B2B', 'Gobierno', 'Mixto'] },
            { question: '¿Ingresos principales?', options: ['Venta directa', 'Servicios', 'Suscripción', 'Contratos'] },
            { question: '¿Diversificación?', options: ['Uno', 'Algunos', 'Varias líneas', 'Amplio'] },
            { question: '¿Definición de precios?', options: ['Intuición', 'Competencia', 'Costos', 'Estrategia'] },
            { question: '¿Seguimiento desempeño?', options: ['No se mide', 'Solo ventas', 'Ventas+rentabilidad', 'Indicadores'] },
            { question: '¿Propuesta de valor?', options: ['No clara', 'Algo clara', 'Bastante clara', 'Muy clara'] },
            { question: '¿Feedback cliente?', options: ['No hay', 'Informal', 'Encuestas', 'Análisis'] },
            { question: '¿Evolución producto?', options: ['Sobre la marcha', 'Cambios ocasionales', 'Planes', 'Roadmap'] },
            { question: '¿Prioridad comercial?', options: ['Clientes', 'Ventas actuales', 'Rentabilidad', 'Escalar'] },
          ],
          finance: [
            { question: '¿Control financiero?', options: ['No estructurado', 'Excel', 'Software', 'Sistema integrado'] },
            { question: '¿Revisión de números?', options: ['Nunca', 'Mensual', 'Semanal', 'Diario'] },
            { question: '¿Flujo de efectivo?', options: ['No controlado', 'Reacción', 'Revisión', 'Proyección'] },
            { question: '¿Costos claros?', options: ['No claros', 'Aproximados', 'Bastante claros', 'Control total'] },
            { question: '¿Margen?', options: ['No sé', 'Estimado', 'Claro', 'Totalmente medido'] },
            { question: '¿Decisiones financieras?', options: ['Intuición', 'Experiencia', 'Datos', 'Modelos'] },
            { question: '¿Ingresos predecibles?', options: ['Muy variables', 'Variables', 'Estables', 'Muy estables'] },
            { question: '¿Gestión de deuda?', options: ['Sin control', 'Básico', 'Estrategia', 'Optimizado'] },
            { question: '¿Preparación ante crisis?', options: ['Nula', 'Baja', 'Media', 'Alta'] },
            { question: '¿Cumplimiento fiscal?', options: ['Sin control', 'Retrasos', 'Al día', 'Estrategia fiscal'] },
          ],
        },
      },
      billing: {
        title: 'Facturación',
        subtitle: 'Datos fiscales, método de pago y facturas del servicio',
        fiscalData: {
          title: 'Datos fiscales',
          subtitle: 'Configura tus datos fiscales según el país',
          country: 'País',
          selectCountry: 'Selecciona un país...',
          rfc: 'RFC',
          razonSocial: 'Razón social',
          regimenFiscal: 'Régimen fiscal',
          usoCFDI: 'Uso CFDI (default)',
          codigoPostalFiscal: 'Código Postal (Fiscal)',
          nit: 'NIT',
          responsabilidadFiscal: 'Responsabilidad fiscal',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: 'Razão social',
          inscricaoEstadual: 'Inscrição estadual',
          ein: 'EIN (Tax ID)',
          legalName: 'Legal name',
          state: 'State',
          businessNumber: 'Business Number (BN)',
          province: 'Province',
          taxId: 'ID Fiscal',
          companyName: 'Nombre de la empresa',
          taxRegime: 'Régimen fiscal',
          postalCode: 'Código Postal',
        },
        paymentMethod: {
          title: 'Método de pago',
          subtitle: 'Configura tu método y frecuencia de pago',
          type: 'Tipo de pago preferido',
          selectMethod: 'Selecciona un método...',
          cardNumber: 'Número de tarjeta',
          cvv: 'CVV',
          expirationDate: 'Fecha de expiración',
          cardholderName: 'Nombre en la tarjeta',
          addCard: 'Agregar tarjeta',
          cancel: 'Cancelar',
          savedCards: 'Tarjetas guardadas',
          defaultCard: 'Predeterminada',
          saveCard: 'Guardar tarjeta',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/AA',
            cardholderName: 'Como aparece en la tarjeta',
          },
        },
        automaticBilling: {
          title: 'Facturación automática',
          subtitle: 'Configura renovación, día de cobro y correo de facturas',
          enable: 'Activar renovación automática',
          description: 'Tu suscripción se renovará automáticamente al final del período',
          billingDay: 'Día de facturación',
          selectDay: 'Día 1 de cada mes',
          emailForInvoices: 'Email para facturas',
          reminderNote: 'Recibirás tus facturas en este correo',
        },
        currentBilling: {
          title: 'Resumen de cobro actual',
          plan: 'Plan:',
          notConfigured: 'No configurado',
          amount: 'Monto:',
          nextPayment: 'Próximo cobro:',
        },
        invoices: {
          title: 'Facturas del servicio',
          subtitle: 'Historial de facturas de tu suscripción',
          month: 'Mes',
          year: 'Monto',
          status: 'Estatus',
          downloadPdf: 'Descargar PDF',
          date: 'Fecha',
          concept: 'Concepto',
          amount: 'Monto',
          paid: 'Pagada',
          pending: 'Pendiente',
        },
        billingFrequency: {
          title: 'Frecuencia de facturación',
          note: 'Los pagos pueden tener 100-30 descuento',
          monthly: 'Mensual',
          quarterly: 'Trimestral',
          semiannual: 'Semestral',
          annual: 'Anual',
        },
      },
      structure: {
        title: 'Estructura Empresarial',
        subtitle: 'Organización y unidades de negocio',
        status: {
          connected: 'Backend Spring conectado',
          backendNotice: 'Esta pantalla ahora carga y guarda en el backend de Spring. La identidad de la empresa y los detalles de unidades y negocios capturados aquí se conservan a través de Spring.',
        },
        actions: {
          save: 'Guardar cambios',
          saving: 'Guardando...',
          extract: 'Obtener coordenadas',
          useLocation: 'Usar mi ubicación',
          addUnit: 'Agregar nueva unidad',
          configure: 'Configurar unidad',
          configureGroup: 'Configurar grupo',
          createUnit: 'Agregar otra unidad',
        },
        messages: {
          loading: 'Cargando estructura empresarial...',
          loadError: 'No fue posible cargar la estructura empresarial.',
          saveError: 'No fue posible guardar la estructura empresarial.',
          saveSuccess: 'Estructura Empresarial guardada correctamente.',
          saveOverlay: 'Guardando estructura empresarial...',
          saveOverlayDescription: 'Sincronizando empresa, unidades y negocios con el backend.',
          createUnitTitle: 'Creando unidad...',
          updateUnitTitle: 'Guardando unidad...',
          unitOverlayDescription: 'Actualizando los detalles de la unidad en tu Estructura Empresarial.',
          createUnitSuccess: 'Unidad agregada a la Estructura Empresarial.',
          updateUnitSuccess: 'Unidad actualizada en la Estructura Empresarial.',
          createBusinessTitle: 'Creando negocio...',
          updateBusinessTitle: 'Guardando negocio...',
          businessOverlayDescription: 'Actualizando los detalles del negocio en tu Estructura Empresarial.',
          createBusinessSuccess: 'Negocio agregado a la Estructura Empresarial.',
          updateBusinessSuccess: 'Negocio actualizado en la Estructura Empresarial.',
        },
        mode: {
          title: 'Tipo de operación',
          description: 'Selecciona la opción que mejor describe tu empresa:',
          helper: '💡 Elige cómo funciona tu negocio',
          simple: 'Simple',
          multi: 'Multi-unidad',
          simpleTitle: 'Tengo un solo negocio o sucursal',
          simpleDescription: 'Tienes una sola sucursal o empresa',
          simpleExample: 'Ejemplo: un restaurante, tienda o consultorio',
          multiTitle: 'Tengo varias sucursales o marcas',
          multiDescription: 'Múltiples sucursales, filiales o empresas relacionadas',
          multiExample: 'Ejemplo: varios restaurantes, sucursales o marcas',
          switchPrompt: '¿Tienes más de un negocio o sucursal?',
          switchAction: 'Cambia a multi-unidad',
          multiNote: 'Gestiona múltiples unidades desde una única administración.',
          selected: 'Seleccionado',
          structurePreviewTitle: '🧠 Así funcionará tu estructura',
          structurePreviewLines: [
            'Empresa',
            ' → Ubicación (ej: Cancún, CDMX)',
            '    → Negocio (ej: Restaurante, tienda, hotel)',
          ],
        },
        identity: {
          simple: 'Sede principal de la empresa',
          holding: 'Sede principal de la empresa',
          simpleDesc: 'Nombre, logo, coordenadas, radio y configuración base.',
          holdingDesc: 'Nombre, logo, coordenadas, radio y configuración base.',
          holdingNotice: '💡 Aquí defines desde dónde opera tu negocio',
        },
        headquarters: {
          helper: '💡 Aquí defines desde dónde opera tu negocio',
          context: 'Usaremos esta información para organizar tus operaciones, empleados y reportes',
          basicInfo: '🏢 Información básica de tu empresa',
          industryHelper: 'Esto nos ayuda a adaptar el sistema a tu tipo de negocio',
          locationTitle: '📍 Ubicación de tu negocio',
          locationHelper: 'Esto nos ayuda en funciones como asistencia y control de operaciones',
          addressTitle: '📍 Dirección del negocio',
          addressHelper: 'Completa la dirección para identificar mejor tu ubicación',
          addressNote: 'La dirección es informativa. Usaremos coordenadas para funciones del sistema',
        },
        fields: {
          companyName: 'Nombre de la empresa',
          holdingName: 'Nombre de la empresa',
          industry: 'Industria',
          selectIndustry: 'Selecciona una industria',
          industryHint: 'Esto nos ayuda a adaptar el sistema a tu tipo de negocio',
          country: 'País',
          selectCountry: 'Selecciona un país',
          logo: 'Logo de la empresa',
          logoHolding: 'Logo de oficina corporativa',
          uploadImage: 'Subir imagen',
          noFileSelected: 'Ningún archivo seleccionado',
          uploadHint: 'JPG/PNG/SVG. Máx 1MB.',
          removeLogo: 'Eliminar logo',
          description: 'Descripción',
          optional: '(opcional)',
          basicInfo: 'Información básica',
          location: 'Ubicación',
          contact: 'Contacto',
          operationalInfo: 'Información operativa',
          address: 'Dirección',
          city: 'Ciudad',
          state: 'Estado/Provincia',
          postalCode: 'C.P.',
          phone: 'Teléfono',
          email: 'Email',
          manager: 'Gerente/Responsable',
          schedule: 'Horario',
          logoPreviewAlt: 'Vista previa del logo',
        },
        units: {
          title: '🏬 Tus unidades de negocio',
          subtitle: 'Aquí puedes ver y administrar cómo está organizado tu negocio',
          description: 'Aquí puedes ver y administrar cómo está organizado tu negocio',
          context: 'Cada unidad representa una sucursal, marca o línea de negocio',
          groupLabel: '🧩 Grupo principal',
          mainUnit: 'Unidad principal',
          helper: 'Puedes empezar con una unidad y agregar más conforme tu negocio crezca',
          tip: '💡 Puedes crear unidades para cada sucursal o marca',
          empty: 'Sin negocios aún',
          emptyHelper: 'Agrega tu primer negocio en esta unidad',
          groupContext: 'Cada ubicación agrupa los negocios que operan ahí',
          tipAction: '💡 Puedes empezar con una unidad y agregar más después',
          addUnit: '+ Nueva unidad',
          addBusiness: '+ Agregar negocio',
          unitName: 'Nombre de la unidad',
          unitCountry: 'País de operación',
          businessName: 'Nombre del negocio',
          configureUnit: '⚙️ Configurar unidad',
          configureBusiness: '⚙️ Configurar',
          businessCountSingular: 'negocio',
          businessCountPlural: 'negocios',
        },
        modal: {
          newUnit: 'Nueva unidad de negocio',
          editUnit: 'Editar unidad de negocio',
          newBusiness: 'Nuevo negocio',
          editBusiness: 'Editar negocio',
          save: 'Guardar cambios',
          cancel: 'Cancelar',
          delete: 'Eliminar',
          createBusiness: 'Crear negocio',
          newUnitDescription: 'Agrega una nueva unidad operativa',
          editUnitDescription: 'Edita los datos de',
          newBusinessDescription: 'Agrega un nuevo negocio/sucursal',
          editBusinessDescription: 'Edita los datos de',
          confirmDeleteUnit: '¿Eliminar esta unidad?',
          confirmDeleteBusiness: '¿Eliminar este negocio?',
        },
        placeholders: {
          unitName: 'Ej. Ciudad de México, Norte, Región Centro...',
          businessName: 'Ej. Sucursal Centro, Tienda Polanco, Almacén Sur...',
          address: 'Calle, número, colonia...',
          city: 'Ciudad',
          state: 'Estado',
          postalCode: '00000',
          phone: '+52 55 1234 5678',
          unitEmail: 'unidad@empresa.com',
          businessEmail: 'negocio@empresa.com',
          manager: 'Nombre del responsable',
          schedule: 'Lun-Vie 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ Retail / Comercio' },
            { value: 'food', label: '🍔 Alimentos y Bebidas' },
            { value: 'hospitality', label: '🏨 Hotelería y Hospitalidad' },
            { value: 'tech', label: '💻 Tecnología' },
            { value: 'software-saas', label: '🧩 Software / SaaS' },
            { value: 'health', label: '🏥 Salud' },
            { value: 'beauty-wellness', label: '💅 Belleza y Bienestar' },
            { value: 'education', label: '🎓 Educación' },
            { value: 'services', label: '💼 Servicios Profesionales' },
            { value: 'consulting', label: '🧠 Consultoría' },
            { value: 'legal', label: '⚖️ Legal' },
            { value: 'accounting-tax', label: '🧾 Contabilidad e Impuestos' },
            { value: 'finance-insurance', label: '💰 Finanzas y Seguros' },
            { value: 'real-estate', label: '🏢 Bienes Raíces' },
            { value: 'construction', label: '🏗️ Construcción' },
            { value: 'architecture-engineering', label: '📐 Arquitectura e Ingeniería' },
            { value: 'manufacturing', label: '🏭 Manufactura' },
            { value: 'wholesale-distribution', label: '📦 Mayoreo y Distribución' },
            { value: 'logistics-transportation', label: '🚚 Transporte y Logística' },
            { value: 'automotive', label: '🚗 Automotriz' },
            { value: 'agriculture', label: '🌾 Agricultura' },
            { value: 'energy-utilities', label: '⚡ Energía y Servicios Públicos' },
            { value: 'telecommunications', label: '📡 Telecomunicaciones' },
            { value: 'marketing-advertising', label: '📣 Marketing y Publicidad' },
            { value: 'media-creative', label: '🎨 Medios y Creatividad' },
            { value: 'entertainment-events', label: '🎭 Entretenimiento y Eventos' },
            { value: 'tourism-travel', label: '✈️ Turismo y Viajes' },
            { value: 'sports-fitness', label: '🏋️ Deportes y Fitness' },
            { value: 'cleaning-facility', label: '🧹 Limpieza e Instalaciones' },
            { value: 'maintenance-repair', label: '🔧 Mantenimiento y Reparación' },
            { value: 'security', label: '🛡️ Seguridad' },
            { value: 'ecommerce', label: '🛒 E-commerce' },
            { value: 'import-export', label: '🌐 Importación / Exportación' },
            { value: 'nonprofit', label: '🤝 ONG / Sin fines de lucro' },
            { value: 'government-public', label: '🏛️ Gobierno / Sector público' },
            { value: 'pet-services', label: '🐾 Mascotas' },
            { value: 'childcare', label: '👶 Cuidado infantil' },
            { value: 'senior-care', label: '🧓 Cuidado de adultos mayores' },
            { value: 'pharmaceutical', label: '💊 Farmacéutica' },
            { value: 'other', label: '📦 Otro' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ Restaurante y Alimentos' },
            { value: 'retail', label: '🛍️ Retail y Comercio' },
            { value: 'servicios', label: '💼 Servicios Profesionales' },
            { value: 'salud', label: '⚕️ Salud y Bienestar' },
            { value: 'educacion', label: '📚 Educación' },
            { value: 'tecnologia', label: '💻 Tecnología' },
            { value: 'construccion', label: '🏗️ Construcción' },
            { value: 'manufactura', label: '🏭 Manufactura' },
            { value: 'hospitalidad', label: '🏨 Hospitalidad y Turismo' },
            { value: 'inmobiliaria', label: '🏢 Bienes Raíces' },
            { value: 'transporte', label: '🚚 Transporte y Logística' },
            { value: 'entretenimiento', label: '🎭 Entretenimiento' },
            { value: 'financiero', label: '💰 Servicios Financieros' },
            { value: 'agricultura', label: '🌾 Agricultura' },
            { value: 'otro', label: '📦 Otro' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 México' },
            { value: 'US', label: '🇺🇸 Estados Unidos' },
            { value: 'CA', label: '🇨🇦 Canadá' },
            { value: 'ES', label: '🇪🇸 España' },
            { value: 'CO', label: '🇨🇴 Colombia' },
            { value: 'AR', label: '🇦🇷 Argentina' },
            { value: 'BR', label: '🇧🇷 Brasil' },
            { value: 'CL', label: '🇨🇱 Chile' },
          ],
        },
      },
      profile: {
        title: 'Tu perfil',
        subtitle: 'Así aparecerás dentro del sistema',
        helper: 'Puedes completar esto en cualquier momento',
        fields: {
          fullName: 'Nombre completo',
          email: 'Correo electrónico',
          phone: 'Teléfono',
          position: 'Puesto',
          department: 'Departamento',
          profilePhoto: 'Foto de perfil',
          country: 'País',
          uploadPhoto: 'Subir mi foto',
          firstNames: 'Nombre o nombres',
          lastNames: 'Apellido o apellidos',
          preferredLanguage: 'Idioma preferido',
          newPassword: 'Nueva contraseña',
          confirmNewPassword: 'Confirmar contraseña',
        },
        sections: {
          identityTitle: 'Identidad',
          identitySubtitle: 'Así te verán dentro del sistema',
          contactTitle: 'Información de contacto',
          contactSubtitle: 'Aquí te avisaremos sobre lo importante',
          securityTitle: 'Seguridad de la cuenta',
          securitySubtitle: 'Mantén tu cuenta segura',
          preferencesTitle: 'Preferencias',
          preferencesSubtitle: 'Personaliza el idioma de la interfaz.',
          nameGroup: 'Tu nombre',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, máx. 25MB; se comprime al subir',
          firstNames: 'En algunos países puedes usar uno o varios nombres.',
          lastNames: 'Puede ser 1 (USA/Canadá) o 2 (México/Colombia).',
          phone: 'El país define la clave telefónica automáticamente.',
          password: 'Si no quieres cambiarla, déjala vacía.',
          preferredLanguage: 'Usaremos este idioma para la interfaz y plantillas.',
        },
        actions: {
          save: 'Guardar cambios',
          saving: 'Guardando...',
          discard: 'Descartar',
        },
        messages: {
          loading: 'Cargando perfil...',
          saveSuccess: 'Perfil guardado.',
          loadError: 'No fue posible cargar el perfil.',
          saveError: 'No fue posible guardar el perfil.',
          unsavedChanges: 'Tienes cambios sin guardar.',
          optional: '(opcional)',
          savingOverlay: 'Guardando perfil...',
          passwordMismatch: 'La nueva contraseña y su confirmación deben coincidir.',
          passwordMinLength: 'La nueva contraseña debe tener al menos 8 caracteres.',
          invalidPhone: 'Ingresa un número de teléfono válido para el país seleccionado.',
        },
      },
      users: {
        title: 'Usuarios',
        subtitle: 'Gestiona usuarios y permisos del sistema',
        invite: 'Invitar usuario',
        search: 'Buscar usuario...',
        filters: {
          all: 'Todos',
          active: 'Activos',
          pending: 'Pendientes',
          inactive: 'Inactivos',
        },
        roles: {
          superAdmin: 'Super Admin',
          admin: 'Admin',
          user: 'Usuario',
        },
        status: {
          active: 'Activo',
          pending: 'Pendiente',
          inactive: 'Inactivo',
        },
        table: {
          name: 'Nombre',
          email: 'Email',
          role: 'Rol',
          status: 'Estatus',
          modules: 'Módulos',
          actions: 'Acciones',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['es-CO'],
        actions: {
          edit: 'Editar',
          resend: 'Reenviar invitación',
          delete: 'Eliminar',
        },
        modal: {
          newUser: 'Nuevo usuario',
          editUser: 'Editar usuario',
          name: 'Nombre',
          email: 'Correo electrónico',
          role: 'Rol',
          selectRole: 'Selecciona un rol',
          modules: 'Módulos',
          selectModules: 'Selecciona módulos...',
          inviteLink: 'Link de invitación',
          copyLink: 'Copiar link',
          copied: '✓ Copiado',
          save: 'Guardar',
          cancel: 'Cancelar',
          send: 'Enviar invitación',
        },
      },
      plan: {
        title: 'Elige el plan que más se ajuste a tu empresa',
        subtitle: 'Todos los planes incluyen Modo Aprendiz y actualizaciones continuas',
        mostPopular: 'Más popular',
        plans: {
          inicio: {
            name: 'Inicio',
            description: 'Comienza a organizar tu negocio',
            button: 'Elegir Inicio',
          },
          controla: {
            name: 'Controla',
            description: 'Bases sólidas para ordenar y controlar',
            button: 'Elegir Controla',
          },
          escala: {
            name: 'Escala',
            description: 'Optimiza áreas, estandariza procesos',
            button: 'Elegir Escala',
          },
          corporativiza: {
            name: 'Corporativiza',
            description: 'Automatiza con IA corporativa y visión integral',
            button: 'Elegir Corporativiza',
          },
        },
        features: {
          humanResources: 'Recursos Humanos',
          processes: 'Procesos y Tareas',
          products: 'Productos (POS / CRM)',
          finance: 'Finanzas (Gastos / Caja)',
          kpisBasic: 'KPIs Básicos',
          kpisComplete: 'KPIs Completos',
          kpisAdvanced: 'KPIs Avanzados',
          kpisCorporate: 'KPIs Corporativos',
          users5: 'Hasta 5 usuarios',
          users10: 'Hasta 10 usuarios',
          users20: 'Hasta 20 usuarios',
          users25: 'Hasta 25 usuarios',
          complementaryModules: 'Módulos complementarios',
          modules2: '2 módulos complementarios',
          modules4: '4 módulos complementarios',
          allModules: 'Todos los módulos',
          aiAnalytics: 'IA Analítica y Ventas',
          integrations: 'Integraciones',
          sessions1: '1 sesión/mes',
          sessions2: '2 sesiones/mes',
          sessions4: '4 sesiones/mes',
        },
        additionalInfo: {
          title: 'Información adicional',
          extraUser: 'Usuario adicional',
          extraUserPrice: '+$10 USD por usuario extra en cualquier plan',
          learningMode: 'Modo Aprendiz',
          learningModeDesc: 'Incluido en todos los planes sin costo adicional',
          updates: 'Actualizaciones',
          updatesDesc: 'Todas las mejoras incluidas automáticamente',
        },
      },
    },
  },
  'en-US': {
    header: {
      notifications: 'Notifications',
      profile: 'My profile',
      settings: 'Settings',
      logout: 'Log out',
      learningMode: 'Operational journey',
    },
    sections: {
      kpis: 'Your KPIs',
      favorites: 'Your favorites',
      quickAccess: 'Quick access',
      basicModules: 'Basic modules',
      main: 'Main',
      complementaryModules: 'Complementary modules',
      additional: 'Additional',
      aiModules: 'Artificial intelligence',
      aiLabel: 'AI Modules',
      configureKpis: 'Configure KPIs',
    },
    kpis: {
      weeklyRevenue: 'Weekly Revenue',
      netProfit: 'Net Profit',
      activeClients: 'Active Clients',
      activeEmployees: 'Active Employees',
      pendingTasks: 'Pending Tasks',
      monthlyExpenses: 'Monthly Expenses',
      vsWeekBefore: 'vs last week',
      thisMonth: 'this month',
      newOnes: 'new',
      dueToday: 'due today',
      vsMonthBefore: 'vs last month',
    },
    modules: {
      panelInicial: 'Home Panel',
      recursosHumanos: 'Human Resources',
      procesosTareas: 'Processes and tasks',
      gastos: 'Expenses',
      cajaChica: 'Petty cash',
      puntoVenta: 'Point of sale',
      ventas: 'Sales',
      cartera: 'Receivables',
      kpis: 'KPIs',
      mantenimiento: 'Maintenance',
      inventarios: 'Inventory',
      controlMinutas: 'Minutes control',
      limpieza: 'Cleaning',
      lavanderia: 'Laundry',
      transportacion: 'Transportation',
      vehiculosMaquinaria: 'Vehicles and machinery',
      inmuebles: 'Real estate',
      formularios: 'Forms',
      facturacion: 'Billing',
      correoElectronico: 'Email',
      climaLaboral: 'Work climate',
      afiliados: 'Affiliates',
      indiceAgenteVentas: 'Sales Agent Index',
      indiceAnalitica: 'Analytics Index',
      capacitacion: 'Training',
      indiceCoach: 'Coach Index',
    },
    notifications: {
      newTask: 'New task assigned',
      expensePending: 'Expense pending approval',
      newClient: 'New client registered',
      timeAgo: {
        minutes: '5 minutes ago',
        hour: '1 hour ago',
        hours: '2 hours ago',
      },
    },
	    loginPage: {
	      logoAlt: 'Indice logo',
	      workspaceBadge: 'Operational clarity',
	      accessBadge: 'Indice access',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Indice operating framework',
	      title: 'Run your business with clarity.',
	      subtitle:
	        'Connect people, processes, products, and finance into one operational workspace designed for growing businesses.',
	      pillars: [
	        {
	          icon: '👥',
	          title: 'People',
	          description: 'Teams, responsibilities, and daily activity with clearer visibility.',
	        },
	        {
	          icon: '⚙️',
	          title: 'Processes',
	          description: 'Structured workflows to execute, follow up, and reduce operational noise.',
	        },
	        {
	          icon: '📦',
	          title: 'Products',
	          description: 'Catalogues, commercial operations, and inventory connected to the business.',
	        },
	        {
	          icon: '📊',
	          title: 'Finance',
	          description: 'Financial control and operating insight for better decisions.',
	        },
	      ],
	      featureCards: [
	        {
	          title: 'Operational Visibility',
	          description: 'Understand what is happening across your business.',
	        },
	        {
	          title: 'Business Control',
	          description: 'Centralize execution and reduce operational chaos.',
	        },
	        {
	          title: 'Better Decisions',
	          description: 'Turn daily activity into actionable insight.',
	        },
	      ],
	      visualTitle: 'Structured growth',
	      visualSubtitle:
	        'Indice organizes operations into connected pillars so every team works with context and direction.',
	      visualMetricValue: '4',
	      visualMetricLabel: 'connected pillars',
	      visualSignalLabel: 'Operating system',
	      welcomeTitle: 'Access your workspace',
	      welcomeText:
	        'Continue daily execution with visibility, control, and business context.',
	      emailLabel: 'Email',
	      emailPlaceholder: 'you@company.com',
	      emailError: 'Enter a valid email address.',
	      passwordLabel: 'Password',
	      passwordPlaceholder: 'Enter your password',
	      forgotPassword: 'Forgot password?',
	      hidePassword: 'Hide password',
	      showPassword: 'Show password',
	      signIn: 'Sign in',
	      signingIn: 'Signing in...',
	      successToast: 'Signed in successfully.',
	      errorFallback: 'Unable to sign in.',
	      insideTitle: "What you'll access",
	      insideItems: ['Operational visibility', 'Team activity', 'Financial control', 'Business performance'],
	      resetBadge: 'Access recovery',
	      resetTitle: 'Reset your password',
	      resetDescription:
	        'Enter your account email. If it exists, we will send a reset link with limited validity.',
	      resetCloseLabel: 'Close password reset',
	      resetCancel: 'Cancel',
	      resetSubmit: 'Send reset link',
	      resetSubmitting: 'Sending link...',
	      resetSuccessFallback: 'If that email exists, a password reset link has been sent.',
	      resetErrorFallback: 'Password reset request could not be sent.',
	    },
    learningMode: {
      welcome: 'Welcome to Learning Mode!',
      hide: 'Hide',
      show: 'Show',
      businessBase: 'Business Base',
      clearBusinessStable: 'Clear Business Stable',
      functions: 'Functions',
      businessContext: 'Business Context',
      indiceMethodology: 'Indice Methodology',
      addModule: 'Open',
      viewBasicModules: 'View Basic Modules',
      previous: 'Previous',
      next: 'Next',
      stepOf: 'Step of',
      modules: {
        panelInicial: {
          title: 'Home Panel',
          subtitle: '🎯 Your starting point',
          description: 'The Home Panel is the starting point for organizing your company within the Indice system. 🏢 Here you define the basic information of your business and configure the structure that will allow all other modules to function properly. ✨ When this foundation is well configured, the system can help you manage people, processes, products, and finances with greater clarity.',
          functions: [
            '📊 Update your company data and keep your information always up to date.',
            '⚙️ Configure system preferences, such as language, currency, and operational settings.',
            '📋 Define the basic business information that other modules will use.',
            '🏗️ Establish your company structure and how its operation is organized.',
            '👥 Invite users and manage their access, assigning roles and permissions to each collaborator.',
            '🎓 Conduct initial business assessments that will help you understand what stage your company is in.',
            '📈 Calculate the BMI — Business Maturity Index, a tool that analyzes your business\'s current state and guides you on how to improve its management.',
          ],
          context: '💡 This module allows you to have an overview of your company and begin to structure how your business operates. When this foundation is well defined, all other system processes become clearer and easier to manage.',
          quote: '🏆 Organization is the first step to building a solid business.',
        },
        recursosHumanos: {
          title: 'Human Resources',
          subtitle: 'Manage your team',
          description: 'Manage employee and human resource information.',
          functions: ['View employees', 'Manage contracts'],
          context: 'This module allows you to effectively manage your team.',
          quote: 'Talent is the key to success.',
        },
        procesosTareas: {
          title: 'Processes and tasks',
          subtitle: 'Organize your work',
          description: 'Manage and perform important tasks and processes for your business.',
          functions: ['Create tasks', 'View processes'],
          context: 'This module helps you keep your business organized.',
          quote: 'Organization is the key to efficiency.',
        },
        gastos: {
          title: 'Expenses',
          subtitle: 'Control your expenses',
          description: 'Manage and control your expenses to keep your business in good condition.',
          functions: ['View expenses', 'Approve expenses'],
          context: 'This module allows you to effectively control your expenses.',
          quote: 'Expense control is fundamental for success.',
        },
        cajaChica: {
          title: 'Petty cash',
          subtitle: 'Minor expenses',
          description: 'Manage minor expenses for your business.',
          functions: ['View petty cash', 'Approve expenses'],
          context: 'This module allows you to efficiently manage minor expenses.',
          quote: 'Petty cash is essential for minor expenses.',
        },
        puntoVenta: {
          title: 'Point of sale',
          subtitle: 'Sell your products',
          description: 'Manage and perform sales for your business.',
          functions: ['Make sales', 'View sales'],
          context: 'This module allows you to efficiently sell your products.',
          quote: 'Sales are the key to success.',
        },
        ventas: {
          title: 'Sales',
          subtitle: 'Manage your sales',
          description: 'Manage and analyze your sales to improve your business.',
          functions: ['View sales', 'Analyze sales'],
          context: 'This module allows you to manage and analyze your sales.',
          quote: 'Sales are the foundation of your business.',
        },
        kpis: {
          title: 'KPIs',
          subtitle: 'Key metrics',
          description: 'Manage and analyze your KPIs to improve your business.',
          functions: ['View KPIs', 'Configure KPIs'],
          context: 'This module allows you to manage and analyze your KPIs.',
          quote: 'KPIs are essential for performance tracking.',
        },
      },
    },
    panelInicial: {
      title: 'Home Panel',
      back: 'Back',
      tabs: {
        profile: 'Profile',
        businessStructure: 'Business Structure',
        businessProfile: 'Business Profile',
        personalPerformance: 'Personal Performance',
        billing: 'Billing',
        plan: 'Plan',
        users: 'Users',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['en-US'],
      diagnosis: {
        title: 'Business Diagnosis',
        description: 'Help us better understand your company and management stage to personalize Indice.',
        centerTitle: 'Business Diagnosis Center',
        centerDescription: 'Discover your company\'s management status through 4 pillars: People, Processes, Products, and Finance. With your answers, we\'ll use the Business Maturity Index (BMI), which will help us personalize recommendations, modules, and best partners behind Indice.',
        questionCount: '10 questions each',
        questionCountLabel: 'The diagnosis contains',
        progress: 'Business diagnosis progress',
        progressOf: 'completed',
        onboarding: {
          answeredProgress: 'You\'ve answered {answered} of {total} questions',
          encouragementMid: 'You\'re making great progress',
          encouragementNear: 'Almost done',
          sections: {
              people: {
                title: 'Step 1 — Your team',
                intro: 'Let\'s understand how your team works',
                done: 'Done — we understand your team',
              },
              processes: {
                title: 'Step 2 — How you operate',
                intro: 'Let\'s understand how your daily operation works',
                done: 'Done — we understand how you operate',
              },
              products: {
                title: 'Step 3 — What you sell',
                intro: 'Let\'s understand your offer and how it reaches the market',
                done: 'Done — we understand what you sell',
              },
              finance: {
                title: 'Step 4 — Your finances',
                intro: 'Let\'s understand how you manage your numbers',
                done: 'Done — we understand your finances',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['en-US'],
        printDiagnosis: 'Download PDF',
        start: 'Start',
        continue: 'Continue',
        doAgain: 'Do again',
        reviewAnswers: 'Review answers',
        close: 'Close',
        question: 'Question',
        of: 'of',
        completed: 'completed',
        previous: 'Previous',
        next: 'Next',
        finish: 'Finish',
        restart: 'Restart diagnosis',
        actions: {
          save: 'Save',
          saving: 'Saving...',
          discard: 'Discard',
        },
        scoreSummary: {
          title: 'Diagnosis score',
          bmi: 'BMI',
          level: 'Level',
          answered: 'Answered',
          score: 'Score',
        },
        messages: {
          loading: 'Loading business diagnosis...',
          loadError: 'We could not load the business diagnosis.',
          saveSuccess: 'Business diagnosis saved.',
          saveError: 'We could not save the business diagnosis.',
          unsavedChanges: 'You have unsaved changes in the business diagnosis.',
        },
        pillars: {
          people: {
            title: 'People',
            description: 'Analyze talent, team structure, and communication.',
          },
          processes: {
            title: 'Processes',
            description: 'Evaluate flows, tasks, scalability, and efficiency.',
          },
          products: {
            title: 'Products',
            description: 'Analyze offering, market, sales, and value proposition.',
          },
          finance: {
            title: 'Finance',
            description: 'Evaluate financial control, management, and decision-making.',
          },
        },
        questions: {
          people: [
            { question: 'What is your main role?', options: ['Founder/CEO', 'Operations', 'Finance', 'Sales/Other'] },
            { question: 'How many people work?', options: ['Just me', '2 to 5', '6 to 20', '21 or more'] },
            { question: 'How is your team organized?', options: ['No structure', 'Basic roles', 'Defined areas', 'Formal org chart'] },
            { question: 'How do you assign tasks?', options: ['Improvised', 'Lists', 'Structured assignment', 'Management system'] },
            { question: 'Performance review?', options: ['Never', 'For problems', 'Weekly', 'With KPIs'] },
            { question: 'Delegation?', options: ['I do everything', 'Delegate and supervise', 'Delegate with control', 'Autonomous team'] },
            { question: 'Internal communication?', options: ['Informal', 'Chat', 'Meetings', 'Formal tools'] },
            { question: 'Meeting frequency?', options: ['Never', 'Sporadic', 'Weekly', 'Frequent'] },
            { question: 'Clarity of responsibilities?', options: ['Not clear', 'Somewhat clear', 'Quite clear', 'Totally clear'] },
            { question: 'Ease of integration?', options: ['Very difficult', 'Difficult', 'Moderate', 'Easy'] },
          ],
          processes: [
            { question: 'Documented processes?', options: ['Nothing', 'Some', 'Most', 'Completely'] },
            { question: 'Task management?', options: ['Improvised', 'Lists', 'Tools', 'Formal system'] },
            { question: 'Progress monitoring?', options: ['Not monitored', 'Occasional', 'Reports', 'KPIs'] },
            { question: 'Automation?', options: ['Manual', 'Isolated tools', 'Partial automation', 'High automation'] },
            { question: 'Replicability?', options: ['Very difficult', 'With effort', 'Possible', 'Easy'] },
            { question: 'Where is time lost?', options: ['Manual work', 'Coordination', 'Information', 'Follow-up'] },
            { question: 'Dependence on people?', options: ['Total', 'Quite a bit', 'Some', 'Little'] },
            { question: 'Process clarity?', options: ['Not clear', 'Somewhat clear', 'Quite clear', 'Totally clear'] },
            { question: 'Error management?', options: ['Reaction', 'Informal', 'Review', 'Continuous improvement'] },
            { question: 'Scalability?', options: ['None', 'Low', 'Medium', 'High'] },
          ],
          products: [
            { question: 'What do you sell?', options: ['Services', 'Products', 'Digital', 'Mixed'] },
            { question: 'Type of client?', options: ['B2C', 'B2B', 'Government', 'Mixed'] },
            { question: 'Main revenue?', options: ['Direct sale', 'Services', 'Subscription', 'Contracts'] },
            { question: 'Diversification?', options: ['One', 'Some', 'Several lines', 'Broad'] },
            { question: 'Price definition?', options: ['Intuition', 'Competition', 'Costs', 'Strategy'] },
            { question: 'Performance tracking?', options: ['Not measured', 'Sales only', 'Sales+profitability', 'Indicators'] },
            { question: 'Value proposition?', options: ['Not clear', 'Somewhat clear', 'Quite clear', 'Very clear'] },
            { question: 'Customer feedback?', options: ['None', 'Informal', 'Surveys', 'Analysis'] },
            { question: 'Product evolution?', options: ['On the go', 'Occasional changes', 'Plans', 'Roadmap'] },
            { question: 'Commercial priority?', options: ['Clients', 'Current sales', 'Profitability', 'Scale'] },
          ],
          finance: [
            { question: 'Financial control?', options: ['Unstructured', 'Excel', 'Software', 'Integrated system'] },
            { question: 'Number review?', options: ['Never', 'Monthly', 'Weekly', 'Daily'] },
            { question: 'Cash flow?', options: ['Not controlled', 'Reaction', 'Review', 'Projection'] },
            { question: 'Clear costs?', options: ['Not clear', 'Approximate', 'Quite clear', 'Total control'] },
            { question: 'Margin?', options: ['Don\'t know', 'Estimated', 'Clear', 'Fully measured'] },
            { question: 'Financial decisions?', options: ['Intuition', 'Experience', 'Data', 'Models'] },
            { question: 'Predictable income?', options: ['Very variable', 'Variable', 'Stable', 'Very stable'] },
            { question: 'Debt management?', options: ['No control', 'Basic', 'Strategy', 'Optimized'] },
            { question: 'Crisis preparedness?', options: ['None', 'Low', 'Medium', 'High'] },
            { question: 'Tax compliance?', options: ['No control', 'Delays', 'Up to date', 'Tax strategy'] },
          ],
        },
      },
      billing: {
        title: 'Billing',
        subtitle: 'Tax data, payment method and service invoices',
        fiscalData: {
          title: 'Tax Data',
          subtitle: 'Configure your tax data according to country',
          country: 'Country',
          selectCountry: 'Select a country...',
          rfc: 'RFC',
          razonSocial: 'Legal name',
          regimenFiscal: 'Tax regime',
          usoCFDI: 'CFDI use (default)',
          codigoPostalFiscal: 'Postal Code (Tax)',
          nit: 'NIT',
          responsabilidadFiscal: 'Tax responsibility',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: 'Legal name',
          inscricaoEstadual: 'State registration',
          ein: 'EIN (Tax ID)',
          legalName: 'Legal name',
          state: 'State',
          businessNumber: 'Business Number (BN)',
          province: 'Province',
          taxId: 'Tax ID',
          companyName: 'Company name',
          taxRegime: 'Tax regime',
          postalCode: 'Postal Code',
        },
        paymentMethod: {
          title: 'Payment Method',
          subtitle: 'Configure your method and payment frequency',
          type: 'Preferred payment type',
          selectMethod: 'Select a method...',
          cardNumber: 'Card number',
          cvv: 'CVV',
          expirationDate: 'Expiration date',
          cardholderName: 'Name on card',
          addCard: 'Add card',
          cancel: 'Cancel',
          savedCards: 'Saved cards',
          defaultCard: 'Default card',
          saveCard: 'Save card',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/YY',
            cardholderName: 'As it appears on card',
          },
        },
        automaticBilling: {
          title: 'Automatic Billing',
          subtitle: 'Configure renewal, billing day and invoice email',
          enable: 'Enable automatic renewal',
          description: 'Your subscription will renew automatically at the end of the period',
          billingDay: 'Billing day',
          selectDay: 'Day 1 of each month',
          emailForInvoices: 'Email for invoices',
          reminderNote: 'You will receive your invoices at this email',
        },
        currentBilling: {
          title: 'Current Billing Summary',
          plan: 'Plan:',
          notConfigured: 'Not configured',
          amount: 'Amount:',
          nextPayment: 'Next payment:',
        },
        invoices: {
          title: 'Service Invoices',
          subtitle: 'History of your subscription invoices',
          month: 'Month',
          year: 'Amount',
          status: 'Status',
          downloadPdf: 'Download PDF',
          date: 'Date',
          concept: 'Concept',
          amount: 'Amount',
          paid: 'Paid',
          pending: 'Pending',
        },
        billingFrequency: {
          title: 'Billing Frequency',
          note: 'Payments may have 100-30 discount',
          monthly: 'Monthly',
          quarterly: 'Quarterly',
          semiannual: 'Semiannual',
          annual: 'Annual',
        },
      },
      structure: {
        title: 'Business Structure',
        subtitle: 'Organization and business units',
        status: {
          connected: 'Spring backend connected',
          backendNotice: 'This screen now loads from and saves to the Spring backend. Company identity plus the unit and business details captured in this form are persisted through Spring.',
        },
        actions: {
          save: 'Save changes',
          saving: 'Saving...',
          extract: 'Get coordinates',
          useLocation: 'Use my location',
          addUnit: 'Add new unit',
          configure: 'Configure unit',
          configureGroup: 'Configure group',
          createUnit: 'Add another unit',
        },
        messages: {
          loading: 'Loading business structure...',
          loadError: 'Unable to load business structure.',
          saveError: 'Unable to save business structure.',
          saveSuccess: 'Business Structure saved successfully.',
          saveOverlay: 'Saving business structure...',
          saveOverlayDescription: 'Syncing company, unit, and business details with the backend.',
          createUnitTitle: 'Creating unit...',
          updateUnitTitle: 'Saving unit...',
          unitOverlayDescription: 'Updating the unit details in your Business Structure.',
          createUnitSuccess: 'Unit added to Business Structure.',
          updateUnitSuccess: 'Unit updated in Business Structure.',
          createBusinessTitle: 'Creating business...',
          updateBusinessTitle: 'Saving business...',
          businessOverlayDescription: 'Updating the business details in your Business Structure.',
          createBusinessSuccess: 'Business added to Business Structure.',
          updateBusinessSuccess: 'Business updated in Business Structure.',
        },
        mode: {
          title: 'Operation type',
          description: 'Select the option that best describes your company:',
          helper: '💡 Choose how your business works',
          simple: 'Simple',
          multi: 'Multi-unit',
          simpleTitle: 'I have one business or branch',
          simpleDescription: 'You have one branch or company',
          simpleExample: 'Example: a restaurant, shop, or clinic',
          multiTitle: 'I have several branches or brands',
          multiDescription: 'Multiple branches, subsidiaries or related companies',
          multiExample: 'Example: several restaurants, branches, or brands',
          switchPrompt: 'Do you have more than one business or branch?',
          switchAction: 'Switch to multi-unit',
          multiNote: 'Manage multiple units from a single administration.',
          selected: 'Selected',
          structurePreviewTitle: '🧠 This is how your structure will work',
          structurePreviewLines: [
            'Company',
            ' → Location (e.g. Cancun, Mexico City)',
            '    → Business (e.g. Restaurant, store, hotel)',
          ],
        },
        identity: {
          simple: 'Corporate office',
          holding: 'Corporate office',
          simpleDesc: 'Company name, logo, coordinates, radius and base configuration.',
          holdingDesc: 'Company name, logo, coordinates, radius and base configuration.',
          holdingNotice: '💡 Define where your business operates from here.',
        },
        headquarters: {
          helper: '💡 Define where your business operates from here.',
          context: 'We will use this information to organize your operations, employees, and reports.',
          basicInfo: '🏢 Basic company information',
          industryHelper: 'This helps us adapt the system to your type of business.',
          locationTitle: '📍 Business location',
          locationHelper: 'This helps with features like attendance and operations control.',
          addressTitle: '📍 Business address',
          addressHelper: 'Complete the address to identify your location more clearly',
          addressNote: 'The address is for reference. We will use coordinates for system features.',
        },
        fields: {
          companyName: 'Company name',
          holdingName: 'Company name',
          industry: 'Industry',
          selectIndustry: 'Select an industry',
          industryHint: 'This helps us adapt the system to your type of business.',
          country: 'Country',
          selectCountry: 'Select a country',
          logo: 'Company logo',
          logoHolding: 'Corporate office logo',
          uploadImage: 'Upload image',
          noFileSelected: 'No file selected',
          uploadHint: 'JPG/PNG/SVG. Max 1MB.',
          removeLogo: 'Remove logo',
          description: 'Description',
          optional: '(optional)',
          basicInfo: 'Basic information',
          location: 'Location',
          contact: 'Contact',
          operationalInfo: 'Operational information',
          address: 'Address',
          city: 'City',
          state: 'State/Province',
          postalCode: 'Postal code',
          phone: 'Phone',
          email: 'Email',
          manager: 'Manager/Owner',
          schedule: 'Schedule',
          logoPreviewAlt: 'Logo preview',
        },
        units: {
          title: '🏬 Your business units',
          subtitle: 'Here you can view and manage how your business is organized',
          description: 'Here you can view and manage how your business is organized',
          context: 'Each unit represents a branch, brand, or line of business',
          groupLabel: '🧩 Main group',
          mainUnit: 'Main unit',
          helper: 'You can start with one unit and add more as your business grows',
          tip: '💡 You can create units for each branch or brand',
          empty: 'No businesses yet',
          emptyHelper: 'Add your first business in this unit',
          groupContext: 'Each location groups the businesses that operate there',
          tipAction: '💡 You can start with one unit and add more later',
          addUnit: '+ New unit',
          addBusiness: '+ Add business',
          unitName: 'Unit name',
          unitCountry: 'Operating country',
          businessName: 'Business name',
          configureUnit: '⚙️ Configure unit',
          configureBusiness: '⚙️ Configure',
          businessCountSingular: 'business',
          businessCountPlural: 'businesses',
        },
        modal: {
          newUnit: 'New business unit',
          editUnit: 'Edit business unit',
          newBusiness: 'New business',
          editBusiness: 'Edit business',
          save: 'Save changes',
          cancel: 'Cancel',
          delete: 'Delete',
          createBusiness: 'Create business',
          newUnitDescription: 'Add a new operating unit',
          editUnitDescription: 'Edit the details of',
          newBusinessDescription: 'Add a new business/branch',
          editBusinessDescription: 'Edit the details of',
          confirmDeleteUnit: 'Delete this unit?',
          confirmDeleteBusiness: 'Delete this business?',
        },
        placeholders: {
          unitName: 'E.g. Mexico City, North, Central Region...',
          businessName: 'E.g. Downtown branch, Polanco store, South warehouse...',
          address: 'Street, number, district...',
          city: 'City',
          state: 'State',
          postalCode: '00000',
          phone: '+1 416 555 1234',
          unitEmail: 'unit@company.com',
          businessEmail: 'business@company.com',
          manager: 'Manager name',
          schedule: 'Mon-Fri 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ Retail / Commerce' },
            { value: 'food', label: '🍔 Food and Beverage' },
            { value: 'hospitality', label: '🏨 Hospitality' },
            { value: 'tech', label: '💻 Technology' },
            { value: 'software-saas', label: '🧩 Software / SaaS' },
            { value: 'health', label: '🏥 Health' },
            { value: 'beauty-wellness', label: '💅 Beauty and Wellness' },
            { value: 'education', label: '🎓 Education' },
            { value: 'services', label: '💼 Professional Services' },
            { value: 'consulting', label: '🧠 Consulting' },
            { value: 'legal', label: '⚖️ Legal' },
            { value: 'accounting-tax', label: '🧾 Accounting and Tax' },
            { value: 'finance-insurance', label: '💰 Finance and Insurance' },
            { value: 'real-estate', label: '🏢 Real Estate' },
            { value: 'construction', label: '🏗️ Construction' },
            { value: 'architecture-engineering', label: '📐 Architecture and Engineering' },
            { value: 'manufacturing', label: '🏭 Manufacturing' },
            { value: 'wholesale-distribution', label: '📦 Wholesale and Distribution' },
            { value: 'logistics-transportation', label: '🚚 Transportation and Logistics' },
            { value: 'automotive', label: '🚗 Automotive' },
            { value: 'agriculture', label: '🌾 Agriculture' },
            { value: 'energy-utilities', label: '⚡ Energy and Utilities' },
            { value: 'telecommunications', label: '📡 Telecommunications' },
            { value: 'marketing-advertising', label: '📣 Marketing and Advertising' },
            { value: 'media-creative', label: '🎨 Media and Creative' },
            { value: 'entertainment-events', label: '🎭 Entertainment and Events' },
            { value: 'tourism-travel', label: '✈️ Tourism and Travel' },
            { value: 'sports-fitness', label: '🏋️ Sports and Fitness' },
            { value: 'cleaning-facility', label: '🧹 Cleaning and Facilities' },
            { value: 'maintenance-repair', label: '🔧 Maintenance and Repair' },
            { value: 'security', label: '🛡️ Security' },
            { value: 'ecommerce', label: '🛒 E-commerce' },
            { value: 'import-export', label: '🌐 Import / Export' },
            { value: 'nonprofit', label: '🤝 Nonprofit' },
            { value: 'government-public', label: '🏛️ Government / Public Sector' },
            { value: 'pet-services', label: '🐾 Pet Services' },
            { value: 'childcare', label: '👶 Childcare' },
            { value: 'senior-care', label: '🧓 Senior Care' },
            { value: 'pharmaceutical', label: '💊 Pharmaceutical' },
            { value: 'other', label: '📦 Other' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ Restaurant and Food' },
            { value: 'retail', label: '🛍️ Retail and Commerce' },
            { value: 'servicios', label: '💼 Professional Services' },
            { value: 'salud', label: '⚕️ Health and Wellness' },
            { value: 'educacion', label: '📚 Education' },
            { value: 'tecnologia', label: '💻 Technology' },
            { value: 'construccion', label: '🏗️ Construction' },
            { value: 'manufactura', label: '🏭 Manufacturing' },
            { value: 'hospitalidad', label: '🏨 Hospitality and Tourism' },
            { value: 'inmobiliaria', label: '🏢 Real Estate' },
            { value: 'transporte', label: '🚚 Transportation and Logistics' },
            { value: 'entretenimiento', label: '🎭 Entertainment' },
            { value: 'financiero', label: '💰 Financial Services' },
            { value: 'agricultura', label: '🌾 Agriculture' },
            { value: 'otro', label: '📦 Other' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 Mexico' },
            { value: 'US', label: '🇺🇸 United States' },
            { value: 'CA', label: '🇨🇦 Canada' },
            { value: 'ES', label: '🇪🇸 Spain' },
            { value: 'CO', label: '🇨🇴 Colombia' },
            { value: 'AR', label: '🇦🇷 Argentina' },
            { value: 'BR', label: '🇧🇷 Brazil' },
            { value: 'CL', label: '🇨🇱 Chile' },
          ],
        },
      },
      profile: {
        title: 'My profile',
        subtitle: 'Personal information and account settings',
        helper: 'You can complete this at any time',
        fields: {
          fullName: 'Full name',
          email: 'Email',
          phone: 'Phone',
          position: 'Position',
          department: 'Department',
          profilePhoto: 'Profile photo',
          country: 'Country',
          uploadPhoto: 'Upload photo',
          firstNames: 'First name(s)',
          lastNames: 'Last name(s)',
          preferredLanguage: 'Preferred language',
          newPassword: 'New password',
          confirmNewPassword: 'Confirm new password',
        },
        sections: {
          identityTitle: 'Identity',
          identitySubtitle: 'Your photo and name for the interface.',
          contactTitle: 'Contact information',
          contactSubtitle: 'Details for notifications and communication.',
          securityTitle: 'Account security',
          securitySubtitle: 'Update your password whenever you need to.',
          preferencesTitle: 'Preferences',
          preferencesSubtitle: 'Personalize the interface language.',
          nameGroup: 'First and last names',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, max 25MB; compressed before upload',
          firstNames: 'In some countries you may use one or more given names.',
          lastNames: 'This may be 1 surname (USA/Canada) or 2 surnames (Mexico/Colombia).',
          phone: 'The country updates the phone code automatically.',
          password: 'Leave it blank if you do not want to change it.',
          preferredLanguage: 'We will use this language for the interface and templates.',
        },
        actions: {
          save: 'Save changes',
          saving: 'Saving...',
          discard: 'Discard',
        },
        messages: {
          loading: 'Loading profile...',
          saveSuccess: 'Profile saved.',
          loadError: 'Unable to load profile.',
          saveError: 'Unable to save profile.',
          unsavedChanges: 'You have unsaved changes.',
          optional: '(optional)',
          savingOverlay: 'Saving profile...',
          passwordMismatch: 'The new password and its confirmation must match.',
          passwordMinLength: 'The new password must be at least 8 characters long.',
          invalidPhone: 'Enter a valid phone number for the selected country.',
        },
      },
      users: {
        title: 'Users',
        subtitle: 'Manage system users and permissions',
        invite: 'Invite user',
        search: 'Search user...',
        filters: {
          all: 'All',
          active: 'Active',
          pending: 'Pending',
          inactive: 'Inactive',
        },
        roles: {
          superAdmin: 'Super Admin',
          admin: 'Admin',
          user: 'User',
        },
        status: {
          active: 'Active',
          pending: 'Pending',
          inactive: 'Inactive',
        },
        table: {
          name: 'Name',
          email: 'Email',
          role: 'Role',
          status: 'Status',
          modules: 'Modules',
          actions: 'Actions',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['en-US'],
        actions: {
          edit: 'Edit',
          resend: 'Resend invitation',
          delete: 'Delete',
        },
        modal: {
          newUser: 'New user',
          editUser: 'Edit user',
          name: 'Name',
          email: 'Email',
          role: 'Role',
          selectRole: 'Select a role',
          modules: 'Modules',
          selectModules: 'Select modules...',
          inviteLink: 'Invitation link',
          copyLink: 'Copy link',
          copied: '✓ Copied',
          save: 'Save',
          cancel: 'Cancel',
          send: 'Send invitation',
        },
      },
      plan: {
        title: 'Choose the plan that best fits your business',
        subtitle: 'All plans include Learning Mode and continuous updates',
        mostPopular: 'Most popular',
        plans: {
          inicio: {
            name: 'Start',
            description: 'Begin organizing your business',
            button: 'Choose Start',
          },
          controla: {
            name: 'Control',
            description: 'Solid foundations to organize and control',
            button: 'Choose Control',
          },
          escala: {
            name: 'Scale',
            description: 'Optimize areas, standardize processes',
            button: 'Choose Scale',
          },
          corporativiza: {
            name: 'Enterprise',
            description: 'Automate with corporate AI and comprehensive vision',
            button: 'Choose Enterprise',
          },
        },
        features: {
          humanResources: 'Human Resources',
          processes: 'Processes and Tasks',
          products: 'Products (POS / CRM)',
          finance: 'Finance (Expenses / Petty Cash)',
          kpisBasic: 'Basic KPIs',
          kpisComplete: 'Complete KPIs',
          kpisAdvanced: 'Advanced KPIs',
          kpisCorporate: 'Corporate KPIs',
          users5: 'Up to 5 users',
          users10: 'Up to 10 users',
          users20: 'Up to 20 users',
          users25: 'Up to 25 users',
          complementaryModules: 'Complementary modules',
          modules2: '2 complementary modules',
          modules4: '4 complementary modules',
          allModules: 'All modules',
          aiAnalytics: 'Analytics & Sales AI',
          integrations: 'Integrations',
          sessions1: '1 session/month',
          sessions2: '2 sessions/month',
          sessions4: '4 sessions/month',
        },
        additionalInfo: {
          title: 'Additional information',
          extraUser: 'Additional user',
          extraUserPrice: '+$10 USD per extra user on any plan',
          learningMode: 'Learning Mode',
          learningModeDesc: 'Included in all plans at no additional cost',
          updates: 'Updates',
          updatesDesc: 'All improvements included automatically',
        },
      },
    },
  },
  'en-CA': {
    header: {
      notifications: 'Notifications',
      profile: 'My profile',
      settings: 'Settings',
      logout: 'Log out',
      learningMode: 'Operational journey',
    },
    sections: {
      kpis: 'Your KPIs',
      favorites: 'Your favourites',
      quickAccess: 'Quick access',
      basicModules: 'Basic modules',
      main: 'Main',
      complementaryModules: 'Complementary modules',
      additional: 'Additional',
      aiModules: 'Artificial intelligence',
      aiLabel: 'AI Modules',
      configureKpis: 'Configure KPIs',
    },
    kpis: {
      weeklyRevenue: 'Weekly Revenue',
      netProfit: 'Net Profit',
      activeClients: 'Active Clients',
      activeEmployees: 'Active Employees',
      pendingTasks: 'Pending Tasks',
      monthlyExpenses: 'Monthly Expenses',
      vsWeekBefore: 'vs last week',
      thisMonth: 'this month',
      newOnes: 'new',
      dueToday: 'due today',
      vsMonthBefore: 'vs last month',
    },
    modules: {
      panelInicial: 'Home Panel',
      recursosHumanos: 'Human Resources',
      procesosTareas: 'Processes and tasks',
      gastos: 'Expenses',
      cajaChica: 'Petty cash',
      puntoVenta: 'Point of sale',
      ventas: 'Sales',
      cartera: 'Receivables',
      kpis: 'KPIs',
      mantenimiento: 'Maintenance',
      inventarios: 'Inventory',
      controlMinutas: 'Minutes control',
      limpieza: 'Cleaning',
      lavanderia: 'Laundry',
      transportacion: 'Transportation',
      vehiculosMaquinaria: 'Vehicles and machinery',
      inmuebles: 'Real estate',
      formularios: 'Forms',
      facturacion: 'Billing',
      correoElectronico: 'Email',
      climaLaboral: 'Work climate',
      afiliados: 'Affiliates',
      indiceAgenteVentas: 'Sales Agent Index',
      indiceAnalitica: 'Analytics Index',
      capacitacion: 'Training',
      indiceCoach: 'Coach Index',
    },
    notifications: {
      newTask: 'New task assigned',
      expensePending: 'Expense pending approval',
      newClient: 'New client registered',
      timeAgo: {
        minutes: '5 minutes ago',
        hour: '1 hour ago',
        hours: '2 hours ago',
      },
    },
	    loginPage: {
	      logoAlt: 'Indice logo',
	      workspaceBadge: 'Operational clarity',
	      accessBadge: 'Indice access',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Indice operating framework',
	      title: 'Run your business with clarity.',
	      subtitle:
	        'Connect people, processes, products, and finance into one operational workspace designed for growing businesses.',
	      pillars: [
	        {
	          icon: '👥',
	          title: 'People',
	          description: 'Teams, responsibilities, and daily activity with clearer visibility.',
	        },
	        {
	          icon: '⚙️',
	          title: 'Processes',
	          description: 'Structured workflows to execute, follow up, and reduce operational noise.',
	        },
	        {
	          icon: '📦',
	          title: 'Products',
	          description: 'Catalogues, commercial operations, and inventory connected to the business.',
	        },
	        {
	          icon: '📊',
	          title: 'Finance',
	          description: 'Financial control and operating insight for better decisions.',
	        },
	      ],
	      featureCards: [
	        {
	          title: 'Operational Visibility',
	          description: 'Understand what is happening across your business.',
	        },
	        {
	          title: 'Business Control',
	          description: 'Centralize execution and reduce operational chaos.',
	        },
	        {
	          title: 'Better Decisions',
	          description: 'Turn daily activity into actionable insight.',
	        },
	      ],
	      visualTitle: 'Structured growth',
	      visualSubtitle:
	        'Indice organizes operations into connected pillars so every team works with context and direction.',
	      visualMetricValue: '4',
	      visualMetricLabel: 'connected pillars',
	      visualSignalLabel: 'Operating system',
	      welcomeTitle: 'Access your workspace',
	      welcomeText:
	        'Continue daily execution with visibility, control, and business context.',
	      emailLabel: 'Email',
	      emailPlaceholder: 'you@company.com',
	      emailError: 'Enter a valid email address.',
	      passwordLabel: 'Password',
	      passwordPlaceholder: 'Enter your password',
	      forgotPassword: 'Forgot password?',
	      hidePassword: 'Hide password',
	      showPassword: 'Show password',
	      signIn: 'Sign in',
	      signingIn: 'Signing in...',
	      successToast: 'Signed in successfully.',
	      errorFallback: 'Unable to sign in.',
	      insideTitle: "What you'll access",
	      insideItems: ['Operational visibility', 'Team activity', 'Financial control', 'Business performance'],
	      resetBadge: 'Access recovery',
	      resetTitle: 'Reset your password',
	      resetDescription:
	        'Enter your account email. If it exists, we will send a reset link with limited validity.',
	      resetCloseLabel: 'Close password reset',
	      resetCancel: 'Cancel',
	      resetSubmit: 'Send reset link',
	      resetSubmitting: 'Sending link...',
	      resetSuccessFallback: 'If that email exists, a password reset link has been sent.',
	      resetErrorFallback: 'Password reset request could not be sent.',
	    },
    learningMode: {
      welcome: 'Welcome to Learning Mode!',
      hide: 'Hide',
      show: 'Show',
      businessBase: 'Business Base',
      clearBusinessStable: 'Clear Business Stable',
      functions: 'Functions',
      businessContext: 'Business Context',
      indiceMethodology: 'Indice Methodology',
      addModule: 'Open',
      viewBasicModules: 'View Basic Modules',
      previous: 'Previous',
      next: 'Next',
      stepOf: 'Step of',
      modules: {
        panelInicial: {
          title: 'Home Panel',
          subtitle: '🎯 Your starting point',
          description: 'The Home Panel is the starting point for organizing your company within the Indice system. 🏢 Here you define the basic information of your business and configure the structure that will allow all other modules to function properly. ✨ When this foundation is well configured, the system can help you manage people, processes, products, and finances with greater clarity.',
          functions: [
            '📊 Update your company data and keep your information always up to date.',
            '⚙️ Configure system preferences, such as language, currency, and operational settings.',
            '📋 Define the basic business information that other modules will use.',
            '🏗️ Establish your company structure and how its operation is organized.',
            '👥 Invite users and manage their access, assigning roles and permissions to each collaborator.',
            '🎓 Conduct initial business assessments that will help you understand what stage your company is in.',
            '📈 Calculate the BMI — Business Maturity Index, a tool that analyzes your business\'s current state and guides you on how to improve its management.',
          ],
          context: '💡 This module allows you to have an overview of your company and begin to structure how your business operates. When this foundation is well defined, all other system processes become clearer and easier to manage.',
          quote: '🏆 Organization is the first step to building a solid business.',
        },
        recursosHumanos: {
          title: 'Human Resources',
          subtitle: 'Manage your team',
          description: 'Manage employee and human resource information.',
          functions: ['View employees', 'Manage contracts'],
          context: 'This module allows you to effectively manage your team.',
          quote: 'Talent is the key to success.',
        },
        procesosTareas: {
          title: 'Processes and tasks',
          subtitle: 'Organize your work',
          description: 'Manage and perform important tasks and processes for your business.',
          functions: ['Create tasks', 'View processes'],
          context: 'This module helps you keep your business organized.',
          quote: 'Organization is the key to efficiency.',
        },
        gastos: {
          title: 'Expenses',
          subtitle: 'Control your expenses',
          description: 'Manage and control your expenses to keep your business in good condition.',
          functions: ['View expenses', 'Approve expenses'],
          context: 'This module allows you to effectively control your expenses.',
          quote: 'Expense control is fundamental for success.',
        },
        cajaChica: {
          title: 'Petty cash',
          subtitle: 'Minor expenses',
          description: 'Manage minor expenses for your business.',
          functions: ['View petty cash', 'Approve expenses'],
          context: 'This module allows you to efficiently manage minor expenses.',
          quote: 'Petty cash is essential for minor expenses.',
        },
        puntoVenta: {
          title: 'Point of sale',
          subtitle: 'Sell your products',
          description: 'Manage and perform sales for your business.',
          functions: ['Make sales', 'View sales'],
          context: 'This module allows you to efficiently sell your products.',
          quote: 'Sales are the key to success.',
        },
        ventas: {
          title: 'Sales',
          subtitle: 'Manage your sales',
          description: 'Manage and analyze your sales to improve your business.',
          functions: ['View sales', 'Analyze sales'],
          context: 'This module allows you to manage and analyze your sales.',
          quote: 'Sales are the foundation of your business.',
        },
        kpis: {
          title: 'KPIs',
          subtitle: 'Key metrics',
          description: 'Manage and analyze your KPIs to improve your business.',
          functions: ['View KPIs', 'Configure KPIs'],
          context: 'This module allows you to manage and analyze your KPIs.',
          quote: 'KPIs are essential for performance tracking.',
        },
      },
    },
    panelInicial: {
      title: 'Home Panel',
      back: 'Back',
      tabs: {
        profile: 'Profile',
        businessStructure: 'Business Structure',
        businessProfile: 'Business Profile',
        personalPerformance: 'Personal Performance',
        billing: 'Billing',
        plan: 'Plan',
        users: 'Users',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['en-CA'],
      diagnosis: {
        title: 'Business Diagnosis',
        description: 'Help us better understand your company and management stage to personalize Indice.',
        centerTitle: 'Business Diagnosis Center',
        centerDescription: 'Discover your company\'s management status through 4 pillars: People, Processes, Products, and Finance. With your answers, we\'ll use the Business Maturity Index (BMI), which will help us personalize recommendations, modules, and best partners behind Indice.',
        questionCount: '10 questions each',
        questionCountLabel: 'The diagnosis contains',
        progress: 'Business diagnosis progress',
        progressOf: 'completed',
        onboarding: {
          answeredProgress: 'You\'ve answered {answered} of {total} questions',
          encouragementMid: 'You\'re making great progress',
          encouragementNear: 'Almost done',
          sections: {
              people: {
                title: 'Step 1 — Your team',
                intro: 'Let\'s understand how your team works',
                done: 'Done — we understand your team',
              },
              processes: {
                title: 'Step 2 — How you operate',
                intro: 'Let\'s understand how your daily operation works',
                done: 'Done — we understand how you operate',
              },
              products: {
                title: 'Step 3 — What you sell',
                intro: 'Let\'s understand your offer and how it reaches the market',
                done: 'Done — we understand what you sell',
              },
              finance: {
                title: 'Step 4 — Your finances',
                intro: 'Let\'s understand how you manage your numbers',
                done: 'Done — we understand your finances',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['en-CA'],
        printDiagnosis: 'Download PDF',
        start: 'Start',
        continue: 'Continue',
        doAgain: 'Do again',
        reviewAnswers: 'Review answers',
        close: 'Close',
        question: 'Question',
        of: 'of',
        completed: 'completed',
        previous: 'Previous',
        next: 'Next',
        finish: 'Finish',
        restart: 'Restart diagnosis',
        actions: {
          save: 'Save',
          saving: 'Saving...',
          discard: 'Discard',
        },
        scoreSummary: {
          title: 'Diagnosis score',
          bmi: 'BMI',
          level: 'Level',
          answered: 'Answered',
          score: 'Score',
        },
        messages: {
          loading: 'Loading business diagnosis...',
          loadError: 'We could not load the business diagnosis.',
          saveSuccess: 'Business diagnosis saved.',
          saveError: 'We could not save the business diagnosis.',
          unsavedChanges: 'You have unsaved changes in the business diagnosis.',
        },
        pillars: {
          people: {
            title: 'People',
            description: 'Analyze talent, team structure, and communication.',
          },
          processes: {
            title: 'Processes',
            description: 'Evaluate flows, tasks, scalability, and efficiency.',
          },
          products: {
            title: 'Products',
            description: 'Analyze offering, market, sales, and value proposition.',
          },
          finance: {
            title: 'Finance',
            description: 'Evaluate financial control, management, and decision-making.',
          },
        },
        questions: {
          people: [
            { question: 'What is your main role?', options: ['Founder/CEO', 'Operations', 'Finance', 'Sales/Other'] },
            { question: 'How many people work?', options: ['Just me', '2 to 5', '6 to 20', '21 or more'] },
            { question: 'How is your team organized?', options: ['No structure', 'Basic roles', 'Defined areas', 'Formal org chart'] },
            { question: 'How do you assign tasks?', options: ['Improvised', 'Lists', 'Structured assignment', 'Management system'] },
            { question: 'Performance review?', options: ['Never', 'For problems', 'Weekly', 'With KPIs'] },
            { question: 'Delegation?', options: ['I do everything', 'Delegate and supervise', 'Delegate with control', 'Autonomous team'] },
            { question: 'Internal communication?', options: ['Informal', 'Chat', 'Meetings', 'Formal tools'] },
            { question: 'Meeting frequency?', options: ['Never', 'Sporadic', 'Weekly', 'Frequent'] },
            { question: 'Clarity of responsibilities?', options: ['Not clear', 'Somewhat clear', 'Quite clear', 'Totally clear'] },
            { question: 'Ease of integration?', options: ['Very difficult', 'Difficult', 'Moderate', 'Easy'] },
          ],
          processes: [
            { question: 'Documented processes?', options: ['Nothing', 'Some', 'Most', 'Completely'] },
            { question: 'Task management?', options: ['Improvised', 'Lists', 'Tools', 'Formal system'] },
            { question: 'Progress monitoring?', options: ['Not monitored', 'Occasional', 'Reports', 'KPIs'] },
            { question: 'Automation?', options: ['Manual', 'Isolated tools', 'Partial automation', 'High automation'] },
            { question: 'Replicability?', options: ['Very difficult', 'With effort', 'Possible', 'Easy'] },
            { question: 'Where is time lost?', options: ['Manual work', 'Coordination', 'Information', 'Follow-up'] },
            { question: 'Dependence on people?', options: ['Total', 'Quite a bit', 'Some', 'Little'] },
            { question: 'Process clarity?', options: ['Not clear', 'Somewhat clear', 'Quite clear', 'Totally clear'] },
            { question: 'Error management?', options: ['Reaction', 'Informal', 'Review', 'Continuous improvement'] },
            { question: 'Scalability?', options: ['None', 'Low', 'Medium', 'High'] },
          ],
          products: [
            { question: 'What do you sell?', options: ['Services', 'Products', 'Digital', 'Mixed'] },
            { question: 'Type of client?', options: ['B2C', 'B2B', 'Government', 'Mixed'] },
            { question: 'Main revenue?', options: ['Direct sale', 'Services', 'Subscription', 'Contracts'] },
            { question: 'Diversification?', options: ['One', 'Some', 'Several lines', 'Broad'] },
            { question: 'Price definition?', options: ['Intuition', 'Competition', 'Costs', 'Strategy'] },
            { question: 'Performance tracking?', options: ['Not measured', 'Sales only', 'Sales+profitability', 'Indicators'] },
            { question: 'Value proposition?', options: ['Not clear', 'Somewhat clear', 'Quite clear', 'Very clear'] },
            { question: 'Customer feedback?', options: ['None', 'Informal', 'Surveys', 'Analysis'] },
            { question: 'Product evolution?', options: ['On the go', 'Occasional changes', 'Plans', 'Roadmap'] },
            { question: 'Commercial priority?', options: ['Clients', 'Current sales', 'Profitability', 'Scale'] },
          ],
          finance: [
            { question: 'Financial control?', options: ['Unstructured', 'Excel', 'Software', 'Integrated system'] },
            { question: 'Number review?', options: ['Never', 'Monthly', 'Weekly', 'Daily'] },
            { question: 'Cash flow?', options: ['Not controlled', 'Reaction', 'Review', 'Projection'] },
            { question: 'Clear costs?', options: ['Not clear', 'Approximate', 'Quite clear', 'Total control'] },
            { question: 'Margin?', options: ['Don\'t know', 'Estimated', 'Clear', 'Fully measured'] },
            { question: 'Financial decisions?', options: ['Intuition', 'Experience', 'Data', 'Models'] },
            { question: 'Predictable income?', options: ['Very variable', 'Variable', 'Stable', 'Very stable'] },
            { question: 'Debt management?', options: ['No control', 'Basic', 'Strategy', 'Optimized'] },
            { question: 'Crisis preparedness?', options: ['None', 'Low', 'Medium', 'High'] },
            { question: 'Tax compliance?', options: ['No control', 'Delays', 'Up to date', 'Tax strategy'] },
          ],
        },
      },
      billing: {
        title: 'Billing',
        subtitle: 'Tax data, payment method and service invoices',
        fiscalData: {
          title: 'Tax Data',
          subtitle: 'Configure your tax data according to country',
          country: 'Country',
          selectCountry: 'Select a country...',
          rfc: 'RFC',
          razonSocial: 'Legal name',
          regimenFiscal: 'Tax regime',
          usoCFDI: 'CFDI use (default)',
          codigoPostalFiscal: 'Postal Code (Tax)',
          nit: 'NIT',
          responsabilidadFiscal: 'Tax responsibility',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: 'Legal name',
          inscricaoEstadual: 'State registration',
          ein: 'EIN (Tax ID)',
          legalName: 'Legal name',
          state: 'State',
          businessNumber: 'Business Number (BN)',
          province: 'Province',
          taxId: 'Tax ID',
          companyName: 'Company name',
          taxRegime: 'Tax regime',
          postalCode: 'Postal Code',
        },
        paymentMethod: {
          title: 'Payment Method',
          subtitle: 'Configure your method and payment frequency',
          type: 'Preferred payment type',
          selectMethod: 'Select a method...',
          cardNumber: 'Card number',
          cvv: 'CVV',
          expirationDate: 'Expiration date',
          cardholderName: 'Name on card',
          addCard: 'Add card',
          cancel: 'Cancel',
          savedCards: 'Saved cards',
          defaultCard: 'Default card',
          saveCard: 'Save card',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/YY',
            cardholderName: 'As it appears on card',
          },
        },
        automaticBilling: {
          title: 'Automatic Billing',
          subtitle: 'Configure renewal, billing day and invoice email',
          enable: 'Enable automatic renewal',
          description: 'Your subscription will renew automatically at the end of the period',
          billingDay: 'Billing day',
          selectDay: 'Day 1 of each month',
          emailForInvoices: 'Email for invoices',
          reminderNote: 'You will receive your invoices at this email',
        },
        currentBilling: {
          title: 'Current Billing Summary',
          plan: 'Plan:',
          notConfigured: 'Not configured',
          amount: 'Amount:',
          nextPayment: 'Next payment:',
        },
        invoices: {
          title: 'Service Invoices',
          subtitle: 'History of your subscription invoices',
          month: 'Month',
          year: 'Amount',
          status: 'Status',
          downloadPdf: 'Download PDF',
          date: 'Date',
          concept: 'Concept',
          amount: 'Amount',
          paid: 'Paid',
          pending: 'Pending',
        },
        billingFrequency: {
          title: 'Billing Frequency',
          note: 'Payments may have 100-30 discount',
          monthly: 'Monthly',
          quarterly: 'Quarterly',
          semiannual: 'Semiannual',
          annual: 'Annual',
        },
      },
      structure: {
        title: 'Business Structure',
        subtitle: 'Organization and business units',
        status: {
          connected: 'Spring backend connected',
          backendNotice: 'This screen now loads from and saves to the Spring backend. Company identity plus the unit and business details captured in this form are persisted through Spring.',
        },
        actions: {
          save: 'Save changes',
          saving: 'Saving...',
          extract: 'Get coordinates',
          useLocation: 'Use my location',
          addUnit: 'Add new unit',
          configure: 'Configure unit',
          configureGroup: 'Configure group',
          createUnit: 'Add another unit',
        },
        messages: {
          loading: 'Loading business structure...',
          loadError: 'Unable to load business structure.',
          saveError: 'Unable to save business structure.',
          saveSuccess: 'Business Structure saved successfully.',
          saveOverlay: 'Saving business structure...',
          saveOverlayDescription: 'Syncing company, unit, and business details with the backend.',
          createUnitTitle: 'Creating unit...',
          updateUnitTitle: 'Saving unit...',
          unitOverlayDescription: 'Updating the unit details in your Business Structure.',
          createUnitSuccess: 'Unit added to Business Structure.',
          updateUnitSuccess: 'Unit updated in Business Structure.',
          createBusinessTitle: 'Creating business...',
          updateBusinessTitle: 'Saving business...',
          businessOverlayDescription: 'Updating the business details in your Business Structure.',
          createBusinessSuccess: 'Business added to Business Structure.',
          updateBusinessSuccess: 'Business updated in Business Structure.',
        },
        mode: {
          title: 'Operation type',
          description: 'Select the option that best describes your company:',
          helper: '💡 Choose how your business works',
          simple: 'Simple',
          multi: 'Multi-unit',
          simpleTitle: 'I have one business or branch',
          simpleDescription: 'You have one branch or company',
          simpleExample: 'Example: a restaurant, shop, or clinic',
          multiTitle: 'I have several branches or brands',
          multiDescription: 'Multiple branches, subsidiaries or related companies',
          multiExample: 'Example: several restaurants, branches, or brands',
          switchPrompt: 'Do you have more than one business or branch?',
          switchAction: 'Switch to multi-unit',
          multiNote: 'Manage multiple units from a single administration.',
          selected: 'Selected',
          structurePreviewTitle: '🧠 This is how your structure will work',
          structurePreviewLines: [
            'Company',
            ' → Location (e.g. Cancun, Mexico City)',
            '    → Business (e.g. Restaurant, store, hotel)',
          ],
        },
        identity: {
          simple: 'Corporate office',
          holding: 'Corporate office',
          simpleDesc: 'Company name, logo, coordinates, radius and base configuration.',
          holdingDesc: 'Company name, logo, coordinates, radius and base configuration.',
          holdingNotice: '💡 Define where your business operates from here.',
        },
        headquarters: {
          helper: '💡 Define where your business operates from here.',
          context: 'We will use this information to organize your operations, employees, and reports.',
          basicInfo: '🏢 Basic company information',
          industryHelper: 'This helps us adapt the system to your type of business.',
          locationTitle: '📍 Business location',
          locationHelper: 'This helps with features like attendance and operations control.',
          addressTitle: '📍 Business address',
          addressHelper: 'Complete the address to identify your location more clearly',
          addressNote: 'The address is for reference. We will use coordinates for system features.',
        },
        fields: {
          companyName: 'Company name',
          holdingName: 'Company name',
          industry: 'Industry',
          selectIndustry: 'Select an industry',
          industryHint: 'This helps us adapt the system to your type of business.',
          country: 'Country',
          selectCountry: 'Select a country',
          logo: 'Company logo',
          logoHolding: 'Corporate office logo',
          uploadImage: 'Upload image',
          noFileSelected: 'No file selected',
          uploadHint: 'JPG/PNG/SVG. Max 1MB.',
          removeLogo: 'Remove logo',
          description: 'Description',
          optional: '(optional)',
          basicInfo: 'Basic information',
          location: 'Location',
          contact: 'Contact',
          operationalInfo: 'Operational information',
          address: 'Address',
          city: 'City',
          state: 'State/Province',
          postalCode: 'Postal code',
          phone: 'Phone',
          email: 'Email',
          manager: 'Manager/Owner',
          schedule: 'Schedule',
          logoPreviewAlt: 'Logo preview',
        },
        units: {
          title: '🏬 Your business units',
          subtitle: 'Here you can view and manage how your business is organized',
          description: 'Here you can view and manage how your business is organized',
          context: 'Each unit represents a branch, brand, or line of business',
          groupLabel: '🧩 Main group',
          mainUnit: 'Main unit',
          helper: 'You can start with one unit and add more as your business grows',
          tip: '💡 You can create units for each branch or brand',
          empty: 'No businesses yet',
          emptyHelper: 'Add your first business in this unit',
          groupContext: 'Each location groups the businesses that operate there',
          tipAction: '💡 You can start with one unit and add more later',
          addUnit: '+ New unit',
          addBusiness: '+ Add business',
          unitName: 'Unit name',
          unitCountry: 'Operating country',
          businessName: 'Business name',
          configureUnit: '⚙️ Configure unit',
          configureBusiness: '⚙️ Configure',
          businessCountSingular: 'business',
          businessCountPlural: 'businesses',
        },
        modal: {
          newUnit: 'New business unit',
          editUnit: 'Edit business unit',
          newBusiness: 'New business',
          editBusiness: 'Edit business',
          save: 'Save changes',
          cancel: 'Cancel',
          delete: 'Delete',
          createBusiness: 'Create business',
          newUnitDescription: 'Add a new operating unit',
          editUnitDescription: 'Edit the details of',
          newBusinessDescription: 'Add a new business/branch',
          editBusinessDescription: 'Edit the details of',
          confirmDeleteUnit: 'Delete this unit?',
          confirmDeleteBusiness: 'Delete this business?',
        },
        placeholders: {
          unitName: 'E.g. Mexico City, North, Central Region...',
          businessName: 'E.g. Downtown branch, Polanco store, South warehouse...',
          address: 'Street, number, district...',
          city: 'City',
          state: 'State',
          postalCode: '00000',
          phone: '+1 416 555 1234',
          unitEmail: 'unit@company.com',
          businessEmail: 'business@company.com',
          manager: 'Manager name',
          schedule: 'Mon-Fri 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ Retail / Commerce' },
            { value: 'food', label: '🍔 Food and Beverage' },
            { value: 'hospitality', label: '🏨 Hospitality' },
            { value: 'tech', label: '💻 Technology' },
            { value: 'software-saas', label: '🧩 Software / SaaS' },
            { value: 'health', label: '🏥 Health' },
            { value: 'beauty-wellness', label: '💅 Beauty and Wellness' },
            { value: 'education', label: '🎓 Education' },
            { value: 'services', label: '💼 Professional Services' },
            { value: 'consulting', label: '🧠 Consulting' },
            { value: 'legal', label: '⚖️ Legal' },
            { value: 'accounting-tax', label: '🧾 Accounting and Tax' },
            { value: 'finance-insurance', label: '💰 Finance and Insurance' },
            { value: 'real-estate', label: '🏢 Real Estate' },
            { value: 'construction', label: '🏗️ Construction' },
            { value: 'architecture-engineering', label: '📐 Architecture and Engineering' },
            { value: 'manufacturing', label: '🏭 Manufacturing' },
            { value: 'wholesale-distribution', label: '📦 Wholesale and Distribution' },
            { value: 'logistics-transportation', label: '🚚 Transportation and Logistics' },
            { value: 'automotive', label: '🚗 Automotive' },
            { value: 'agriculture', label: '🌾 Agriculture' },
            { value: 'energy-utilities', label: '⚡ Energy and Utilities' },
            { value: 'telecommunications', label: '📡 Telecommunications' },
            { value: 'marketing-advertising', label: '📣 Marketing and Advertising' },
            { value: 'media-creative', label: '🎨 Media and Creative' },
            { value: 'entertainment-events', label: '🎭 Entertainment and Events' },
            { value: 'tourism-travel', label: '✈️ Tourism and Travel' },
            { value: 'sports-fitness', label: '🏋️ Sports and Fitness' },
            { value: 'cleaning-facility', label: '🧹 Cleaning and Facilities' },
            { value: 'maintenance-repair', label: '🔧 Maintenance and Repair' },
            { value: 'security', label: '🛡️ Security' },
            { value: 'ecommerce', label: '🛒 E-commerce' },
            { value: 'import-export', label: '🌐 Import / Export' },
            { value: 'nonprofit', label: '🤝 Nonprofit' },
            { value: 'government-public', label: '🏛️ Government / Public Sector' },
            { value: 'pet-services', label: '🐾 Pet Services' },
            { value: 'childcare', label: '👶 Childcare' },
            { value: 'senior-care', label: '🧓 Senior Care' },
            { value: 'pharmaceutical', label: '💊 Pharmaceutical' },
            { value: 'other', label: '📦 Other' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ Restaurant and Food' },
            { value: 'retail', label: '🛍️ Retail and Commerce' },
            { value: 'servicios', label: '💼 Professional Services' },
            { value: 'salud', label: '⚕️ Health and Wellness' },
            { value: 'educacion', label: '📚 Education' },
            { value: 'tecnologia', label: '💻 Technology' },
            { value: 'construccion', label: '🏗️ Construction' },
            { value: 'manufactura', label: '🏭 Manufacturing' },
            { value: 'hospitalidad', label: '🏨 Hospitality and Tourism' },
            { value: 'inmobiliaria', label: '🏢 Real Estate' },
            { value: 'transporte', label: '🚚 Transportation and Logistics' },
            { value: 'entretenimiento', label: '🎭 Entertainment' },
            { value: 'financiero', label: '💰 Financial Services' },
            { value: 'agricultura', label: '🌾 Agriculture' },
            { value: 'otro', label: '📦 Other' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 Mexico' },
            { value: 'US', label: '🇺🇸 United States' },
            { value: 'CA', label: '🇨🇦 Canada' },
            { value: 'ES', label: '🇪🇸 Spain' },
            { value: 'CO', label: '🇨🇴 Colombia' },
            { value: 'AR', label: '🇦🇷 Argentina' },
            { value: 'BR', label: '🇧🇷 Brazil' },
            { value: 'CL', label: '🇨🇱 Chile' },
          ],
        },
      },
      profile: {
        title: 'My profile',
        subtitle: 'Personal information and account settings',
        helper: 'You can complete this at any time',
        fields: {
          fullName: 'Full name',
          email: 'Email',
          phone: 'Phone',
          position: 'Position',
          department: 'Department',
          profilePhoto: 'Profile photo',
          country: 'Country',
          uploadPhoto: 'Upload photo',
          firstNames: 'First name(s)',
          lastNames: 'Last name(s)',
          preferredLanguage: 'Preferred language',
          newPassword: 'New password',
          confirmNewPassword: 'Confirm new password',
        },
        sections: {
          identityTitle: 'Identity',
          identitySubtitle: 'Your photo and name for the interface.',
          contactTitle: 'Contact information',
          contactSubtitle: 'Details for notifications and communication.',
          securityTitle: 'Account security',
          securitySubtitle: 'Update your password whenever you need to.',
          preferencesTitle: 'Preferences',
          preferencesSubtitle: 'Personalize the interface language.',
          nameGroup: 'First and last names',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, max 25MB; compressed before upload',
          firstNames: 'In some countries you may use one or more given names.',
          lastNames: 'This may be 1 surname (USA/Canada) or 2 surnames (Mexico/Colombia).',
          phone: 'The country updates the phone code automatically.',
          password: 'Leave it blank if you do not want to change it.',
          preferredLanguage: 'We will use this language for the interface and templates.',
        },
        actions: {
          save: 'Save changes',
          saving: 'Saving...',
          discard: 'Discard',
        },
        messages: {
          loading: 'Loading profile...',
          saveSuccess: 'Profile saved.',
          loadError: 'Unable to load profile.',
          saveError: 'Unable to save profile.',
          unsavedChanges: 'You have unsaved changes.',
          optional: '(optional)',
          savingOverlay: 'Saving profile...',
          passwordMismatch: 'The new password and its confirmation must match.',
          passwordMinLength: 'The new password must be at least 8 characters long.',
          invalidPhone: 'Enter a valid phone number for the selected country.',
        },
      },
      users: {
        title: 'Users',
        subtitle: 'Manage system users and permissions',
        invite: 'Invite user',
        search: 'Search user...',
        filters: {
          all: 'All',
          active: 'Active',
          pending: 'Pending',
          inactive: 'Inactive',
        },
        roles: {
          superAdmin: 'Super Admin',
          admin: 'Admin',
          user: 'User',
        },
        status: {
          active: 'Active',
          pending: 'Pending',
          inactive: 'Inactive',
        },
        table: {
          name: 'Name',
          email: 'Email',
          role: 'Role',
          status: 'Status',
          modules: 'Modules',
          actions: 'Actions',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['en-CA'],
        actions: {
          edit: 'Edit',
          resend: 'Resend invitation',
          delete: 'Delete',
        },
        modal: {
          newUser: 'New user',
          editUser: 'Edit user',
          name: 'Name',
          email: 'Email',
          role: 'Role',
          selectRole: 'Select a role',
          modules: 'Modules',
          selectModules: 'Select modules...',
          inviteLink: 'Invitation link',
          copyLink: 'Copy link',
          copied: '✓ Copied',
          save: 'Save',
          cancel: 'Cancel',
          send: 'Send invitation',
        },
      },
      plan: {
        title: 'Choose the plan that best fits your business',
        subtitle: 'All plans include Learning Mode and continuous updates',
        mostPopular: 'Most popular',
        plans: {
          inicio: {
            name: 'Start',
            description: 'Begin organizing your business',
            button: 'Choose Start',
          },
          controla: {
            name: 'Control',
            description: 'Solid foundations to organise and control',
            button: 'Choose Control',
          },
          escala: {
            name: 'Scale',
            description: 'Optimise areas, standardise processes',
            button: 'Choose Scale',
          },
          corporativiza: {
            name: 'Enterprise',
            description: 'Automate with corporate AI and comprehensive vision',
            button: 'Choose Enterprise',
          },
        },
        features: {
          humanResources: 'Human Resources',
          processes: 'Processes and Tasks',
          products: 'Products (POS / CRM)',
          finance: 'Finance (Expenses / Petty Cash)',
          kpisBasic: 'Basic KPIs',
          kpisComplete: 'Complete KPIs',
          kpisAdvanced: 'Advanced KPIs',
          kpisCorporate: 'Corporate KPIs',
          users5: 'Up to 5 users',
          users10: 'Up to 10 users',
          users20: 'Up to 20 users',
          users25: 'Up to 25 users',
          complementaryModules: 'Complementary modules',
          modules2: '2 complementary modules',
          modules4: '4 complementary modules',
          allModules: 'All modules',
          aiAnalytics: 'Analytics & Sales AI',
          integrations: 'Integrations',
          sessions1: '1 session/month',
          sessions2: '2 sessions/month',
          sessions4: '4 sessions/month',
        },
        additionalInfo: {
          title: 'Additional information',
          extraUser: 'Additional user',
          extraUserPrice: '+$10 USD per extra user on any plan',
          learningMode: 'Learning Mode',
          learningModeDesc: 'Included in all plans at no additional cost',
          updates: 'Updates',
          updatesDesc: 'All improvements included automatically',
        },
      },
    },
  },
  'fr-CA': {
    header: {
      notifications: 'Notifications',
      profile: 'Mon profil',
      settings: 'Paramètres',
      logout: 'Déconnexion',
      learningMode: 'Parcours opérationnel',
    },
    sections: {
      kpis: 'Vos KPIs',
      favorites: 'Vos favoris',
      quickAccess: 'Accès rapide',
      basicModules: 'Modules de base',
      main: 'Principaux',
      complementaryModules: 'Modules complémentaires',
      additional: 'Additionnels',
      aiModules: 'Intelligence artificielle',
      aiLabel: 'Modules IA',
      configureKpis: 'Configurer KPIs',
    },
    kpis: {
      weeklyRevenue: 'Revenus Hebdomadaires',
      netProfit: 'Profit Net',
      activeClients: 'Clients Actifs',
      activeEmployees: 'Employés Actifs',
      pendingTasks: 'Tâches en Attente',
      monthlyExpenses: 'Dépenses du Mois',
      vsWeekBefore: 'vs semaine précédente',
      thisMonth: 'ce mois',
      newOnes: 'nouveaux',
      dueToday: 'dues aujourd\'hui',
      vsMonthBefore: 'vs mois précédent',
    },
    modules: {
      panelInicial: 'Panneau initial',
      recursosHumanos: 'Ressources humaines',
      procesosTareas: 'Processus et tâches',
      gastos: 'Dépenses',
      cajaChica: 'Petite caisse',
      puntoVenta: 'Point de vente',
      ventas: 'Ventes',
      cartera: 'Comptes a recevoir',
      kpis: 'KPIs',
      mantenimiento: 'Maintenance',
      inventarios: 'Inventaire',
      controlMinutas: 'Contrôle des procès-verbaux',
      limpieza: 'Nettoyage',
      lavanderia: 'Buanderie',
      transportacion: 'Transport',
      vehiculosMaquinaria: 'Véhicules et machines',
      inmuebles: 'Immobilier',
      formularios: 'Formulaires',
      facturacion: 'Facturation',
      correoElectronico: 'Courriel',
      climaLaboral: 'Climat de travail',
      afiliados: 'Affiliés',
      indiceAgenteVentas: 'Index Agent de Ventes',
      indiceAnalitica: 'Index Analytique',
      capacitacion: 'Formation',
      indiceCoach: 'Index Coach',
    },
    notifications: {
      newTask: 'Nouvelle tâche assignée',
      expensePending: 'Dépense en attente d\'approbation',
      newClient: 'Nouveau client enregistré',
      timeAgo: {
        minutes: 'Il y a 5 minutes',
        hour: 'Il y a 1 heure',
        hours: 'Il y a 2 heures',
      },
    },
	    loginPage: {
	      logoAlt: 'Logo Indice',
	      workspaceBadge: 'Clarté opérationnelle',
	      accessBadge: 'Accès Indice',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Cadre opérationnel Indice',
	      title: 'Pilotez votre entreprise avec clarté.',
	      subtitle:
	        'Reliez les personnes, les processus, les produits et les finances dans un espace opérationnel conçu pour les entreprises en croissance.',
	      pillars: [
	        {
	          icon: '👥',
	          title: 'Personnes',
	          description: 'Équipes, responsabilités et activité quotidienne avec plus de visibilité.',
	        },
	        {
	          icon: '⚙️',
	          title: 'Processus',
	          description: 'Flux structurés pour exécuter, suivre et réduire le bruit opérationnel.',
	        },
	        {
	          icon: '📦',
	          title: 'Produits',
	          description: 'Catalogues, opérations commerciales et inventaire liés à l’entreprise.',
	        },
	        {
	          icon: '📊',
	          title: 'Finances',
	          description: 'Contrôle financier et lecture opérationnelle pour mieux décider.',
	        },
	      ],
	      featureCards: [
	        {
	          title: 'Visibilité opérationnelle',
	          description: 'Comprenez ce qui se passe dans chaque partie de l’entreprise.',
	        },
	        {
	          title: 'Contrôle d’entreprise',
	          description: 'Centralisez l’exécution et réduisez le désordre opérationnel.',
	        },
	        {
	          title: 'Meilleures décisions',
	          description: 'Transformez l’activité quotidienne en signaux actionnables.',
	        },
	      ],
	      visualTitle: 'Croissance structurée',
	      visualSubtitle:
	        'Indice organise l’opération en piliers connectés pour que chaque équipe travaille avec contexte et direction.',
	      visualMetricValue: '4',
	      visualMetricLabel: 'piliers connectés',
	      visualSignalLabel: 'Système opérationnel',
	      welcomeTitle: 'Accédez à votre espace de travail',
	      welcomeText:
	        'Poursuivez l’exécution quotidienne avec visibilité, contrôle et contexte d’affaires.',
	      emailLabel: 'Courriel',
	      emailPlaceholder: 'vous@entreprise.com',
	      emailError: 'Entrez une adresse courriel valide.',
	      passwordLabel: 'Mot de passe',
	      passwordPlaceholder: 'Entrez votre mot de passe',
	      forgotPassword: 'Mot de passe oublié?',
	      hidePassword: 'Masquer le mot de passe',
	      showPassword: 'Afficher le mot de passe',
	      signIn: 'Se connecter',
	      signingIn: 'Connexion en cours...',
	      successToast: 'Connexion réussie.',
	      errorFallback: 'Impossible de se connecter.',
	      insideTitle: 'Ce que vous pourrez consulter',
	      insideItems: ['Visibilité opérationnelle', 'Activité des équipes', 'Contrôle financier', 'Performance d’affaires'],
	      resetBadge: 'Récupération d’accès',
	      resetTitle: 'Réinitialisez votre mot de passe',
	      resetDescription:
	        'Entrez le courriel de votre compte. S’il existe, nous enverrons un lien de récupération à durée limitée.',
	      resetCloseLabel: 'Fermer la réinitialisation du mot de passe',
	      resetCancel: 'Annuler',
	      resetSubmit: 'Envoyer le lien',
	      resetSubmitting: 'Envoi du lien...',
	      resetSuccessFallback: 'Si ce courriel existe, un lien de réinitialisation a été envoyé.',
	      resetErrorFallback: 'Impossible d’envoyer la demande de réinitialisation.',
	    },
    learningMode: {
      welcome: 'Bienvenue en mode d\'apprentissage !',
      hide: 'Masquer',
      show: 'Afficher',
      businessBase: 'Base d\'affaires',
      clearBusinessStable: 'Effacer la base d\'affaires stable',
      functions: 'Fonctions',
      businessContext: 'Contexte d\'affaires',
      indiceMethodology: 'Méthodologie Indice',
      addModule: 'Ouvrir',
      viewBasicModules: 'Voir les modules de base',
      previous: 'Précédent',
      next: 'Suivant',
      stepOf: 'Étape de',
      modules: {
        panelInicial: {
          title: 'Panneau initial',
          subtitle: '🎯 Votre point de départ',
          description: 'Le Panneau initial est le point de départ pour organiser votre entreprise dans le système Indice. 🏢 Ici, vous définissez les informations de base de votre entreprise et configurez la structure qui permettra à tous les autres modules de fonctionner correctement. ✨ Lorsque cette base est bien configurée, le système peut vous aider à gérer les personnes, les processus, les produits et les finances avec plus de clarté.',
          functions: [
            '📊 Mettre à jour les données de votre entreprise et maintenir vos informations toujours à jour.',
            '⚙️ Configurer les préférences du système, telles que la langue, la monnaie et les paramètres opérationnels.',
            '📋 Définir les informations de base de l\'entreprise que les autres modules utiliseront.',
            '🏗️ Établir la structure de votre entreprise et comment son fonctionnement est organisé.',
            '👥 Inviter des utilisateurs et gérer leurs accès, en attribuant des rôles et des permissions à chaque collaborateur.',
            '🎓 Effectuer des évaluations initiales de l\'entreprise qui vous aideront à comprendre à quel stade se trouve votre entreprise.',
            '📈 Calculer l\'IME — Indice de Maturité d\'Entreprise, un outil qui analyse l\'état actuel de votre entreprise et vous guide sur la façon d\'améliorer sa gestion.',
          ],
          context: '💡 Ce module vous permet d\'avoir une vue d\'ensemble de votre entreprise et de commencer à structurer le fonctionnement de votre affaire. Lorsque cette base est bien définie, tous les autres processus du système deviennent plus clairs et plus faciles à gérer.',
          quote: '🏆 L\'organisation est la première étape pour construire une entreprise solide.',
        },
        recursosHumanos: {
          title: 'Ressources humaines',
          subtitle: 'Gérer votre équipe',
          description: 'Gérer les informations des employés et des ressources humaines.',
          functions: ['Voir les employés', 'Gérer les contrats'],
          context: 'Ce module vous permet de gérer efficacement votre équipe.',
          quote: 'Le talent est la clé du succès.',
        },
        procesosTareas: {
          title: 'Processus et tâches',
          subtitle: 'Organiser votre travail',
          description: 'Gérer et effectuer des tâches et des processus importants pour votre affaire.',
          functions: ['Créer des tâches', 'Voir les processus'],
          context: 'Ce module vous aide à garder votre affaire organisée.',
          quote: 'L\'organisation est la clé de l\'efficacité.',
        },
        gastos: {
          title: 'Dépenses',
          subtitle: 'Contrôler vos dépenses',
          description: 'Gérer et contrôler vos dépenses pour maintenir votre affaire en bon état.',
          functions: ['Voir les dépenses', 'Approuver les dépenses'],
          context: 'Ce module vous permet de contrôler efficacement vos dépenses.',
          quote: 'Le contrôle des dépenses est fondamental pour le succès.',
        },
        cajaChica: {
          title: 'Petite caisse',
          subtitle: 'Dépenses mineures',
          description: 'Gérer les dépenses mineures pour votre affaire.',
          functions: ['Voir la petite caisse', 'Approuver les dépenses'],
          context: 'Ce module vous permet de gérer efficacement les dépenses mineures.',
          quote: 'La petite caisse est essentielle pour les dépenses mineures.',
        },
        puntoVenta: {
          title: 'Point de vente',
          subtitle: 'Vendre vos produits',
          description: 'Gérer et effectuer des ventes pour votre affaire.',
          functions: ['Faire des ventes', 'Voir les ventes'],
          context: 'Ce module vous permet de vendre efficacement vos produits.',
          quote: 'Les ventes sont la clé du succès.',
        },
        ventas: {
          title: 'Ventes',
          subtitle: 'Gérer vos ventes',
          description: 'Gérer et analyser vos ventes pour améliorer votre affaire.',
          functions: ['Voir les ventes', 'Analyser les ventes'],
          context: 'Ce module vous permet de gérer et analyser vos ventes.',
          quote: 'Les ventes sont la base de votre affaire.',
        },
        kpis: {
          title: 'KPIs',
          subtitle: 'Métriques clés',
          description: 'Gérer et analyser vos KPIs pour améliorer votre affaire.',
          functions: ['Voir les KPIs', 'Configurer les KPIs'],
          context: 'Ce module vous permet de gérer et analyser vos KPIs.',
          quote: 'Les KPIs sont essentiels pour le suivi des performances.',
        },
      },
    },
    panelInicial: {
      title: 'Panneau initial',
      back: 'Retour',
      tabs: {
        profile: 'Profil',
        businessStructure: 'Structure d\'entreprise',
        businessProfile: 'Profil d\'entreprise',
        personalPerformance: 'Performance personnelle',
        billing: 'Facturation',
        plan: 'Plan',
        users: 'Utilisateurs',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['fr-CA'],
      diagnosis: {
        title: 'Diagnostic d\'entreprise',
        description: 'Aidez-nous à mieux connaître votre entreprise et son stade de gestion pour personnaliser Indice.',
        centerTitle: 'Centre de diagnostic d\'entreprise',
        centerDescription: 'Découvrez l\'état de gestion de votre entreprise à travers 4 piliers : Personnes, Processus, Produits et Finances. Avec vos réponses, nous utiliserons l\'Indice de Maturité Entrepreneuriale (IME), qui nous aidera à personnaliser les recommandations, modules et meilleurs partenaires derrière Indice.',
        questionCount: '10 questions chacun',
        questionCountLabel: 'Le diagnostic comprend',
        progress: 'Progrès du diagnostic d\'entreprise',
        progressOf: 'complété',
        onboarding: {
          answeredProgress: 'Vous avez répondu à {answered} questions sur {total}',
          encouragementMid: 'Vous avancez très bien',
          encouragementNear: 'Presque terminé',
          sections: {
              people: {
                title: 'Étape 1 — Votre équipe',
                intro: 'Comprenons comment votre équipe travaille',
                done: 'Terminé — nous comprenons votre équipe',
              },
              processes: {
                title: 'Étape 2 — Votre façon d’opérer',
                intro: 'Comprenons comment fonctionne votre opération quotidienne',
                done: 'Terminé — nous comprenons votre façon d’opérer',
              },
              products: {
                title: 'Étape 3 — Ce que vous vendez',
                intro: 'Comprenons votre offre et son accès au marché',
                done: 'Terminé — nous comprenons ce que vous vendez',
              },
              finance: {
                title: 'Étape 4 — Vos finances',
                intro: 'Comprenons comment vous gérez vos chiffres',
                done: 'Terminé — nous comprenons vos finances',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['fr-CA'],
        printDiagnosis: 'Télécharger PDF',
        start: 'Commencer',
        continue: 'Continuer',
        doAgain: 'Recommencer',
        reviewAnswers: 'Revoir les réponses',
        close: 'Fermer',
        question: 'Question',
        of: 'de',
        completed: 'complétées',
        previous: 'Précédent',
        next: 'Suivant',
        finish: 'Terminer',
        restart: 'Redémarrer le diagnostic',
        actions: {
          save: 'Enregistrer',
          saving: 'Enregistrement...',
          discard: 'Annuler',
        },
        scoreSummary: {
          title: 'Score du diagnostic',
          bmi: 'IME',
          level: 'Niveau',
          answered: 'Répondues',
          score: 'Score',
        },
        messages: {
          loading: 'Chargement du diagnostic d\'entreprise...',
          loadError: 'Impossible de charger le diagnostic d\'entreprise.',
          saveSuccess: 'Le diagnostic d\'entreprise a été enregistré.',
          saveError: 'Impossible d\'enregistrer le diagnostic d\'entreprise.',
          unsavedChanges: 'Vous avez des changements non enregistrés dans le diagnostic d\'entreprise.',
        },
        pillars: {
          people: {
            title: 'Personnes',
            description: 'Analyser les talents, la structure d\'équipe et la communication.',
          },
          processes: {
            title: 'Processus',
            description: 'Évaluer les flux, tâches, évolutivité et efficacité.',
          },
          products: {
            title: 'Produits',
            description: 'Analyser l\'offre, le marché, commercial et proposition de valeur.',
          },
          finance: {
            title: 'Finances',
            description: 'Évaluer le contrôle financier, la gestion et la prise de décision.',
          },
        },
        questions: {
          people: [
            { question: 'Quel est votre rôle principal?', options: ['Fondateur/PDG', 'Opérations', 'Finance', 'Commercial/Autre'] },
            { question: 'Combien de personnes travaillent?', options: ['Moi seul', '2 à 5', '6 à 20', '21 ou plus'] },
            { question: 'Comment votre équipe est-elle organisée?', options: ['Sans structure', 'Rôles de base', 'Domaines définis', 'Organigramme formel'] },
            { question: 'Comment attribuez-vous les tâches?', options: ['Improvisé', 'Listes', 'Attribution structurée', 'Système de gestion'] },
            { question: 'Évaluation des performances?', options: ['Jamais', 'Pour problèmes', 'Hebdomadaire', 'Avec KPIs'] },
            { question: 'Délégation?', options: ['Je fais tout', 'Délègue et supervise', 'Délègue avec contrôle', 'Équipe autonome'] },
            { question: 'Communication interne?', options: ['Informelle', 'Chat', 'Réunions', 'Outils formels'] },
            { question: 'Fréquence des réunions?', options: ['Jamais', 'Sporadique', 'Hebdomadaire', 'Fréquent'] },
            { question: 'Clarté des responsabilités?', options: ['Pas claire', 'Un peu claire', 'Assez claire', 'Totalement claire'] },
            { question: 'Facilité d\'intégration?', options: ['Très difficile', 'Difficile', 'Modéré', 'Facile'] },
          ],
          processes: [
            { question: 'Processus documentés?', options: ['Rien', 'Quelques-uns', 'Majorité', 'Complètement'] },
            { question: 'Gestion des tâches?', options: ['Improvisé', 'Listes', 'Outils', 'Système formel'] },
            { question: 'Suivi des progrès?', options: ['Pas surveillé', 'Occasionnel', 'Rapports', 'KPIs'] },
            { question: 'Automatisation?', options: ['Manuel', 'Outils isolés', 'Automatisation partielle', 'Haute automatisation'] },
            { question: 'Réplicabilité?', options: ['Très difficile', 'Avec effort', 'Possible', 'Facile'] },
            { question: 'Où perd-on du temps?', options: ['Manuel', 'Coordination', 'Information', 'Suivi'] },
            { question: 'Dépendance aux personnes?', options: ['Totale', 'Beaucoup', 'Un peu', 'Peu'] },
            { question: 'Clarté des processus?', options: ['Pas clairs', 'Un peu clairs', 'Assez clairs', 'Totalement clairs'] },
            { question: 'Gestion des erreurs?', options: ['Réaction', 'Informelle', 'Révision', 'Amélioration continue'] },
            { question: 'Évolutivité?', options: ['Nulle', 'Basse', 'Moyenne', 'Haute'] },
          ],
          products: [
            { question: 'Que vendez-vous?', options: ['Services', 'Produits', 'Numérique', 'Mixte'] },
            { question: 'Type de client?', options: ['B2C', 'B2B', 'Gouvernement', 'Mixte'] },
            { question: 'Revenu principal?', options: ['Vente directe', 'Services', 'Abonnement', 'Contrats'] },
            { question: 'Diversification?', options: ['Un', 'Quelques-uns', 'Plusieurs lignes', 'Large'] },
            { question: 'Définition des prix?', options: ['Intuition', 'Concurrence', 'Coûts', 'Stratégie'] },
            { question: 'Suivi des performances?', options: ['Pas mesuré', 'Ventes seulement', 'Ventes+rentabilité', 'Indicateurs'] },
            { question: 'Proposition de valeur?', options: ['Pas claire', 'Un peu claire', 'Assez claire', 'Très claire'] },
            { question: 'Retour client?', options: ['Aucun', 'Informel', 'Enquêtes', 'Analyse'] },
            { question: 'Évolution du produit?', options: ['En cours', 'Changements occasionnels', 'Plans', 'Feuille de route'] },
            { question: 'Priorité commerciale?', options: ['Clients', 'Ventes actuelles', 'Rentabilité', 'Échelle'] },
          ],
          finance: [
            { question: 'Contrôle financier?', options: ['Non structuré', 'Excel', 'Logiciel', 'Système intégré'] },
            { question: 'Révision des chiffres?', options: ['Jamais', 'Mensuelle', 'Hebdomadaire', 'Quotidienne'] },
            { question: 'Flux de trésorerie?', options: ['Pas contrôlé', 'Réaction', 'Révision', 'Projection'] },
            { question: 'Coûts clairs?', options: ['Pas clairs', 'Approximatifs', 'Assez clairs', 'Contrôle total'] },
            { question: 'Marge?', options: ['Je ne sais pas', 'Estimé', 'Clair', 'Totalement mesuré'] },
            { question: 'Décisions financières?', options: ['Intuition', 'Expérience', 'Données', 'Modèles'] },
            { question: 'Revenu prévisible?', options: ['Très variable', 'Variable', 'Stable', 'Très stable'] },
            { question: 'Gestion de la dette?', options: ['Sans contrôle', 'Basique', 'Stratégie', 'Optimisé'] },
            { question: 'Préparation aux crises?', options: ['Nulle', 'Basse', 'Moyenne', 'Haute'] },
            { question: 'Conformité fiscale?', options: ['Sans contrôle', 'Retards', 'À jour', 'Stratégie fiscale'] },
          ],
        },
      },
      billing: {
        title: 'Facturation',
        subtitle: 'Données fiscales, méthode de paiement et factures de service',
        fiscalData: {
          title: 'Données fiscales',
          subtitle: 'Configurez vos données fiscales selon le pays',
          country: 'Pays',
          selectCountry: 'Sélectionnez un pays...',
          rfc: 'RFC',
          razonSocial: 'Raison sociale',
          regimenFiscal: 'Régime fiscal',
          usoCFDI: 'Utilisation CFDI (par défaut)',
          codigoPostalFiscal: 'Code postal (fiscal)',
          nit: 'NIT',
          responsabilidadFiscal: 'Responsabilité fiscale',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: 'Raison sociale',
          inscricaoEstadual: 'Inscription d\'État',
          ein: 'EIN (Tax ID)',
          legalName: 'Nom légal',
          state: 'État',
          businessNumber: 'Numéro d\'entreprise (NE)',
          province: 'Province',
          taxId: 'ID fiscal',
          companyName: 'Nom de l\'entreprise',
          taxRegime: 'Régime fiscal',
          postalCode: 'Code postal',
        },
        paymentMethod: {
          title: 'Méthode de paiement',
          subtitle: 'Configurez votre méthode et fréquence de paiement',
          type: 'Type de paiement préféré',
          selectMethod: 'Sélectionnez une méthode...',
          cardNumber: 'Numéro de carte',
          cvv: 'CVV',
          expirationDate: 'Date d\'expiration',
          cardholderName: 'Nom sur la carte',
          addCard: 'Ajouter une carte',
          cancel: 'Annuler',
          savedCards: 'Cartes enregistrées',
          defaultCard: 'Carte par défaut',
          saveCard: 'Enregistrer la carte',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/AA',
            cardholderName: 'Tel qu\'il apparaît sur la carte',
          },
        },
        automaticBilling: {
          title: 'Facturation automatique',
          subtitle: 'Configurez le renouvellement, le jour de facturation et l\'email de factures',
          enable: 'Activer le renouvellement automatique',
          description: 'Votre abonnement sera renouvelé automatiquement à la fin de la période',
          billingDay: 'Jour de facturation',
          selectDay: 'Jour 1 de chaque mois',
          emailForInvoices: 'Email pour les factures',
          reminderNote: 'Vous recevrez vos factures à cet email',
        },
        currentBilling: {
          title: 'Résumé de facturation actuel',
          plan: 'Plan:',
          notConfigured: 'Non configuré',
          amount: 'Montant:',
          nextPayment: 'Prochain paiement:',
        },
        invoices: {
          title: 'Factures de service',
          subtitle: 'Historique des factures de votre abonnement',
          month: 'Mois',
          year: 'Montant',
          status: 'Statut',
          downloadPdf: 'Télécharger PDF',
          date: 'Date',
          concept: 'Concept',
          amount: 'Montant',
          paid: 'Payée',
          pending: 'En attente',
        },
        billingFrequency: {
          title: 'Fréquence de facturation',
          note: 'Les paiements peuvent avoir 100-30 remise',
          monthly: 'Mensuel',
          quarterly: 'Trimestriel',
          semiannual: 'Semestriel',
          annual: 'Annuel',
        },
      },
      structure: {
        title: 'Structure d\'entreprise',
        subtitle: 'Organisation et unités commerciales',
        status: {
          connected: 'Backend Spring connecté',
          backendNotice: 'Cet écran charge et enregistre maintenant dans le backend Spring. L’identité de l’entreprise ainsi que les détails des unités et des entreprises saisis ici sont conservés via Spring.',
        },
        actions: {
          save: 'Enregistrer les modifications',
          saving: 'Enregistrement...',
          extract: 'Obtenir les coordonnées',
          useLocation: 'Utiliser ma position',
          addUnit: 'Ajouter une nouvelle unité',
          configure: 'Configurer l’unité',
          configureGroup: 'Configurer le groupe',
          createUnit: 'Ajouter une autre unité',
        },
        messages: {
          loading: 'Chargement de la structure d’entreprise...',
          loadError: 'Impossible de charger la structure d’entreprise.',
          saveError: 'Impossible d’enregistrer la structure d’entreprise.',
          saveSuccess: 'Structure d’entreprise enregistrée avec succès.',
          saveOverlay: 'Enregistrement de la structure d’entreprise...',
          saveOverlayDescription: 'Synchronisation de l’entreprise, des unités et des entreprises avec le backend.',
          createUnitTitle: 'Création de l’unité...',
          updateUnitTitle: 'Enregistrement de l’unité...',
          unitOverlayDescription: 'Mise à jour des détails de l’unité dans votre structure d’entreprise.',
          createUnitSuccess: 'Unité ajoutée à la structure d’entreprise.',
          updateUnitSuccess: 'Unité mise à jour dans la structure d’entreprise.',
          createBusinessTitle: 'Création de l’entreprise...',
          updateBusinessTitle: 'Enregistrement de l’entreprise...',
          businessOverlayDescription: 'Mise à jour des détails de l’entreprise dans votre structure d’entreprise.',
          createBusinessSuccess: 'Entreprise ajoutée à la structure d’entreprise.',
          updateBusinessSuccess: 'Entreprise mise à jour dans la structure d’entreprise.',
        },
        mode: {
          title: 'Type d’exploitation',
          description: 'Sélectionnez l’option qui décrit le mieux votre entreprise :',
          helper: '💡 Choisissez comment fonctionne votre entreprise',
          simple: 'Simple',
          multi: 'Multi-unité',
          simpleTitle: 'J’ai une seule entreprise ou succursale',
          simpleDescription: 'Vous avez une seule succursale ou entreprise',
          simpleExample: 'Exemple : un restaurant, une boutique ou une clinique',
          multiTitle: 'J’ai plusieurs succursales ou marques',
          multiDescription: 'Plusieurs succursales, filiales ou entreprises liées',
          multiExample: 'Exemple : plusieurs restaurants, succursales ou marques',
          switchPrompt: 'Avez-vous plus d\'une entreprise ou succursale?',
          switchAction: 'Passer au multi-unité',
          multiNote: 'Gérez plusieurs unités depuis une seule administration.',
          selected: 'Sélectionné',
          structurePreviewTitle: '🧠 Voici comment votre structure fonctionnera',
          structurePreviewLines: [
            'Entreprise',
            ' → Emplacement (ex. Cancún, Montréal)',
            '    → Entreprise (ex. Restaurant, magasin, hôtel)',
          ],
        },
        identity: {
          simple: 'Identité d\'entreprise',
          holding: 'Siège social de l’entreprise',
          simpleDesc: 'Nom, logo, coordonnées, rayon et configuration de base.',
          holdingDesc: 'Nom, logo, coordonnées, rayon et configuration de base.',
          holdingNotice: '💡 Définissez ici d’où votre entreprise opère.',
        },
        headquarters: {
          helper: '💡 Définissez ici d’où votre entreprise opère.',
          context: 'Nous utiliserons ces informations pour organiser vos opérations, employés et rapports.',
          basicInfo: '🏢 Informations de base de votre entreprise',
          industryHelper: 'Cela nous aide à adapter le système à votre type d’entreprise.',
          locationTitle: '📍 Emplacement de votre entreprise',
          locationHelper: 'Cela nous aide avec des fonctions comme la présence et le contrôle des opérations.',
          addressTitle: '📍 Adresse de l’entreprise',
          addressHelper: 'Complétez l’adresse pour mieux identifier votre emplacement',
          addressNote: 'L’adresse est informative. Nous utiliserons les coordonnées pour les fonctions du système.',
        },
        fields: {
          companyName: 'Nom de l’entreprise',
          holdingName: 'Nom de l’entreprise',
          industry: 'Industrie',
          selectIndustry: 'Sélectionnez une industrie',
          industryHint: 'Cela nous aide à adapter le système à votre type d’entreprise.',
          country: 'Pays',
          selectCountry: 'Sélectionnez un pays',
          logo: 'Logo de l’entreprise',
          logoHolding: 'Logo du siège social',
          uploadImage: 'Télécharger l\'image',
          noFileSelected: 'Aucun fichier sélectionné',
          uploadHint: 'JPG/PNG/SVG. Max 1 Mo.',
          removeLogo: 'Supprimer le logo',
          description: 'Description',
          optional: '(optionnel)',
          basicInfo: 'Informations de base',
          location: 'Emplacement',
          contact: 'Contact',
          operationalInfo: 'Informations opérationnelles',
          address: 'Adresse',
          city: 'Ville',
          state: 'Province/État',
          postalCode: 'Code postal',
          phone: 'Téléphone',
          email: 'Courriel',
          manager: 'Gestionnaire/Responsable',
          schedule: 'Horaire',
          logoPreviewAlt: 'Aperçu du logo',
        },
        units: {
          title: '🏬 Vos unités commerciales',
          subtitle: 'Ici, vous pouvez voir et gérer l’organisation de votre entreprise',
          description: 'Ici, vous pouvez voir et gérer l’organisation de votre entreprise',
          context: 'Chaque unité représente une succursale, une marque ou une ligne d’affaires',
          groupLabel: '🧩 Groupe principal',
          mainUnit: 'Unité principale',
          helper: 'Vous pouvez commencer avec une unité et en ajouter d’autres à mesure que votre entreprise grandit',
          tip: '💡 Vous pouvez créer des unités pour chaque succursale ou marque',
          empty: 'Aucune entreprise pour le moment',
          emptyHelper: 'Ajoutez votre première entreprise dans cette unité',
          groupContext: 'Chaque emplacement regroupe les entreprises qui y opèrent',
          tipAction: '💡 Vous pouvez commencer avec une unité et en ajouter d’autres plus tard',
          addUnit: '+ Nouvelle unité',
          addBusiness: '+ Ajouter une entreprise',
          unitName: 'Nom de l\'unité',
          unitCountry: 'Pays d\'opération',
          businessName: 'Nom de l\'entreprise',
          configureUnit: '⚙️ Configurer l’unité',
          configureBusiness: '⚙️ Configurer',
          businessCountSingular: 'entreprise',
          businessCountPlural: 'entreprises',
        },
        modal: {
          newUnit: 'Nouvelle unité commerciale',
          editUnit: 'Modifier l\'unité commerciale',
          newBusiness: 'Nouvelle entreprise',
          editBusiness: 'Modifier l\'entreprise',
          save: 'Enregistrer les modifications',
          cancel: 'Annuler',
          delete: 'Supprimer',
          createBusiness: 'Créer l’entreprise',
          newUnitDescription: 'Ajoutez une nouvelle unité opérationnelle',
          editUnitDescription: 'Modifiez les données de',
          newBusinessDescription: 'Ajoutez une nouvelle entreprise/succursale',
          editBusinessDescription: 'Modifiez les données de',
          confirmDeleteUnit: 'Supprimer cette unité ?',
          confirmDeleteBusiness: 'Supprimer cette entreprise ?',
        },
        placeholders: {
          unitName: 'Ex. Ville de Mexico, Nord, Région Centre...',
          businessName: 'Ex. Succursale centre, boutique Polanco, entrepôt sud...',
          address: 'Rue, numéro, quartier...',
          city: 'Ville',
          state: 'Province/État',
          postalCode: '00000',
          phone: '+1 514 555 1234',
          unitEmail: 'unite@entreprise.com',
          businessEmail: 'entreprise@entreprise.com',
          manager: 'Nom du responsable',
          schedule: 'Lun-Ven 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ Commerce de détail' },
            { value: 'food', label: '🍔 Alimentation et boissons' },
            { value: 'hospitality', label: '🏨 Hôtellerie et hospitalité' },
            { value: 'tech', label: '💻 Technologie' },
            { value: 'software-saas', label: '🧩 Logiciel / SaaS' },
            { value: 'health', label: '🏥 Santé' },
            { value: 'beauty-wellness', label: '💅 Beauté et bien-être' },
            { value: 'education', label: '🎓 Éducation' },
            { value: 'services', label: '💼 Services professionnels' },
            { value: 'consulting', label: '🧠 Conseil' },
            { value: 'legal', label: '⚖️ Juridique' },
            { value: 'accounting-tax', label: '🧾 Comptabilité et fiscalité' },
            { value: 'finance-insurance', label: '💰 Finance et assurance' },
            { value: 'real-estate', label: '🏢 Immobilier' },
            { value: 'construction', label: '🏗️ Construction' },
            { value: 'architecture-engineering', label: '📐 Architecture et ingénierie' },
            { value: 'manufacturing', label: '🏭 Fabrication' },
            { value: 'wholesale-distribution', label: '📦 Vente en gros et distribution' },
            { value: 'logistics-transportation', label: '🚚 Transport et logistique' },
            { value: 'automotive', label: '🚗 Automobile' },
            { value: 'agriculture', label: '🌾 Agriculture' },
            { value: 'energy-utilities', label: '⚡ Énergie et services publics' },
            { value: 'telecommunications', label: '📡 Télécommunications' },
            { value: 'marketing-advertising', label: '📣 Marketing et publicité' },
            { value: 'media-creative', label: '🎨 Médias et création' },
            { value: 'entertainment-events', label: '🎭 Divertissement et événements' },
            { value: 'tourism-travel', label: '✈️ Tourisme et voyages' },
            { value: 'sports-fitness', label: '🏋️ Sports et conditionnement' },
            { value: 'cleaning-facility', label: '🧹 Nettoyage et installations' },
            { value: 'maintenance-repair', label: '🔧 Maintenance et réparation' },
            { value: 'security', label: '🛡️ Sécurité' },
            { value: 'ecommerce', label: '🛒 Commerce électronique' },
            { value: 'import-export', label: '🌐 Importation / Exportation' },
            { value: 'nonprofit', label: '🤝 OBNL / Sans but lucratif' },
            { value: 'government-public', label: '🏛️ Gouvernement / Secteur public' },
            { value: 'pet-services', label: '🐾 Services pour animaux' },
            { value: 'childcare', label: '👶 Garde d’enfants' },
            { value: 'senior-care', label: '🧓 Soins aux aînés' },
            { value: 'pharmaceutical', label: '💊 Pharmaceutique' },
            { value: 'other', label: '📦 Autre' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ Restauration et alimentation' },
            { value: 'retail', label: '🛍️ Commerce de détail et commerce' },
            { value: 'servicios', label: '💼 Services professionnels' },
            { value: 'salud', label: '⚕️ Santé et bien-être' },
            { value: 'educacion', label: '📚 Éducation' },
            { value: 'tecnologia', label: '💻 Technologie' },
            { value: 'construccion', label: '🏗️ Construction' },
            { value: 'manufactura', label: '🏭 Fabrication' },
            { value: 'hospitalidad', label: '🏨 Hôtellerie et tourisme' },
            { value: 'inmobiliaria', label: '🏢 Immobilier' },
            { value: 'transporte', label: '🚚 Transport et logistique' },
            { value: 'entretenimiento', label: '🎭 Divertissement' },
            { value: 'financiero', label: '💰 Services financiers' },
            { value: 'agricultura', label: '🌾 Agriculture' },
            { value: 'otro', label: '📦 Autre' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 Mexique' },
            { value: 'US', label: '🇺🇸 États-Unis' },
            { value: 'CA', label: '🇨🇦 Canada' },
            { value: 'ES', label: '🇪🇸 Espagne' },
            { value: 'CO', label: '🇨🇴 Colombie' },
            { value: 'AR', label: '🇦🇷 Argentine' },
            { value: 'BR', label: '🇧🇷 Brésil' },
            { value: 'CL', label: '🇨🇱 Chili' },
          ],
        },
      },
      profile: {
        title: 'Mon profil',
        subtitle: 'Informations personnelles et paramètres du compte',
        helper: 'Vous pouvez compléter ces informations à tout moment',
        fields: {
          fullName: 'Nom complet',
          email: 'Courriel',
          phone: 'Téléphone',
          position: 'Poste',
          department: 'Département',
          profilePhoto: 'Photo de profil',
          country: 'Pays',
          uploadPhoto: 'Télécharger photo',
          firstNames: 'Prénom(s)',
          lastNames: 'Nom(s) de famille',
          preferredLanguage: 'Langue préférée',
          newPassword: 'Nouveau mot de passe',
          confirmNewPassword: 'Confirmer le nouveau mot de passe',
        },
        sections: {
          identityTitle: 'Identité',
          identitySubtitle: 'Votre photo et votre nom pour l’interface.',
          contactTitle: 'Coordonnées',
          contactSubtitle: 'Informations pour les notifications et la communication.',
          securityTitle: 'Sécurité du compte',
          securitySubtitle: 'Mettez à jour votre mot de passe au besoin.',
          preferencesTitle: 'Préférences',
          preferencesSubtitle: 'Personnalisez la langue de l’interface.',
          nameGroup: 'Prénoms et noms',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, max. 25 Mo; compressée avant l’envoi',
          firstNames: 'Dans certains pays, vous pouvez utiliser un ou plusieurs prénoms.',
          lastNames: 'Cela peut être 1 nom de famille (USA/Canada) ou 2 noms de famille (Mexique/Colombie).',
          phone: 'Le pays met automatiquement l’indicatif téléphonique à jour.',
          password: 'Laissez ce champ vide si vous ne voulez pas le modifier.',
          preferredLanguage: 'Nous utiliserons cette langue pour l’interface et les modèles.',
        },
        actions: {
          save: 'Enregistrer les modifications',
          saving: 'Enregistrement...',
          discard: 'Ignorer',
        },
        messages: {
          loading: 'Chargement du profil...',
          saveSuccess: 'Profil enregistré.',
          loadError: 'Impossible de charger le profil.',
          saveError: 'Impossible d’enregistrer le profil.',
          unsavedChanges: 'Vous avez des modifications non enregistrées.',
          optional: '(facultatif)',
          savingOverlay: 'Enregistrement du profil...',
          passwordMismatch: 'Le nouveau mot de passe et sa confirmation doivent correspondre.',
          passwordMinLength: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
          invalidPhone: 'Entrez un numéro de téléphone valide pour le pays sélectionné.',
        },
      },
      users: {
        title: 'Utilisateurs',
        subtitle: 'Gérer les utilisateurs et les autorisations du système',
        invite: 'Inviter un utilisateur',
        search: 'Rechercher un utilisateur...',
        filters: {
          all: 'Tous',
          active: 'Actifs',
          pending: 'En attente',
          inactive: 'Inactifs',
        },
        roles: {
          superAdmin: 'Super Admin',
          admin: 'Admin',
          user: 'Utilisateur',
        },
        status: {
          active: 'Actif',
          pending: 'En attente',
          inactive: 'Inactif',
        },
        table: {
          name: 'Nom',
          email: 'Courriel',
          role: 'Rôle',
          status: 'Statut',
          modules: 'Modules',
          actions: 'Actions',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['fr-CA'],
        actions: {
          edit: 'Modifier',
          resend: 'Renvoyer l\'invitation',
          delete: 'Supprimer',
        },
        modal: {
          newUser: 'Nouvel utilisateur',
          editUser: 'Modifier l\'utilisateur',
          name: 'Nom',
          email: 'Courriel',
          role: 'Rôle',
          selectRole: 'Sélectionnez un rôle',
          modules: 'Modules',
          selectModules: 'Sélectionnez des modules...',
          inviteLink: 'Lien d\'invitation',
          copyLink: 'Copier le lien',
          copied: '✓ Copié',
          save: 'Enregistrer',
          cancel: 'Annuler',
          send: 'Envoyer l\'invitation',
        },
      },
      plan: {
        title: 'Choisissez le plan qui convient le mieux à votre entreprise',
        subtitle: 'Tous les plans incluent le Mode Apprentissage et les mises à jour continues',
        mostPopular: 'Le plus populaire',
        plans: {
          inicio: {
            name: 'Démarrage',
            description: 'Commencez à organiser votre entreprise',
            button: 'Choisir Démarrage',
          },
          controla: {
            name: 'Contrôle',
            description: 'Bases solides pour organiser et contrôler',
            button: 'Choisir Contrôle',
          },
          escala: {
            name: 'Échelle',
            description: 'Optimisez les zones, standardisez les processus',
            button: 'Choisir Échelle',
          },
          corporativiza: {
            name: 'Entreprise',
            description: 'Automatisez avec l\'IA d\'entreprise et une vision globale',
            button: 'Choisir Entreprise',
          },
        },
        features: {
          humanResources: 'Ressources Humaines',
          processes: 'Processus et Tâches',
          products: 'Produits (POS / CRM)',
          finance: 'Finances (Dépenses / Petite Caisse)',
          kpisBasic: 'KPIs de Base',
          kpisComplete: 'KPIs Complets',
          kpisAdvanced: 'KPIs Avancés',
          kpisCorporate: 'KPIs d\'Entreprise',
          users5: 'Jusqu\'à 5 utilisateurs',
          users10: 'Jusqu\'à 10 utilisateurs',
          users20: 'Jusqu\'à 20 utilisateurs',
          users25: 'Jusqu\'à 25 utilisateurs',
          complementaryModules: 'Modules complémentaires',
          modules2: '2 modules complémentaires',
          modules4: '4 modules complémentaires',
          allModules: 'Tous les modules',
          aiAnalytics: 'IA Analytique et Ventes',
          integrations: 'Intégrations',
          sessions1: '1 session/mois',
          sessions2: '2 sessions/mois',
          sessions4: '4 sessions/mois',
        },
        additionalInfo: {
          title: 'Informations supplémentaires',
          extraUser: 'Utilisateur supplémentaire',
          extraUserPrice: '+10 $ USD par utilisateur supplémentaire sur n\'importe quel plan',
          learningMode: 'Mode Apprentissage',
          learningModeDesc: 'Inclus dans tous les plans sans frais supplémentaires',
          updates: 'Mises à jour',
          updatesDesc: 'Toutes les améliorations incluses automatiquement',
        },
      },
    },
  },
  'pt-BR': {
    header: {
      notifications: 'Notificações',
      profile: 'Meu perfil',
      settings: 'Configurações',
      logout: 'Sair',
      learningMode: 'Rota operacional',
    },
    sections: {
      kpis: 'Seus KPIs',
      favorites: 'Seus favoritos',
      quickAccess: 'Acesso rápido',
      basicModules: 'Módulos básicos',
      main: 'Principais',
      complementaryModules: 'Módulos complementares',
      additional: 'Adicionais',
      aiModules: 'Inteligência artificial',
      aiLabel: 'Módulos de IA',
      configureKpis: 'Configurar KPIs',
    },
    kpis: {
      weeklyRevenue: 'Receitas Semanais',
      netProfit: 'Lucro Líquido',
      activeClients: 'Clientes Ativos',
      activeEmployees: 'Funcionários Ativos',
      pendingTasks: 'Tarefas Pendentes',
      monthlyExpenses: 'Despesas do Mês',
      vsWeekBefore: 'vs semana anterior',
      thisMonth: 'este mês',
      newOnes: 'novos',
      dueToday: 'vencem hoje',
      vsMonthBefore: 'vs mês anterior',
    },
    modules: {
      panelInicial: 'Painel Inicial',
      recursosHumanos: 'Recursos Humanos',
      procesosTareas: 'Processos e tarefas',
      gastos: 'Despesas',
      cajaChica: 'Caixa pequeno',
      puntoVenta: 'Ponto de venda',
      ventas: 'Vendas',
      cartera: 'Contas a receber',
      kpis: 'KPIs',
      mantenimiento: 'Manutenção',
      inventarios: 'Inventário',
      controlMinutas: 'Controle de atas',
      limpieza: 'Limpeza',
      lavanderia: 'Lavanderia',
      transportacion: 'Transporte',
      vehiculosMaquinaria: 'Veículos e maquinário',
      inmuebles: 'Imóveis',
      formularios: 'Formulários',
      facturacion: 'Faturamento',
      correoElectronico: 'E-mail',
      climaLaboral: 'Clima de trabalho',
      afiliados: 'Afiliados',
      indiceAgenteVentas: 'Índice Agente de Vendas',
      indiceAnalitica: 'Índice Analítica',
      capacitacion: 'Treinamento',
      indiceCoach: 'Índice Coach',
    },
    notifications: {
      newTask: 'Nova tarefa atribuída',
      expensePending: 'Despesa pendente de aprovação',
      newClient: 'Novo cliente registrado',
      timeAgo: {
        minutes: 'Há 5 minutos',
        hour: 'Há 1 hora',
        hours: 'Há 2 horas',
      },
    },
	    loginPage: {
	      logoAlt: 'Logo do Indice',
	      workspaceBadge: 'Clareza operacional',
	      accessBadge: 'Acesso Indice',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Estrutura operacional Indice',
	      title: 'Opere seu negócio com clareza.',
	      subtitle:
	        'Conecte colaboradores, processos, produtos e finanças em um espaço operacional criado para empresas em crescimento.',
	      pillars: [
	        {
	          icon: '👥',
	          title: 'Colaboradores',
	          description: 'Equipes, responsabilidades e atividade diária com mais visibilidade.',
	        },
	        {
	          icon: '⚙️',
	          title: 'Processos',
	          description: 'Fluxos claros para executar, acompanhar e reduzir ruído operacional.',
	        },
	        {
	          icon: '📦',
	          title: 'Produtos',
	          description: 'Catálogos, operação comercial e estoque conectados ao negócio.',
	        },
	        {
	          icon: '📊',
	          title: 'Finanças',
	          description: 'Controle financeiro e leitura operacional para decidir melhor.',
	        },
	      ],
	      featureCards: [
	        {
	          title: 'Visibilidade operacional',
	          description: 'Entenda o que está acontecendo em todo o negócio.',
	        },
	        {
	          title: 'Controle empresarial',
	          description: 'Centralize a execução e reduza o caos operacional.',
	        },
	        {
	          title: 'Melhores decisões',
	          description: 'Transforme a atividade diária em insights acionáveis.',
	        },
	      ],
	      visualTitle: 'Crescimento estruturado',
	      visualSubtitle:
	        'O Indice organiza a operação em pilares conectados para que cada equipe trabalhe com contexto e direção.',
	      visualMetricValue: '4',
	      visualMetricLabel: 'pilares conectados',
	      visualSignalLabel: 'Sistema operacional',
	      welcomeTitle: 'Acesse seu espaço operacional',
	      welcomeText:
	        'Continue a execução diária com visibilidade, controle e contexto de negócio.',
	      emailLabel: 'E-mail',
	      emailPlaceholder: 'voce@empresa.com',
	      emailError: 'Digite um endereço de e-mail válido.',
	      passwordLabel: 'Senha',
	      passwordPlaceholder: 'Digite sua senha',
	      forgotPassword: 'Esqueceu sua senha?',
	      hidePassword: 'Ocultar senha',
	      showPassword: 'Mostrar senha',
	      signIn: 'Entrar',
	      signingIn: 'Entrando...',
	      successToast: 'Login realizado com sucesso.',
	      errorFallback: 'Não foi possível entrar.',
	      insideTitle: 'O que você acessa',
	      insideItems: ['Visibilidade operacional', 'Atividade da equipe', 'Controle financeiro', 'Desempenho do negócio'],
	      resetBadge: 'Recuperação de acesso',
	      resetTitle: 'Redefina sua senha',
	      resetDescription:
	        'Informe o e-mail da sua conta. Se ele existir, enviaremos um link de recuperação com validade limitada.',
	      resetCloseLabel: 'Fechar recuperação de senha',
	      resetCancel: 'Cancelar',
	      resetSubmit: 'Enviar link',
	      resetSubmitting: 'Enviando link...',
	      resetSuccessFallback: 'Se esse e-mail existir, um link de redefinição de senha foi enviado.',
	      resetErrorFallback: 'Não foi possível enviar a solicitação de recuperação.',
	    },
    learningMode: {
      welcome: 'Bem-vindo ao Modo de Aprendizado!',
      hide: 'Ocultar',
      show: 'Mostrar',
      businessBase: 'Base de Negócios',
      clearBusinessStable: 'Limpar Base de Negócios Estável',
      functions: 'Funções',
      businessContext: 'Contexto de Negócios',
      indiceMethodology: 'Metodologia Índice',
      addModule: 'Abrir',
      viewBasicModules: 'Ver Módulos Básicos',
      previous: 'Anterior',
      next: 'Próximo',
      stepOf: 'Passo de',
      modules: {
        panelInicial: {
          title: 'Painel Inicial',
          subtitle: '🎯 Seu ponto de partida',
          description: 'O Painel Inicial é o ponto de partida para organizar sua empresa dentro do sistema Índice. 🏢 Aqui você define as informações básicas do seu negócio e configura a estrutura que permitirá que todos os outros módulos funcionem corretamente. ✨ Quando essa base está bem configurada, o sistema pode ajudá-lo a gerenciar pessoas, processos, produtos e finanças com maior clareza.',
          functions: [
            '📊 Atualizar os dados da sua empresa e manter suas informações sempre atualizadas.',
            '⚙️ Configurar as preferências do sistema, como idioma, moeda e configurações operacionais.',
            '📋 Definir as informações básicas do negócio que os outros módulos utilizarão.',
            '🏗️ Estabelecer a estrutura da sua empresa e como sua operação está organizada.',
            '👥 Convidar usuários e gerenciar seus acessos, atribuindo funções e permissões a cada colaborador.',
            '🎓 Realizar avaliações iniciais do negócio que ajudarão você a entender em que estágio sua empresa se encontra.',
            '📈 Calcular o IME — Índice de Maturidade Empresarial, uma ferramenta que analisa o estado atual do seu negócio e orienta sobre como melhorar sua gestão.',
          ],
          context: '💡 Este módulo permite que você tenha uma visão geral da sua empresa e comece a estruturar como seu negócio opera. Quando essa base está bem definida, todos os outros processos do sistema se tornam mais claros e fáceis de gerenciar.',
          quote: '🏆 A organização é o primeiro passo para construir um negócio sólido.',
        },
        recursosHumanos: {
          title: 'Recursos Humanos',
          subtitle: 'Gerencie sua equipe',
          description: 'Gerencie informações de funcionários e recursos humanos.',
          functions: ['Ver funcionários', 'Gerenciar contratos'],
          context: 'Este módulo permite gerenciar eficazmente sua equipe.',
          quote: 'O talento é a chave para o sucesso.',
        },
        procesosTareas: {
          title: 'Processos e tarefas',
          subtitle: 'Organize seu trabalho',
          description: 'Gerencie e execute tarefas e processos importantes para seu negócio.',
          functions: ['Criar tarefas', 'Ver processos'],
          context: 'Este módulo ajuda a manter seu negócio organizado.',
          quote: 'A organização é a chave para a eficiência.',
        },
        gastos: {
          title: 'Despesas',
          subtitle: 'Controle suas despesas',
          description: 'Gerencie e controle suas despesas para manter seu negócio em bom estado.',
          functions: ['Ver despesas', 'Aprovar despesas'],
          context: 'Este módulo permite controlar suas despesas de forma eficaz.',
          quote: 'O controle de despesas é fundamental para o sucesso.',
        },
        cajaChica: {
          title: 'Caixa pequeno',
          subtitle: 'Despesas menores',
          description: 'Gerencie despesas menores para seu negócio.',
          functions: ['Ver caixa pequeno', 'Aprovar despesas'],
          context: 'Este módulo permite gerenciar despesas menores de forma eficiente.',
          quote: 'O caixa pequeno é essencial para despesas menores.',
        },
        puntoVenta: {
          title: 'Ponto de venda',
          subtitle: 'Venda seus produtos',
          description: 'Gerencie e execute vendas para seu negócio.',
          functions: ['Realizar vendas', 'Ver vendas'],
          context: 'Este módulo permite vender seus produtos de forma eficiente.',
          quote: 'A venda é a chave para o sucesso.',
        },
        ventas: {
          title: 'Vendas',
          subtitle: 'Gerencie suas vendas',
          description: 'Gerencie e analise suas vendas para melhorar seu negócio.',
          functions: ['Ver vendas', 'Analisar vendas'],
          context: 'Este módulo permite gerenciar e analisar suas vendas.',
          quote: 'As vendas são a base do seu negócio.',
        },
        kpis: {
          title: 'KPIs',
          subtitle: 'Métricas-chave',
          description: 'Gerencie e analise seus KPIs para melhorar seu negócio.',
          functions: ['Ver KPIs', 'Configurar KPIs'],
          context: 'Este módulo permite gerenciar e analisar seus KPIs.',
          quote: 'Os KPIs são essenciais para o acompanhamento do desempenho.',
        },
      },
    },
    panelInicial: {
      title: 'Painel Inicial',
      back: 'Voltar',
      tabs: {
        profile: 'Perfil',
        businessStructure: 'Estrutura Empresarial',
        businessProfile: 'Perfil empresarial',
        personalPerformance: 'Desempenho pessoal',
        billing: 'Faturamento',
        plan: 'Plano',
        users: 'Usuários',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['pt-BR'],
      diagnosis: {
        title: 'Diagnóstico empresarial',
        description: 'Ajude-nos a conhecer melhor sua empresa e o estágio de gestão para personalizar o Índice.',
        centerTitle: 'Centro de diagnóstico empresarial',
        centerDescription: 'Descubra o estado de gestão da sua empresa através de 4 pilares: Pessoas, Processos, Produtos e Finanças. Com as respostas, usaremos o Índice de Maturidade Empresarial (IME), que nos ajudará a personalizar recomendações, módulos e melhores parceiros por trás do Índice.',
        questionCount: '10 perguntas cada',
        questionCountLabel: 'O diagnóstico contém',
        progress: 'Progresso do diagnóstico empresarial',
        progressOf: 'concluído',
        onboarding: {
          answeredProgress: 'Você respondeu {answered} de {total} perguntas',
          encouragementMid: 'Você está avançando muito bem',
          encouragementNear: 'Quase pronto',
          sections: {
              people: {
                title: 'Passo 1 — Sua equipe',
                intro: 'Vamos entender como sua equipe trabalha',
                done: 'Concluído — entendemos sua equipe',
              },
              processes: {
                title: 'Passo 2 — Como você opera',
                intro: 'Vamos entender como funciona sua operação diária',
                done: 'Concluído — entendemos como você opera',
              },
              products: {
                title: 'Passo 3 — O que você vende',
                intro: 'Vamos entender sua oferta e como ela chega ao mercado',
                done: 'Concluído — entendemos o que você vende',
              },
              finance: {
                title: 'Passo 4 — Suas finanças',
                intro: 'Vamos entender como você controla seus números',
                done: 'Concluído — entendemos suas finanças',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['pt-BR'],
        printDiagnosis: 'Baixar PDF',
        start: 'Começar',
        continue: 'Continuar',
        doAgain: 'Fazer novamente',
        reviewAnswers: 'Revisar respostas',
        close: 'Fechar',
        question: 'Pergunta',
        of: 'de',
        completed: 'concluídas',
        previous: 'Anterior',
        next: 'Próximo',
        finish: 'Finalizar',
        restart: 'Reiniciar diagnóstico',
        actions: {
          save: 'Salvar',
          saving: 'Salvando...',
          discard: 'Descartar',
        },
        scoreSummary: {
          title: 'Pontuação do diagnóstico',
          bmi: 'IME',
          level: 'Nível',
          answered: 'Respondidas',
          score: 'Pontuação',
        },
        messages: {
          loading: 'Carregando diagnóstico empresarial...',
          loadError: 'Não foi possível carregar o diagnóstico empresarial.',
          saveSuccess: 'O diagnóstico empresarial foi salvo.',
          saveError: 'Não foi possível salvar o diagnóstico empresarial.',
          unsavedChanges: 'Você tem alterações não salvas no diagnóstico empresarial.',
        },
        pillars: {
          people: {
            title: 'Pessoas',
            description: 'Analisa talentos, estrutura de equipe e comunicação.',
          },
          processes: {
            title: 'Processos',
            description: 'Avalia fluxos, tarefas, escalabilidade e eficiência.',
          },
          products: {
            title: 'Produtos',
            description: 'Analisa oferta, mercado, comercial e proposta de valor.',
          },
          finance: {
            title: 'Finanças',
            description: 'Avalia controle financeiro, gestão e tomada de decisões.',
          },
        },
        questions: {
          people: [
            { question: 'Qual é o seu papel principal?', options: ['Fundador/CEO', 'Operações', 'Finanças', 'Comercial/Outro'] },
            { question: 'Quantas pessoas trabalham?', options: ['Só eu', '2 a 5', '6 a 20', '21 ou mais'] },
            { question: 'Como sua equipe está organizada?', options: ['Sem estrutura', 'Papéis básicos', 'Áreas definidas', 'Organograma formal'] },
            { question: 'Como atribuem tarefas?', options: ['Improvisado', 'Listas', 'Atribuição estruturada', 'Sistema de gestão'] },
            { question: 'Revisão de desempenho?', options: ['Nunca', 'Por problemas', 'Semanal', 'Com KPIs'] },
            { question: 'Delegação?', options: ['Faço tudo', 'Delego e supervisiono', 'Delego com controle', 'Equipe autônoma'] },
            { question: 'Comunicação interna?', options: ['Informal', 'Chat', 'Reuniões', 'Ferramentas formais'] },
            { question: 'Frequência de reuniões?', options: ['Nunca', 'Esporádico', 'Semanal', 'Frequente'] },
            { question: 'Clareza de responsabilidades?', options: ['Nada clara', 'Um pouco clara', 'Bastante clara', 'Totalmente clara'] },
            { question: 'Facilidade de integração?', options: ['Muito difícil', 'Difícil', 'Moderado', 'Fácil'] },
          ],
          processes: [
            { question: 'Processos documentados?', options: ['Nada', 'Alguns', 'Maioria', 'Totalmente'] },
            { question: 'Gestão de tarefas?', options: ['Improvisado', 'Listas', 'Ferramentas', 'Sistema formal'] },
            { question: 'Monitoramento de progresso?', options: ['Não monitorado', 'Ocasional', 'Relatórios', 'KPIs'] },
            { question: 'Automação?', options: ['Manual', 'Ferramentas isoladas', 'Automação parcial', 'Alta automação'] },
            { question: 'Replicabilidade?', options: ['Muito difícil', 'Com esforço', 'Possível', 'Fácil'] },
            { question: 'Onde se perde tempo?', options: ['Manual', 'Coordenação', 'Informação', 'Acompanhamento'] },
            { question: 'Dependência de pessoas?', options: ['Total', 'Bastante', 'Alguma', 'Pouca'] },
            { question: 'Clareza de processos?', options: ['Nada claros', 'Um pouco claros', 'Bastante claros', 'Totalmente claros'] },
            { question: 'Gestão de erros?', options: ['Reação', 'Informal', 'Revisão', 'Melhoria contínua'] },
            { question: 'Escalabilidade?', options: ['Nula', 'Baixa', 'Média', 'Alta'] },
          ],
          products: [
            { question: 'O que você vende?', options: ['Serviços', 'Produtos', 'Digital', 'Misto'] },
            { question: 'Tipo de cliente?', options: ['B2C', 'B2B', 'Governo', 'Misto'] },
            { question: 'Receita principal?', options: ['Venda direta', 'Serviços', 'Assinatura', 'Contratos'] },
            { question: 'Diversificação?', options: ['Um', 'Alguns', 'Várias linhas', 'Amplo'] },
            { question: 'Definição de preços?', options: ['Intuição', 'Concorrência', 'Custos', 'Estratégia'] },
            { question: 'Acompanhamento de desempenho?', options: ['Não medido', 'Só vendas', 'Vendas+rentabilidade', 'Indicadores'] },
            { question: 'Proposta de valor?', options: ['Não clara', 'Um pouco clara', 'Bastante clara', 'Muito clara'] },
            { question: 'Feedback do cliente?', options: ['Nenhum', 'Informal', 'Pesquisas', 'Análise'] },
            { question: 'Evolução do produto?', options: ['Na hora', 'Mudanças ocasionais', 'Planos', 'Roteiro'] },
            { question: 'Prioridade comercial?', options: ['Clientes', 'Vendas atuais', 'Rentabilidade', 'Escalar'] },
          ],
          finance: [
            { question: 'Controle financeiro?', options: ['Não estruturado', 'Excel', 'Software', 'Sistema integrado'] },
            { question: 'Revisão de números?', options: ['Nunca', 'Mensal', 'Semanal', 'Diário'] },
            { question: 'Fluxo de caixa?', options: ['Não controlado', 'Reação', 'Revisão', 'Projeção'] },
            { question: 'Custos claros?', options: ['Não claros', 'Aproximados', 'Bastante claros', 'Controle total'] },
            { question: 'Margem?', options: ['Não sei', 'Estimado', 'Claro', 'Totalmente medido'] },
            { question: 'Decisões financeiras?', options: ['Intuição', 'Experiência', 'Dados', 'Modelos'] },
            { question: 'Renda previsível?', options: ['Muito variável', 'Variável', 'Estável', 'Muito estável'] },
            { question: 'Gestão de dívidas?', options: ['Sem controle', 'Básico', 'Estratégia', 'Otimizado'] },
            { question: 'Preparação para crises?', options: ['Nula', 'Baixa', 'Média', 'Alta'] },
            { question: 'Conformidade fiscal?', options: ['Sem controle', 'Atrasos', 'Em dia', 'Estratégia fiscal'] },
          ],
        },
      },
      billing: {
        title: 'Faturamento',
        subtitle: 'Dados fiscais, método de pagamento e faturas do serviço',
        fiscalData: {
          title: 'Dados fiscais',
          subtitle: 'Configure seus dados fiscais de acordo com o país',
          country: 'País',
          selectCountry: 'Selecione um país...',
          rfc: 'RFC',
          razonSocial: 'Razão social',
          regimenFiscal: 'Regime fiscal',
          usoCFDI: 'Uso de CFDI (padrão)',
          codigoPostalFiscal: 'Código Postal (Fiscal)',
          nit: 'NIT',
          responsabilidadFiscal: 'Responsabilidade fiscal',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: 'Razão social',
          inscricaoEstadual: 'Inscrição estadual',
          ein: 'EIN (Tax ID)',
          legalName: 'Nome legal',
          state: 'Estado',
          businessNumber: 'Número de negócio (BN)',
          province: 'Província',
          taxId: 'ID fiscal',
          companyName: 'Nome da empresa',
          taxRegime: 'Regime fiscal',
          postalCode: 'Código Postal',
        },
        paymentMethod: {
          title: 'Método de pagamento',
          subtitle: 'Configure seu método e frequência de pagamento',
          type: 'Tipo de pagamento preferido',
          selectMethod: 'Selecione um método...',
          cardNumber: 'Número do cartão',
          cvv: 'CVV',
          expirationDate: 'Data de expiração',
          cardholderName: 'Nome no cartão',
          addCard: 'Adicionar cartão',
          cancel: 'Cancelar',
          savedCards: 'Cartões salvos',
          defaultCard: 'Cartão padrão',
          saveCard: 'Salvar cartão',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/AA',
            cardholderName: 'Como aparece no cartão',
          },
        },
        automaticBilling: {
          title: 'Faturamento automático',
          subtitle: 'Configure renovação, dia de cobrança e e-mail de faturas',
          enable: 'Ativar renovação automática',
          description: 'Sua assinatura será renovada automaticamente ao final do período',
          billingDay: 'Dia de faturamento',
          selectDay: 'Dia 1 de cada mês',
          emailForInvoices: 'E-mail para faturas',
          reminderNote: 'Você receberá suas faturas neste e-mail',
        },
        currentBilling: {
          title: 'Resumo de cobrança atual',
          plan: 'Plano:',
          notConfigured: 'Não configurado',
          amount: 'Valor:',
          nextPayment: 'Próximo pagamento:',
        },
        invoices: {
          title: 'Faturas do serviço',
          subtitle: 'Histórico de faturas da sua assinatura',
          month: 'Mês',
          year: 'Valor',
          status: 'Status',
          downloadPdf: 'Baixar PDF',
          date: 'Data',
          concept: 'Conceito',
          amount: 'Valor',
          paid: 'Paga',
          pending: 'Pendente',
        },
        billingFrequency: {
          title: 'Frequência de faturamento',
          note: 'Os pagamentos podem ter desconto de 100-30',
          monthly: 'Mensal',
          quarterly: 'Trimestral',
          semiannual: 'Semestral',
          annual: 'Anual',
        },
      },
      structure: {
        title: 'Estrutura Empresarial',
        subtitle: 'Organização e unidades de negócio',
        status: {
          connected: 'Backend Spring conectado',
          backendNotice: 'Esta tela agora carrega e salva no backend Spring. A identidade da empresa e os detalhes de unidades e negócios capturados aqui são persistidos pelo Spring.',
        },
        actions: {
          save: 'Salvar alterações',
          saving: 'Salvando...',
          extract: 'Obter coordenadas',
          useLocation: 'Usar minha localização',
          addUnit: 'Adicionar nova unidade',
          configure: 'Configurar unidade',
          configureGroup: 'Configurar grupo',
          createUnit: 'Adicionar outra unidade',
        },
        messages: {
          loading: 'Carregando estrutura empresarial...',
          loadError: 'Não foi possível carregar a estrutura empresarial.',
          saveError: 'Não foi possível salvar a estrutura empresarial.',
          saveSuccess: 'Estrutura Empresarial salva com sucesso.',
          saveOverlay: 'Salvando estrutura empresarial...',
          saveOverlayDescription: 'Sincronizando empresa, unidades e negócios com o backend.',
          createUnitTitle: 'Criando unidade...',
          updateUnitTitle: 'Salvando unidade...',
          unitOverlayDescription: 'Atualizando os detalhes da unidade na sua Estrutura Empresarial.',
          createUnitSuccess: 'Unidade adicionada à Estrutura Empresarial.',
          updateUnitSuccess: 'Unidade atualizada na Estrutura Empresarial.',
          createBusinessTitle: 'Criando negócio...',
          updateBusinessTitle: 'Salvando negócio...',
          businessOverlayDescription: 'Atualizando os detalhes do negócio na sua Estrutura Empresarial.',
          createBusinessSuccess: 'Negócio adicionado à Estrutura Empresarial.',
          updateBusinessSuccess: 'Negócio atualizado na Estrutura Empresarial.',
        },
        mode: {
          title: 'Tipo de operação',
          description: 'Selecione a opção que melhor descreve sua empresa:',
          helper: '💡 Escolha como o seu negócio funciona',
          simple: 'Simples',
          multi: 'Multi-unidade',
          simpleTitle: 'Tenho um único negócio ou filial',
          simpleDescription: 'Você tem uma única filial ou empresa',
          simpleExample: 'Exemplo: um restaurante, loja ou clínica',
          multiTitle: 'Tenho várias filiais ou marcas',
          multiDescription: 'Múltiplas filiais, subsidiárias ou empresas relacionadas',
          multiExample: 'Exemplo: vários restaurantes, filiais ou marcas',
          switchPrompt: 'Você tem mais de um negócio ou filial?',
          switchAction: 'Mudar para multi-unidade',
          multiNote: 'Gerencie várias unidades a partir de uma única administração.',
          selected: 'Selecionado',
          structurePreviewTitle: '🧠 Assim a sua estrutura funcionará',
          structurePreviewLines: [
            'Empresa',
            ' → Localização (ex: Cancún, São Paulo)',
            '    → Negócio (ex: Restaurante, loja, hotel)',
          ],
        },
        identity: {
          simple: 'Sede principal da empresa',
          holding: 'Sede principal da empresa',
          simpleDesc: 'Nome, logo, coordenadas, raio e configuração básica.',
          holdingDesc: 'Nome, logo, coordenadas, raio e configuração básica.',
          holdingNotice: '💡 Aqui você define de onde o seu negócio opera.',
        },
        headquarters: {
          helper: '💡 Aqui você define de onde o seu negócio opera.',
          context: 'Usaremos estas informações para organizar suas operações, funcionários e relatórios.',
          basicInfo: '🏢 Informações básicas da sua empresa',
          industryHelper: 'Isso nos ajuda a adaptar o sistema ao seu tipo de negócio.',
          locationTitle: '📍 Localização do seu negócio',
          locationHelper: 'Isso nos ajuda em funções como presença e controle de operações.',
          addressTitle: '📍 Endereço do negócio',
          addressHelper: 'Complete o endereço para identificar melhor sua localização',
          addressNote: 'O endereço é informativo. Usaremos coordenadas para funções do sistema.',
        },
        fields: {
          companyName: 'Nome da empresa',
          holdingName: 'Nome da empresa',
          industry: 'Indústria',
          selectIndustry: 'Selecione uma indústria',
          industryHint: 'Isso nos ajuda a adaptar o sistema ao seu tipo de negócio.',
          country: 'País',
          selectCountry: 'Selecione um país',
          logo: 'Logo da empresa',
          logoHolding: 'Logo da sede principal',
          uploadImage: 'Carregar imagem',
          noFileSelected: 'Nenhum arquivo selecionado',
          uploadHint: 'JPG/PNG/SVG. Máx. 1MB.',
          removeLogo: 'Remover logo',
          description: 'Descrição',
          optional: '(opcional)',
          basicInfo: 'Informações básicas',
          location: 'Localização',
          contact: 'Contato',
          operationalInfo: 'Informações operacionais',
          address: 'Endereço',
          city: 'Cidade',
          state: 'Estado/Província',
          postalCode: 'CEP',
          phone: 'Telefone',
          email: 'E-mail',
          manager: 'Gerente/Responsável',
          schedule: 'Horário',
          logoPreviewAlt: 'Pré-visualização do logo',
        },
        units: {
          title: '🏬 Suas unidades de negócio',
          subtitle: 'Aqui você pode ver e administrar como seu negócio está organizado',
          description: 'Aqui você pode ver e administrar como seu negócio está organizado',
          context: 'Cada unidade representa uma filial, marca ou linha de negócio',
          groupLabel: '🧩 Grupo principal',
          mainUnit: 'Unidade principal',
          helper: 'Você pode começar com uma unidade e adicionar mais conforme seu negócio crescer',
          tip: '💡 Você pode criar unidades para cada filial ou marca',
          empty: 'Sem negócios ainda',
          emptyHelper: 'Adicione seu primeiro negócio nesta unidade',
          groupContext: 'Cada localização agrupa os negócios que operam ali',
          tipAction: '💡 Você pode começar com uma unidade e adicionar mais depois',
          addUnit: '+ Nova unidade',
          addBusiness: '+ Adicionar negócio',
          unitName: 'Nome da unidade',
          unitCountry: 'País de operação',
          businessName: 'Nome do negócio',
          configureUnit: '⚙️ Configurar unidade',
          configureBusiness: '⚙️ Configurar',
          businessCountSingular: 'negócio',
          businessCountPlural: 'negócios',
        },
        modal: {
          newUnit: 'Nova unidade de negócio',
          editUnit: 'Editar unidade de negócio',
          newBusiness: 'Novo negócio',
          editBusiness: 'Editar negócio',
          save: 'Salvar alterações',
          cancel: 'Cancelar',
          delete: 'Excluir',
          createBusiness: 'Criar negócio',
          newUnitDescription: 'Adicione uma nova unidade operacional',
          editUnitDescription: 'Edite os dados de',
          newBusinessDescription: 'Adicione um novo negócio/filial',
          editBusinessDescription: 'Edite os dados de',
          confirmDeleteUnit: 'Excluir esta unidade?',
          confirmDeleteBusiness: 'Excluir este negócio?',
        },
        placeholders: {
          unitName: 'Ex: Cidade do México, Norte, Região Central...',
          businessName: 'Ex: Filial Centro, Loja Polanco, Armazém Sul...',
          address: 'Rua, número, bairro...',
          city: 'Cidade',
          state: 'Estado',
          postalCode: '00000',
          phone: '+55 11 91234 5678',
          unitEmail: 'unidade@empresa.com',
          businessEmail: 'negocio@empresa.com',
          manager: 'Nome do responsável',
          schedule: 'Seg-Sex 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ Varejo / Comércio' },
            { value: 'food', label: '🍔 Alimentos e Bebidas' },
            { value: 'hospitality', label: '🏨 Hotelaria e Hospitalidade' },
            { value: 'tech', label: '💻 Tecnologia' },
            { value: 'software-saas', label: '🧩 Software / SaaS' },
            { value: 'health', label: '🏥 Saúde' },
            { value: 'beauty-wellness', label: '💅 Beleza e Bem-estar' },
            { value: 'education', label: '🎓 Educação' },
            { value: 'services', label: '💼 Serviços Profissionais' },
            { value: 'consulting', label: '🧠 Consultoria' },
            { value: 'legal', label: '⚖️ Jurídico' },
            { value: 'accounting-tax', label: '🧾 Contabilidade e Impostos' },
            { value: 'finance-insurance', label: '💰 Finanças e Seguros' },
            { value: 'real-estate', label: '🏢 Imobiliário' },
            { value: 'construction', label: '🏗️ Construção' },
            { value: 'architecture-engineering', label: '📐 Arquitetura e Engenharia' },
            { value: 'manufacturing', label: '🏭 Manufatura' },
            { value: 'wholesale-distribution', label: '📦 Atacado e Distribuição' },
            { value: 'logistics-transportation', label: '🚚 Transporte e Logística' },
            { value: 'automotive', label: '🚗 Automotivo' },
            { value: 'agriculture', label: '🌾 Agricultura' },
            { value: 'energy-utilities', label: '⚡ Energia e Serviços Públicos' },
            { value: 'telecommunications', label: '📡 Telecomunicações' },
            { value: 'marketing-advertising', label: '📣 Marketing e Publicidade' },
            { value: 'media-creative', label: '🎨 Mídia e Criatividade' },
            { value: 'entertainment-events', label: '🎭 Entretenimento e Eventos' },
            { value: 'tourism-travel', label: '✈️ Turismo e Viagens' },
            { value: 'sports-fitness', label: '🏋️ Esportes e Fitness' },
            { value: 'cleaning-facility', label: '🧹 Limpeza e Instalações' },
            { value: 'maintenance-repair', label: '🔧 Manutenção e Reparos' },
            { value: 'security', label: '🛡️ Segurança' },
            { value: 'ecommerce', label: '🛒 E-commerce' },
            { value: 'import-export', label: '🌐 Importação / Exportação' },
            { value: 'nonprofit', label: '🤝 ONG / Sem fins lucrativos' },
            { value: 'government-public', label: '🏛️ Governo / Setor público' },
            { value: 'pet-services', label: '🐾 Serviços para pets' },
            { value: 'childcare', label: '👶 Cuidado infantil' },
            { value: 'senior-care', label: '🧓 Cuidado de idosos' },
            { value: 'pharmaceutical', label: '💊 Farmacêutica' },
            { value: 'other', label: '📦 Outro' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ Restaurante e Alimentação' },
            { value: 'retail', label: '🛍️ Varejo e Comércio' },
            { value: 'servicios', label: '💼 Serviços Profissionais' },
            { value: 'salud', label: '⚕️ Saúde e Bem-estar' },
            { value: 'educacion', label: '📚 Educação' },
            { value: 'tecnologia', label: '💻 Tecnologia' },
            { value: 'construccion', label: '🏗️ Construção' },
            { value: 'manufactura', label: '🏭 Manufatura' },
            { value: 'hospitalidad', label: '🏨 Hospitalidade e Turismo' },
            { value: 'inmobiliaria', label: '🏢 Imobiliário' },
            { value: 'transporte', label: '🚚 Transporte e Logística' },
            { value: 'entretenimiento', label: '🎭 Entretenimento' },
            { value: 'financiero', label: '💰 Serviços Financeiros' },
            { value: 'agricultura', label: '🌾 Agricultura' },
            { value: 'otro', label: '📦 Outro' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 México' },
            { value: 'US', label: '🇺🇸 Estados Unidos' },
            { value: 'CA', label: '🇨🇦 Canadá' },
            { value: 'ES', label: '🇪🇸 Espanha' },
            { value: 'CO', label: '🇨🇴 Colômbia' },
            { value: 'AR', label: '🇦🇷 Argentina' },
            { value: 'BR', label: '🇧🇷 Brasil' },
            { value: 'CL', label: '🇨🇱 Chile' },
          ],
        },
      },
      profile: {
        title: 'Meu perfil',
        subtitle: 'Informações pessoais e configurações da conta',
        helper: 'Você pode completar isto a qualquer momento',
        fields: {
          fullName: 'Nome completo',
          email: 'E-mail',
          phone: 'Telefone',
          position: 'Cargo',
          department: 'Departamento',
          profilePhoto: 'Foto de perfil',
          country: 'País',
          uploadPhoto: 'Carregar foto',
          firstNames: 'Nome ou nomes',
          lastNames: 'Sobrenome ou sobrenomes',
          preferredLanguage: 'Idioma preferido',
          newPassword: 'Nova senha',
          confirmNewPassword: 'Confirmar nova senha',
        },
        sections: {
          identityTitle: 'Identidade',
          identitySubtitle: 'Sua foto e seu nome para a interface.',
          contactTitle: 'Informações de contato',
          contactSubtitle: 'Dados para notificações e comunicação.',
          securityTitle: 'Segurança da conta',
          securitySubtitle: 'Atualize sua senha sempre que precisar.',
          preferencesTitle: 'Preferências',
          preferencesSubtitle: 'Personalize o idioma da interface.',
          nameGroup: 'Nome e sobrenomes',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, máx. 25 MB; compactada antes do envio',
          firstNames: 'Em alguns países você pode usar um ou mais nomes.',
          lastNames: 'Pode ser 1 sobrenome (EUA/Canadá) ou 2 sobrenomes (México/Colômbia).',
          phone: 'O país atualiza o código telefônico automaticamente.',
          password: 'Se não quiser alterá-la, deixe em branco.',
          preferredLanguage: 'Usaremos este idioma para a interface e os modelos.',
        },
        actions: {
          save: 'Salvar alterações',
          saving: 'Salvando...',
          discard: 'Descartar',
        },
        messages: {
          loading: 'Carregando perfil...',
          saveSuccess: 'Perfil salvo.',
          loadError: 'Não foi possível carregar o perfil.',
          saveError: 'Não foi possível salvar o perfil.',
          unsavedChanges: 'Você tem alterações não salvas.',
          optional: '(opcional)',
          savingOverlay: 'Salvando perfil...',
          passwordMismatch: 'A nova senha e a confirmação devem ser iguais.',
          passwordMinLength: 'A nova senha deve ter pelo menos 8 caracteres.',
          invalidPhone: 'Digite um número de telefone válido para o país selecionado.',
        },
      },
      users: {
        title: 'Usuários',
        subtitle: 'Gerenciar usuários e permissões do sistema',
        invite: 'Convidar usuário',
        search: 'Pesquisar usuário...',
        filters: {
          all: 'Todos',
          active: 'Ativos',
          pending: 'Pendentes',
          inactive: 'Inativos',
        },
        roles: {
          superAdmin: 'Super Admin',
          admin: 'Admin',
          user: 'Usuário',
        },
        status: {
          active: 'Ativo',
          pending: 'Pendente',
          inactive: 'Inativo',
        },
        table: {
          name: 'Nome',
          email: 'E-mail',
          role: 'Função',
          status: 'Status',
          modules: 'Módulos',
          actions: 'Ações',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['pt-BR'],
        actions: {
          edit: 'Editar',
          resend: 'Reenviar convite',
          delete: 'Excluir',
        },
        modal: {
          newUser: 'Novo usuário',
          editUser: 'Editar usuário',
          name: 'Nome',
          email: 'E-mail',
          role: 'Função',
          selectRole: 'Selecione uma função',
          modules: 'Módulos',
          selectModules: 'Selecione módulos...',
          inviteLink: 'Link de convite',
          copyLink: 'Copiar link',
          copied: '✓ Copiado',
          save: 'Salvar',
          cancel: 'Cancelar',
          send: 'Enviar convite',
        },
      },
      plan: {
        title: 'Escolha o plano que melhor se adapta à sua empresa',
        subtitle: 'Todos os planos incluem Modo Aprendiz e atualizações contínuas',
        mostPopular: 'Mais popular',
        plans: {
          inicio: {
            name: 'Início',
            description: 'Comece a organizar seu negócio',
            button: 'Escolher Início',
          },
          controla: {
            name: 'Controla',
            description: 'Bases sólidas para organizar e controlar',
            button: 'Escolher Controla',
          },
          escala: {
            name: 'Escala',
            description: 'Otimize áreas, padronize processos',
            button: 'Escolher Escala',
          },
          corporativiza: {
            name: 'Corporativiza',
            description: 'Automatize com IA corporativa e visão integral',
            button: 'Escolher Corporativiza',
          },
        },
        features: {
          humanResources: 'Recursos Humanos',
          processes: 'Processos e Tarefas',
          products: 'Produtos (POS / CRM)',
          finance: 'Finanças (Despesas / Caixa)',
          kpisBasic: 'KPIs Básicos',
          kpisComplete: 'KPIs Completos',
          kpisAdvanced: 'KPIs Avançados',
          kpisCorporate: 'KPIs Corporativos',
          users5: 'Até 5 usuários',
          users10: 'Até 10 usuários',
          users20: 'Até 20 usuários',
          users25: 'Até 25 usuários',
          complementaryModules: 'Módulos complementares',
          modules2: '2 módulos complementares',
          modules4: '4 módulos complementares',
          allModules: 'Todos os módulos',
          aiAnalytics: 'IA Analítica e Vendas',
          integrations: 'Integrações',
          sessions1: '1 sessão/mês',
          sessions2: '2 sessões/mês',
          sessions4: '4 sessões/mês',
        },
        additionalInfo: {
          title: 'Informações adicionais',
          extraUser: 'Usuário adicional',
          extraUserPrice: '+$10 USD por usuário extra em qualquer plano',
          learningMode: 'Modo Aprendiz',
          learningModeDesc: 'Incluído em todos os planos sem custo adicional',
          updates: 'Atualizações',
          updatesDesc: 'Todas as melhorias incluídas automaticamente',
        },
      },
    },
  },
  'ko-CA': {
    header: {
      notifications: '알림',
      profile: '내 프로필',
      settings: '설정',
      logout: '로그아웃',
      learningMode: '운영 경로',
    },
    sections: {
      kpis: '귀하의 KPI',
      favorites: '즐겨찾기',
      quickAccess: '빠른 액세스',
      basicModules: '기본 모듈',
      main: '주요',
      complementaryModules: '보완 모듈',
      additional: '추가',
      aiModules: '인공지능',
      aiLabel: 'AI 모듈',
      configureKpis: 'KPI 구성',
    },
    kpis: {
      weeklyRevenue: '주간 매출',
      netProfit: '순이익',
      activeClients: '활성 고객',
      activeEmployees: '활성 직원',
      pendingTasks: '대기 중인 작업',
      monthlyExpenses: '월간 비용',
      vsWeekBefore: '지난 주 대비',
      thisMonth: '이번 달',
      newOnes: '신규',
      dueToday: '오늘 마감',
      vsMonthBefore: '지난 달 대비',
    },
    modules: {
      panelInicial: '초기 패널',
      recursosHumanos: '인적 자원',
      procesosTareas: '프로세스 및 작업',
      gastos: '비용',
      cajaChica: '소액 현금',
      puntoVenta: '판매 지점',
      ventas: '판매',
      cartera: '미수금',
      kpis: 'KPI',
      mantenimiento: '유지 보수',
      inventarios: '재고',
      controlMinutas: '회의록 관리',
      limpieza: '청소',
      lavanderia: '세탁',
      transportacion: '운송',
      vehiculosMaquinaria: '차량 및 기계',
      inmuebles: '부동산',
      formularios: '양식',
      facturacion: '청구',
      correoElectronico: '이메일',
      climaLaboral: '근무 환경',
      afiliados: '제휴 회원',
      indiceAgenteVentas: '판매 에이전트 지수',
      indiceAnalitica: '분석 지수',
      capacitacion: '교육',
      indiceCoach: '코치 지수',
    },
    notifications: {
      newTask: '새 작업 할당됨',
      expensePending: '승인 대기 중인 비용',
      newClient: '새 고객 등록됨',
      timeAgo: {
        minutes: '5분 전',
        hour: '1시간 전',
        hours: '2시간 전',
      },
    },
	    loginPage: {
	      logoAlt: 'Indice 로고',
	      workspaceBadge: '운영 명확성',
	      accessBadge: 'Indice 접속',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Indice 운영 프레임워크',
	      title: '비즈니스를 명확하게 운영하세요.',
	      subtitle:
	        '사람, 프로세스, 제품, 재무를 성장하는 기업을 위한 하나의 운영 워크스페이스로 연결합니다.',
	      pillars: [
	        {
	          icon: '👥',
	          title: '사람',
	          description: '팀, 책임, 일상 활동을 더 명확하게 볼 수 있습니다.',
	        },
	        {
	          icon: '⚙️',
	          title: '프로세스',
	          description: '실행, 후속 조치, 운영 혼선을 줄이는 구조화된 흐름입니다.',
	        },
	        {
	          icon: '📦',
	          title: '제품',
	          description: '카탈로그, 영업 운영, 재고를 비즈니스와 연결합니다.',
	        },
	        {
	          icon: '📊',
	          title: '재무',
	          description: '더 나은 결정을 위한 재무 통제와 운영 인사이트입니다.',
	        },
	      ],
	      featureCards: [
	        {
	          title: '운영 가시성',
	          description: '비즈니스 전반에서 무슨 일이 일어나는지 이해합니다.',
	        },
	        {
	          title: '비즈니스 통제',
	          description: '실행을 한곳에 모으고 운영 혼란을 줄입니다.',
	        },
	        {
	          title: '더 나은 결정',
	          description: '일상 활동을 실행 가능한 인사이트로 바꿉니다.',
	        },
	      ],
	      visualTitle: '구조화된 성장',
	      visualSubtitle:
	        'Indice는 운영을 연결된 핵심 축으로 정리해 모든 팀이 맥락과 방향을 갖고 일하도록 돕습니다.',
	      visualMetricValue: '4',
	      visualMetricLabel: '연결된 핵심 축',
	      visualSignalLabel: '운영 시스템',
	      welcomeTitle: '워크스페이스에 접속하세요',
	      welcomeText:
	        '가시성, 통제, 비즈니스 맥락을 가지고 일상 실행을 이어가세요.',
	      emailLabel: '이메일',
	      emailPlaceholder: 'you@company.com',
	      emailError: '올바른 이메일 주소를 입력하세요.',
	      passwordLabel: '비밀번호',
	      passwordPlaceholder: '비밀번호를 입력하세요',
	      forgotPassword: '비밀번호를 잊으셨나요?',
	      hidePassword: '비밀번호 숨기기',
	      showPassword: '비밀번호 보기',
	      signIn: '로그인',
	      signingIn: '로그인 중...',
	      successToast: '로그인에 성공했습니다.',
	      errorFallback: '로그인할 수 없습니다.',
	      insideTitle: '접속 후 볼 수 있는 것',
	      insideItems: ['운영 가시성', '팀 활동', '재무 통제', '비즈니스 성과'],
	      resetBadge: '접속 복구',
	      resetTitle: '비밀번호 재설정',
	      resetDescription:
	        '계정 이메일을 입력하세요. 계정이 존재하면 제한된 시간 동안 유효한 복구 링크를 보내드립니다.',
	      resetCloseLabel: '비밀번호 재설정 닫기',
	      resetCancel: '취소',
	      resetSubmit: '재설정 링크 보내기',
	      resetSubmitting: '링크 보내는 중...',
	      resetSuccessFallback: '해당 이메일이 존재하면 비밀번호 재설정 링크가 전송되었습니다.',
	      resetErrorFallback: '비밀번호 재설정 요청을 보낼 수 없습니다.',
	    },
    learningMode: {
      welcome: '학습 모드에 오신 것을 환영합니다!',
      hide: '숨기기',
      show: '보이기',
      businessBase: '비즈니스 기반',
      clearBusinessStable: '안정적인 비즈니스 기반 지우기',
      functions: '기능',
      businessContext: '비즈니스 컨텍스트',
      indiceMethodology: '인덱스 방법론',
      addModule: '열기',
      viewBasicModules: '기본 모듈 보기',
      previous: '이전',
      next: '다음',
      stepOf: '단계',
      modules: {
        panelInicial: {
          title: '초기 패널',
          subtitle: '🎯 시작점',
          description: '초기 패널은 인덱스 시스템 내에서 회사를 조직하기 위한 시작점입니다. 🏢 여��에서 비즈니스의 기본 정보를 정의하고 다른 모든 모듈이 올바르게 작동할 수 있도록 하는 구조를 구성합니다. ✨ 이 기반이 잘 구성되면 시스템이 사람, 프로세스, 제품 및 재무를 더 명확하게 관리하는 데 도움이 될 수 있습니다.',
          functions: [
            '📊 회사 데이터를 업데이트하고 정보를 항상 최신 상태로 유지합니다.',
            '⚙️ 언어, 통화 및 운영 설정과 같은 시스템 기본 설정을 구성합니다.',
            '📋 다른 모듈이 사용할 기본 비즈니스 정보를 정의합니다.',
            '🏗️ 회사 구조와 운영 방식을 설정합니다.',
            '👥 사용자를 초대하고 각 협력자에게 역할과 권한을 할당하여 액세스를 관리합니다.',
            '🎓 회사가 어떤 단계에 있는지 이해하는 데 도움이 되는 초기 비즈니스 평가를 수행합니다.',
            '📈 BMI(비즈니스 성숙도 지수)를 계산합니다. 이는 비즈니스의 현��� 상태를 분석하고 관리를 개선하는 방법을 안내하는 도구입니다.',
          ],
          context: '💡 이 모듈을 사용하면 회사의 개요를 파악하고 비즈니스 운영 방식을 구조화하기 시작할 수 있습니다. 이 기반이 잘 정의되면 시스템의 다른 모든 프로세스가 더 명확하고 관리하기 쉬워집니다.',
          quote: '🏆 조직은 견고한 비즈니스를 구축하는 첫 번째 단계입니다.',
        },
        recursosHumanos: {
          title: '인적 자원',
          subtitle: '팀 관리',
          description: '직원 및 인적 자원 정보를 관리합니다.',
          functions: ['직원 보기', '계약 관리'],
          context: '이 모듈을 사용하면 팀을 효과적으로 관리할 수 있습니다.',
          quote: '인재는 성공의 열쇠입니다.',
        },
        procesosTareas: {
          title: '프로세스 및 작업',
          subtitle: '작업 정리',
          description: '비즈니스에 중요한 작업 및 프로세스를 관리하고 수행합니다.',
          functions: ['작업 생성', '프로세스 보기'],
          context: '이 모듈은 비즈니스를 체계적으로 유지하는 데 도움이 됩니다.',
          quote: '조직은 효율성의 열쇠입니다.',
        },
        gastos: {
          title: '비용',
          subtitle: '비용 관리',
          description: '비즈니스를 양호한 상태로 유지하기 위해 비용을 관리하고 통제합니다.',
          functions: ['비용 보기', '비용 승인'],
          context: '이 모듈을 사용하면 비용을 효과적으로 관리할 수 있습니다.',
          quote: '비용 관리는 성공의 기본입니다.',
        },
        cajaChica: {
          title: '소액 현금',
          subtitle: '소액 비용',
          description: '비즈니스의 소액 비용을 관리합니다.',
          functions: ['소액 현금 보기', '비용 승인'],
          context: '이 모듈을 사용하면 소액 비용을 효율적으로 관리할 수 있습니다.',
          quote: '소액 현금은 소액 비용에 필수적입니다.',
        },
        puntoVenta: {
          title: '판매 지점',
          subtitle: '제품 판매',
          description: '비즈니스를 위한 판매를 관리하고 수행합니다.',
          functions: ['판매하기', '판매 보기'],
          context: '이 모듈을 사용하면 제품을 효율적으로 판매할 수 있습니다.',
          quote: '판매는 성공의 열쇠입니다.',
        },
        ventas: {
          title: '판매',
          subtitle: '판매 관리',
          description: '비즈니스를 개선하기 위해 판매를 관리하고 분석합니다.',
          functions: ['판매 보기', '판매 분석'],
          context: '이 모듈을 사용하면 판매를 관리하고 분석할 수 있습니다.',
          quote: '판매는 비즈니스의 기반입니다.',
        },
        kpis: {
          title: 'KPI',
          subtitle: '주요 지표',
          description: '비즈니스를 개선하기 위해 KPI를 관리하고 분석합니다.',
          functions: ['KPI 보기', 'KPI 구성'],
          context: '이 모듈을 사용하면 KPI를 관리하고 분석할 수 있습니다.',
          quote: 'KPI는 성과 추적에 필수적입니다.',
        },
      },
    },
    panelInicial: {
      title: '초기 패널',
      back: '뒤로',
      tabs: {
        profile: '프로필',
        businessStructure: '기업 구조',
        businessProfile: '기업 프로필',
        personalPerformance: '개인 성과',
        billing: '청구',
        plan: '계획',
        users: '사용자',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['ko-CA'],
      diagnosis: {
        title: '비즈니스 진단',
        description: '귀사와 관리 단계를 더 잘 이해하여 Indice를 개인화할 수 있도록 도와주세요.',
        centerTitle: '비즈니스 진단 센터',
        centerDescription: '사람, 프로세스, 제품 및 재무의 4가지 기둥을 통해 귀사의 관리 상태를 발견하십시오. 귀하의 답변을 통해 비즈니스 성숙도 지수(BMI)를 사용하여 Indice 뒤에 있는 권장 사항, 모듈 및 최고의 파트너를 개인화하는 데 도움이 됩니다.',
        questionCount: '각 10개 질문',
        questionCountLabel: '진단에는',
        progress: '비즈니스 진단 진행',
        progressOf: '완료',
        onboarding: {
          answeredProgress: '{total}개 질문 중 {answered}개에 답했습니다',
          encouragementMid: '아주 잘 진행하고 있습니다',
          encouragementNear: '거의 완료되었습니다',
          sections: {
              people: {
                title: '1단계 — 팀',
                intro: '팀이 어떻게 일하는지 이해해 보겠습니다',
                done: '완료 — 팀을 이해했습니다',
              },
              processes: {
                title: '2단계 — 운영 방식',
                intro: '일상 운영이 어떻게 이루어지는지 이해해 보겠습니다',
                done: '완료 — 운영 방식을 이해했습니다',
              },
              products: {
                title: '3단계 — 판매하는 것',
                intro: '제공하는 상품과 시장 전달 방식을 이해해 보겠습니다',
                done: '완료 — 판매하는 것을 이해했습니다',
              },
              finance: {
                title: '4단계 — 재무',
                intro: '숫자를 어떻게 관리하는지 이해해 보겠습니다',
                done: '완료 — 재무를 이해했습니다',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['ko-CA'],
        printDiagnosis: 'PDF 다운로드',
        start: '시작',
        continue: '계속',
        doAgain: '다시 하기',
        reviewAnswers: '답변 검토',
        close: '닫기',
        question: '질문',
        of: '의',
        completed: '완료됨',
        previous: '이전',
        next: '다음',
        finish: '완료',
        restart: '진단 재시작',
        actions: {
          save: '저장',
          saving: '저장 중...',
          discard: '취소',
        },
        scoreSummary: {
          title: '진단 점수',
          bmi: 'BMI',
          level: '레벨',
          answered: '응답 수',
          score: '점수',
        },
        messages: {
          loading: '비즈니스 진단을 불러오는 중입니다...',
          loadError: '비즈니스 진단을 불러오지 못했습니다.',
          saveSuccess: '비즈니스 진단이 저장되었습니다.',
          saveError: '비즈니스 진단을 저장하지 못했습니다.',
          unsavedChanges: '비즈니스 진단에 저장되지 않은 변경 사항이 있습니다.',
        },
        pillars: {
          people: {
            title: '사람',
            description: '인재, 팀 구조 및 커뮤니케이션을 분석합니다.',
          },
          processes: {
            title: '프로세스',
            description: '흐름, 작업, 확장성 및 효율성을 평가합니다.',
          },
          products: {
            title: '제품',
            description: '제공, 시장, 판매 및 가치 제안을 분석합니다.',
          },
          finance: {
            title: '재무',
            description: '재무 통제, 관리 및 의사 결정을 평가합니다.',
          },
        },
        questions: {
          people: [
            { question: '주요 역할은 무엇입니까?', options: ['창립자/CEO', '운영', '재무', '영업/기타'] },
            { question: '몇 명이 일하나요?', options: ['나만', '2~5명', '6~20명', '21명 이상'] },
            { question: '팀은 어떻게 구성되어 있습니까?', options: ['구조 없음', '기본 역할', '정의된 영역', '공식 조직도'] },
            { question: '작업을 어떻게 할당합니까?', options: ['즉흥적', '목록', '구조화된 할당', '관리 시스템'] },
            { question: '성과 검토?', options: ['없음', '문제 발생 시', '주간', 'KPI 사용'] },
            { question: '위임?', options: ['모두 직접', '위임하고 감독', '통제하며 위임', '자율 팀'] },
            { question: '내부 커뮤니케이션?', options: ['비공식', '채팅', '회의', '공식 도구'] },
            { question: '회의 빈도?', options: ['없음', '산발적', '주간', '빈번'] },
            { question: '책임의 명확성?', options: ['불명확', '다소 명확', '상당히 명확', '완전히 명확'] },
            { question: '통합의 용이성?', options: ['매우 어려움', '어려움', '보통', '쉬움'] },
          ],
          processes: [
            { question: '문서화된 프로세스?', options: ['없음', '일부', '대부분', '완전히'] },
            { question: '작업 관리?', options: ['즉흥적', '목록', '도구', '공식 시스템'] },
            { question: '진행 모니터링?', options: ['모니터링 안 됨', '가끔', '보고서', 'KPI'] },
            { question: '자동화?', options: ['수동', '고립된 도구', '부분 자동화', '높은 자동화'] },
            { question: '복제 가능성?', options: ['매우 어려움', '노력 필요', '가능', '쉬움'] },
            { question: '시간이 낭비되는 곳?', options: ['수작업', '조정', '정보', '후속 조치'] },
            { question: '사람에 대한 의존도?', options: ['전적으로', '상당히', '다소', '적게'] },
            { question: '프로세스 명확성?', options: ['불명확', '다소 명확', '상당히 명확', '완전히 명확'] },
            { question: '오류 관리?', options: ['반응', '비공식', '검토', '지속적 개선'] },
            { question: '확장성?', options: ['없음', '낮음', '중간', '높음'] },
          ],
          products: [
            { question: '무엇을 판매합니까?', options: ['서비스', '제품', '디지털', '혼합'] },
            { question: '고객 유형?', options: ['B2C', 'B2B', '정부', '혼합'] },
            { question: '주요 수익?', options: ['직접 판매', '서비스', '구독', '계약'] },
            { question: '다각화?', options: ['하나', '일부', '여러 라인', '광범위'] },
            { question: '가격 정의?', options: ['직관', '경쟁', '비용', '전략'] },
            { question: '성과 추적?', options: ['측정 안 됨', '판매만', '판매+수익성', '지표'] },
            { question: '가치 제안?', options: ['불명확', '다소 명확', '상당히 명확', '매우 명확'] },
            { question: '고객 피드백?', options: ['없음', '비공식', '설문조사', '분석'] },
            { question: '제품 진화?', options: ['즉석', '가끔 변경', '계획', '로드맵'] },
            { question: '상업적 우선순위?', options: ['고객', '현재 판매', '수익성', '확장'] },
          ],
          finance: [
            { question: '재무 통제?', options: ['비구조화', 'Excel', '소프트웨어', '통합 시스템'] },
            { question: '숫자 검토?', options: ['없음', '월간', '주간', '매일'] },
            { question: '현금 흐름?', options: ['통제 안 됨', '반응', '검토', '예측'] },
            { question: '명확한 비용?', options: ['불명확', '대략', '상당히 명확', '완전한 통제'] },
            { question: '마진?', options: ['모름', '추정', '명확', '완전히 측정'] },
            { question: '재무 결정?', options: ['직관', '경험', '데이터', '모델'] },
            { question: '예측 가능한 수입?', options: ['매우 가변적', '가변적', '안정적', '매우 안정적'] },
            { question: '부채 관리?', options: ['통제 없음', '기본', '전략', '최적화'] },
            { question: '위기 대비?', options: ['없음', '낮음', '중간', '높음'] },
            { question: '세금 준수?', options: ['통제 없음', '지연', '최신', '세금 전략'] },
          ],
        },
      },
      billing: {
        title: '청구',
        subtitle: '세금 데이터, 결제 방법 및 서비스 송장',
        fiscalData: {
          title: '세금 데이터',
          subtitle: '국가에 따라 세금 데이터 구성',
          country: '국가',
          selectCountry: '국가 선택...',
          rfc: 'RFC',
          razonSocial: '법적 명칭',
          regimenFiscal: '세금 제도',
          usoCFDI: 'CFDI 사용 (기본)',
          codigoPostalFiscal: '우편번호 (세금)',
          nit: 'NIT',
          responsabilidadFiscal: '세금 책임',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: '법적 명칭',
          inscricaoEstadual: '주 등록',
          ein: 'EIN (세금 ID)',
          legalName: '법적 명칭',
          state: '주',
          businessNumber: '사업자 번호 (BN)',
          province: '지방',
          taxId: '세금 ID',
          companyName: '회사명',
          taxRegime: '세금 제도',
          postalCode: '우편번호',
        },
        paymentMethod: {
          title: '결제 방법',
          subtitle: '결제 방법 및 빈도 구성',
          type: '선호하는 결제 유형',
          selectMethod: '방법 선택...',
          cardNumber: '카드 번호',
          cvv: 'CVV',
          expirationDate: '만료일',
          cardholderName: '카드 소유자 이름',
          addCard: '카드 추가',
          cancel: '취소',
          savedCards: '저장된 카드',
          defaultCard: '기본 카드',
          saveCard: '카드 저장',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/YY',
            cardholderName: '카드에 표시된 대로',
          },
        },
        automaticBilling: {
          title: '자동 청구',
          subtitle: '갱신, 청구일 및 송장 이메일 구성',
          enable: '자동 갱신 활성화',
          description: '기간 종료 시 구독이 자동으로 갱신됩니다',
          billingDay: '청구일',
          selectDay: '매월 1일',
          emailForInvoices: '송장용 이메일',
          reminderNote: '이 이메일로 송장을 받습니다',
        },
        currentBilling: {
          title: '현재 청구 요약',
          plan: '계획:',
          notConfigured: '구성되지 않음',
          amount: '금액:',
          nextPayment: '다음 결제:',
        },
        invoices: {
          title: '서비스 송장',
          subtitle: '구독 송장 내역',
          month: '월',
          year: '금액',
          status: '상태',
          downloadPdf: 'PDF 다운로드',
          date: '날짜',
          concept: '항목',
          amount: '금액',
          paid: '결제됨',
          pending: '대기 중',
        },
        billingFrequency: {
          title: '청구 빈도',
          note: '결제에 100-30 할인이 있을 수 있습니다',
          monthly: '월간',
          quarterly: '분기별',
          semiannual: '반기별',
          annual: '연간',
        },
      },
      structure: {
        title: '비즈니스 구조',
        subtitle: '조직 및 사업 단위',
        status: {
          connected: 'Spring 백엔드 연결됨',
          backendNotice: '이 화면은 이제 Spring 백엔드에서 불러오고 저장합니다. 여기서 입력한 회사 정체성과 단위 및 비즈니스 세부 정보는 Spring을 통해 유지됩니다.',
        },
        actions: {
          save: '변경 사항 저장',
          saving: '저장 중...',
          extract: '좌표 가져오기',
          useLocation: '내 위치 사용',
          addUnit: '새 단위 추가',
          configure: '단위 설정',
          configureGroup: '그룹 설정',
          createUnit: '다른 단위 추가',
        },
        messages: {
          loading: '비즈니스 구조를 불러오는 중...',
          loadError: '비즈니스 구조를 불러올 수 없습니다.',
          saveError: '비즈니스 구조를 저장할 수 없습니다.',
          saveSuccess: '비즈니스 구조가 저장되었습니다.',
          saveOverlay: '비즈니스 구조 저장 중...',
          saveOverlayDescription: '회사, 단위, 비즈니스 세부 정보를 백엔드와 동기화하고 있습니다.',
          createUnitTitle: '단위 생성 중...',
          updateUnitTitle: '단위 저장 중...',
          unitOverlayDescription: '비즈니스 구조에서 단위 세부 정보를 업데이트하고 있습니다.',
          createUnitSuccess: '단위가 비즈니스 구조에 추가되었습니다.',
          updateUnitSuccess: '단위가 비즈니스 구조에서 업데이트되었습니다.',
          createBusinessTitle: '비즈니스 생성 중...',
          updateBusinessTitle: '비즈니스 저장 중...',
          businessOverlayDescription: '비즈니스 구조에서 비즈니스 세부 정보를 업데이트하고 있습니다.',
          createBusinessSuccess: '비즈니스가 비즈니스 구조에 추가되었습니다.',
          updateBusinessSuccess: '비즈니스가 비즈니스 구조에서 업데이트되었습니다.',
        },
        mode: {
          title: '운영 유형',
          description: '회사에 가장 잘 맞는 옵션을 선택하세요:',
          helper: '💡 비즈니스 운영 방식을 선택하세요',
          simple: '단순',
          multi: '다중 단위',
          simpleTitle: '하나의 비즈니스 또는 지점이 있습니다',
          simpleDescription: '하나의 지점 또는 회사',
          simpleExample: '예시: 레스토랑, 매장 또는 클리닉',
          multiTitle: '여러 지점 또는 브랜드가 있습니다',
          multiDescription: '여러 지점, 자회사 또는 관련 회사',
          multiExample: '예시: 여러 레스토랑, 지점 또는 브랜드',
          switchPrompt: '둘 이상의 비즈니스 또는 지점이 있습니까?',
          switchAction: '다중 단위로 전환',
          multiNote: '단일 관리에서 여러 단위를 관리합니다.',
          selected: '선택됨',
          structurePreviewTitle: '🧠 구조는 이렇게 작동합니다',
          structurePreviewLines: [
            '회사',
            ' → 위치 (예: 칸쿤, 토론토)',
            '    → 비즈니스 (예: 레스토랑, 매장, 호텔)',
          ],
        },
        identity: {
          simple: '회사 본사',
          holding: '회사 본사',
          simpleDesc: '회사 이름, 로고, 좌표, 반경 및 기본 구성.',
          holdingDesc: '회사 이름, 로고, 좌표, 반경 및 기본 구성.',
          holdingNotice: '💡 여기에서 비즈니스 운영 위치를 정의합니다.',
        },
        headquarters: {
          helper: '💡 여기에서 비즈니스 운영 위치를 정의합니다.',
          context: '이 정보는 운영, 직원, 보고서를 구성하는 데 사용됩니다.',
          basicInfo: '🏢 회사 기본 정보',
          industryHelper: '비즈니스 유형에 맞게 시스템을 조정하는 데 도움이 됩니다.',
          locationTitle: '📍 비즈니스 위치',
          locationHelper: '출퇴근 및 운영 관리 같은 기능에 도움이 됩니다.',
          addressTitle: '📍 비즈니스 주소',
          addressHelper: '위치를 더 잘 식별할 수 있도록 주소를 입력하세요',
          addressNote: '주소는 참고용입니다. 시스템 기능에는 좌표를 사용합니다.',
        },
        fields: {
          companyName: '회사 이름',
          holdingName: '회사 이름',
          industry: '산업',
          selectIndustry: '산업 선택',
          industryHint: '비즈니스 유형에 맞게 시스템을 조정하는 데 도움이 됩니다.',
          country: '국가',
          selectCountry: '국가 선택',
          logo: '회사 로고',
          logoHolding: '본사 로고',
          uploadImage: '이미지 업로드',
          noFileSelected: '선택된 파일 없음',
          uploadHint: 'JPG/PNG/SVG. 최대 1MB.',
          removeLogo: '로고 제거',
          description: '설명',
          optional: '(선택사항)',
          basicInfo: '기본 정보',
          location: '위치',
          contact: '연락처',
          operationalInfo: '운영 정보',
          address: '주소',
          city: '도시',
          state: '주/도',
          postalCode: '우편번호',
          phone: '전화',
          email: '이메일',
          manager: '관리자/담당자',
          schedule: '일정',
          logoPreviewAlt: '로고 미리보기',
        },
        units: {
          title: '🏬 사업 단위',
          subtitle: '여기에서 비즈니스가 어떻게 구성되어 있는지 보고 관리할 수 있습니다',
          description: '여기에서 비즈니스가 어떻게 구성되어 있는지 보고 관리할 수 있습니다',
          context: '각 단위는 지점, 브랜드 또는 사업 라인을 나타냅니다',
          groupLabel: '🧩 기본 그룹',
          mainUnit: '기본 단위',
          helper: '하나의 단위로 시작하고 비즈니스가 성장하면 더 추가할 수 있습니다',
          tip: '💡 각 지점이나 브랜드별로 단위를 만들 수 있습니다',
          empty: '아직 비즈니스가 없습니다',
          emptyHelper: '이 단위에 첫 비즈니스를 추가하세요',
          groupContext: '각 위치는 그곳에서 운영되는 비즈니스를 묶습니다',
          tipAction: '💡 하나의 단위로 시작하고 나중에 더 추가할 수 있습니다',
          addUnit: '+ 새 단위',
          addBusiness: '+ 비즈니스 추가',
          unitName: '단위 이름',
          unitCountry: '운영 국가',
          businessName: '비즈니스 이름',
          configureUnit: '⚙️ 단위 설정',
          configureBusiness: '⚙️ 설정',
          businessCountSingular: '비즈니스',
          businessCountPlural: '비즈니스',
        },
        modal: {
          newUnit: '새로운 사업 단위',
          editUnit: '사업 단위 편집',
          newBusiness: '새 비즈니스',
          editBusiness: '비즈니스 편집',
          save: '변경 사항 저장',
          cancel: '취소',
          delete: '삭제',
          createBusiness: '비즈니스 생성',
          newUnitDescription: '새 운영 단위를 추가하세요',
          editUnitDescription: '다음 정보 수정',
          newBusinessDescription: '새 비즈니스/지점을 추가하세요',
          editBusinessDescription: '다음 정보 수정',
          confirmDeleteUnit: '이 단위를 삭제할까요?',
          confirmDeleteBusiness: '이 비즈니스를 삭제할까요?',
        },
        placeholders: {
          unitName: '예: 멕시코시티, 북부, 중앙 지역...',
          businessName: '예: 다운타운 지점, 폴랑코 매장, 남부 창고...',
          address: '도로명, 번지, 구역...',
          city: '도시',
          state: '주',
          postalCode: '00000',
          phone: '+82 10 1234 5678',
          unitEmail: 'unit@company.com',
          businessEmail: 'business@company.com',
          manager: '담당자 이름',
          schedule: '월-금 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ 소매 / 상업' },
            { value: 'food', label: '🍔 식음료' },
            { value: 'hospitality', label: '🏨 호텔 및 환대' },
            { value: 'tech', label: '💻 기술' },
            { value: 'software-saas', label: '🧩 소프트웨어 / SaaS' },
            { value: 'health', label: '🏥 건강' },
            { value: 'beauty-wellness', label: '💅 뷰티 및 웰니스' },
            { value: 'education', label: '🎓 교육' },
            { value: 'services', label: '💼 전문 서비스' },
            { value: 'consulting', label: '🧠 컨설팅' },
            { value: 'legal', label: '⚖️ 법률' },
            { value: 'accounting-tax', label: '🧾 회계 및 세무' },
            { value: 'finance-insurance', label: '💰 금융 및 보험' },
            { value: 'real-estate', label: '🏢 부동산' },
            { value: 'construction', label: '🏗️ 건설' },
            { value: 'architecture-engineering', label: '📐 건축 및 엔지니어링' },
            { value: 'manufacturing', label: '🏭 제조' },
            { value: 'wholesale-distribution', label: '📦 도매 및 유통' },
            { value: 'logistics-transportation', label: '🚚 운송 및 물류' },
            { value: 'automotive', label: '🚗 자동차' },
            { value: 'agriculture', label: '🌾 농업' },
            { value: 'energy-utilities', label: '⚡ 에너지 및 유틸리티' },
            { value: 'telecommunications', label: '📡 통신' },
            { value: 'marketing-advertising', label: '📣 마케팅 및 광고' },
            { value: 'media-creative', label: '🎨 미디어 및 크리에이티브' },
            { value: 'entertainment-events', label: '🎭 엔터테인먼트 및 이벤트' },
            { value: 'tourism-travel', label: '✈️ 관광 및 여행' },
            { value: 'sports-fitness', label: '🏋️ 스포츠 및 피트니스' },
            { value: 'cleaning-facility', label: '🧹 청소 및 시설 관리' },
            { value: 'maintenance-repair', label: '🔧 유지보수 및 수리' },
            { value: 'security', label: '🛡️ 보안' },
            { value: 'ecommerce', label: '🛒 전자상거래' },
            { value: 'import-export', label: '🌐 수입 / 수출' },
            { value: 'nonprofit', label: '🤝 비영리 단체' },
            { value: 'government-public', label: '🏛️ 정부 / 공공 부문' },
            { value: 'pet-services', label: '🐾 반려동물 서비스' },
            { value: 'childcare', label: '👶 보육' },
            { value: 'senior-care', label: '🧓 노인 돌봄' },
            { value: 'pharmaceutical', label: '💊 제약' },
            { value: 'other', label: '📦 기타' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ 레스토랑 및 식품' },
            { value: 'retail', label: '🛍️ 소매 및 상업' },
            { value: 'servicios', label: '💼 전문 서비스' },
            { value: 'salud', label: '⚕️ 건강 및 웰빙' },
            { value: 'educacion', label: '📚 교육' },
            { value: 'tecnologia', label: '💻 기술' },
            { value: 'construccion', label: '🏗️ 건설' },
            { value: 'manufactura', label: '🏭 제조' },
            { value: 'hospitalidad', label: '🏨 환대 및 관광' },
            { value: 'inmobiliaria', label: '🏢 부동산' },
            { value: 'transporte', label: '🚚 운송 및 물류' },
            { value: 'entretenimiento', label: '🎭 엔터테인먼트' },
            { value: 'financiero', label: '💰 금융 서비스' },
            { value: 'agricultura', label: '🌾 농업' },
            { value: 'otro', label: '📦 기타' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 멕시코' },
            { value: 'US', label: '🇺🇸 미국' },
            { value: 'CA', label: '🇨🇦 캐나다' },
            { value: 'ES', label: '🇪🇸 스페인' },
            { value: 'CO', label: '🇨🇴 콜롬비아' },
            { value: 'AR', label: '🇦🇷 아르헨티나' },
            { value: 'BR', label: '🇧🇷 브라질' },
            { value: 'CL', label: '🇨🇱 칠레' },
          ],
        },
      },
      profile: {
        title: '내 프로필',
        subtitle: '개인 정보 및 계정 설정',
        helper: '언제든지 완료할 수 있습니다',
        fields: {
          fullName: '전체 이름',
          email: '이메일',
          phone: '전화',
          position: '직위',
          department: '부서',
          profilePhoto: '프로필 사진',
          country: '국가',
          uploadPhoto: '사진 업로드',
          firstNames: '이름',
          lastNames: '성',
          preferredLanguage: '선호 언어',
          newPassword: '새 비밀번호',
          confirmNewPassword: '새 비밀번호 확인',
        },
        sections: {
          identityTitle: '신원 정보',
          identitySubtitle: '인터페이스에 표시될 사진과 이름입니다.',
          contactTitle: '연락처 정보',
          contactSubtitle: '알림과 커뮤니케이션을 위한 정보입니다.',
          securityTitle: '계정 보안',
          securitySubtitle: '필요할 때 비밀번호를 업데이트하세요.',
          preferencesTitle: '환경설정',
          preferencesSubtitle: '인터페이스 언어를 맞춤 설정하세요.',
          nameGroup: '이름과 성',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC, 최대 25MB; 업로드 전 압축됨',
          firstNames: '일부 국가에서는 하나 이상의 이름을 사용할 수 있습니다.',
          lastNames: '성은 1개(미국/캐나다) 또는 2개(멕시코/콜롬비아)일 수 있습니다.',
          phone: '국가를 변경하면 전화 국가 코드가 자동으로 바뀝니다.',
          password: '변경하지 않으려면 비워 두세요.',
          preferredLanguage: '이 언어는 인터페이스와 템플릿에 사용됩니다.',
        },
        actions: {
          save: '변경 사항 저장',
          saving: '저장 중...',
          discard: '취소',
        },
        messages: {
          loading: '프로필을 불러오는 중...',
          saveSuccess: '프로필이 저장되었습니다.',
          loadError: '프로필을 불러올 수 없습니다.',
          saveError: '프로필을 저장할 수 없습니다.',
          unsavedChanges: '저장되지 않은 변경 사항이 있습니다.',
          optional: '(선택 사항)',
          savingOverlay: '프로필 저장 중...',
          passwordMismatch: '새 비밀번호와 확인 비밀번호가 일치해야 합니다.',
          passwordMinLength: '새 비밀번호는 최소 8자 이상이어야 합니다.',
          invalidPhone: '선택한 국가에 대해 유효한 전화번호를 입력하세요.',
        },
      },
      users: {
        title: '사용자',
        subtitle: '시스템 사용자 및 권한 관리',
        invite: '사용자 초대',
        search: '사용자 검색...',
        filters: {
          all: '모두',
          active: '활성',
          pending: '대기 중',
          inactive: '비활성',
        },
        roles: {
          superAdmin: '슈퍼 관리자',
          admin: '관리자',
          user: '사용자',
        },
        status: {
          active: '활성',
          pending: '대기 중',
          inactive: '비활성',
        },
        table: {
          name: '이름',
          email: '이메일',
          role: '역할',
          status: '상태',
          modules: '모듈',
          actions: '작업',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['ko-CA'],
        actions: {
          edit: '편집',
          resend: '초대 재전송',
          delete: '삭제',
        },
        modal: {
          newUser: '새 사용자',
          editUser: '사용자 편집',
          name: '이름',
          email: '이메일',
          role: '역할',
          selectRole: '역할 선택',
          modules: '모듈',
          selectModules: '모듈 선택...',
          inviteLink: '초대 링크',
          copyLink: '링크 복사',
          copied: '✓ 복사됨',
          save: '저장',
          cancel: '취소',
          send: '초대 보내기',
        },
      },
      plan: {
        title: '귀하의 비즈니스에 가장 적합한 플랜을 선택하세요',
        subtitle: '모든 플랜에는 학습 모드 및 지속적인 업데이트가 포함됩니다',
        mostPopular: '가장 인기 있는',
        plans: {
          inicio: {
            name: '시작',
            description: '비즈니스 정리 시작하기',
            button: '시작 선택',
          },
          controla: {
            name: '통제',
            description: '정리하고 통제하기 위한 견고한 기반',
            button: '통제 선택',
          },
          escala: {
            name: '확장',
            description: '영역 최적화, 프로세스 표준화',
            button: '확장 선택',
          },
          corporativiza: {
            name: '기업화',
            description: '기업 AI 및 통합 비전으로 자동화',
            button: '기업화 선택',
          },
        },
        features: {
          humanResources: '인적 자원',
          processes: '프로세스 및 작업',
          products: '제품 (POS / CRM)',
          finance: '재무 (비용 / 현금)',
          kpisBasic: '기본 KPI',
          kpisComplete: '완전한 KPI',
          kpisAdvanced: '고급 KPI',
          kpisCorporate: '기업 KPI',
          users5: '최대 5명의 사용자',
          users10: '최대 10명의 사용자',
          users20: '최대 20명의 사용자',
          users25: '최대 25명의 사용자',
          complementaryModules: '보완 모듈',
          modules2: '2개의 보완 모듈',
          modules4: '4개의 보완 모듈',
          allModules: '모든 모듈',
          aiAnalytics: 'AI 분석 및 판매',
          integrations: '통합',
          sessions1: '월 1회 세션',
          sessions2: '월 2회 세션',
          sessions4: '월 4회 세션',
        },
        additionalInfo: {
          title: '추가 정보',
          extraUser: '추가 사용자',
          extraUserPrice: '모든 플랜에서 추가 사용자당 +$10 USD',
          learningMode: '학습 모드',
          learningModeDesc: '모든 플랜에 추가 비용 없이 포함',
          updates: '업데이트',
          updatesDesc: '모든 개선 사항이 자동으로 포함됩니다',
        },
      },
    },
  },
  'zh-CA': {
    header: {
      notifications: '通知',
      profile: '我的个人资料',
      settings: '设置',
      logout: '退出',
      learningMode: '运营路径',
    },
    sections: {
      kpis: '您的 KPI',
      favorites: '您的收藏',
      quickAccess: '快速访问',
      basicModules: '基本模块',
      main: '主要',
      complementaryModules: '补充模块',
      additional: '附加',
      aiModules: '人工智能',
      aiLabel: 'AI 模块',
      configureKpis: '配置 KPI',
    },
    kpis: {
      weeklyRevenue: '周收入',
      netProfit: '净利润',
      activeClients: '活跃客户',
      activeEmployees: '活跃员工',
      pendingTasks: '待处理任务',
      monthlyExpenses: '月度开支',
      vsWeekBefore: '与上周相比',
      thisMonth: '本月',
      newOnes: '新的',
      dueToday: '今天到期',
      vsMonthBefore: '与上月相比',
    },
    modules: {
      panelInicial: '初始面板',
      recursosHumanos: '人力资源',
      procesosTareas: '流程和任务',
      gastos: '开支',
      cajaChica: '零用现金',
      puntoVenta: '销售点',
      ventas: '销售',
      cartera: '应收账款',
      kpis: 'KPI',
      mantenimiento: '维护',
      inventarios: '库存',
      controlMinutas: '会议记录控制',
      limpieza: '清洁',
      lavanderia: '洗衣',
      transportacion: '运输',
      vehiculosMaquinaria: '车辆和机械',
      inmuebles: '房地产',
      formularios: '表格',
      facturacion: '计费',
      correoElectronico: '电子邮件',
      climaLaboral: '工作环境',
      afiliados: '关联会员',
      indiceAgenteVentas: '销售代理指数',
      indiceAnalitica: '分析指数',
      capacitacion: '培训',
      indiceCoach: '教练指数',
    },
    notifications: {
      newTask: '分配新任务',
      expensePending: '待批准的费用',
      newClient: '新客户已注册',
      timeAgo: {
        minutes: '5分钟前',
        hour: '1小时前',
        hours: '2小时前',
      },
    },
	    loginPage: {
	      logoAlt: 'Indice 标志',
	      workspaceBadge: '运营清晰度',
	      accessBadge: 'Indice 访问',
	      operatingSystemLabel: 'Business Operating System',
	      frameworkLabel: 'Indice 运营框架',
	      title: '清晰地运营你的业务。',
	      subtitle:
	        '把人员、流程、产品和财务连接到一个为成长型企业设计的运营工作区中。',
	      pillars: [
	        {
	          icon: '👥',
	          title: '人员',
	          description: '更清楚地查看团队、职责和日常活动。',
	        },
	        {
	          icon: '⚙️',
	          title: '流程',
	          description: '用结构化流程执行、跟进并减少运营噪音。',
	        },
	        {
	          icon: '📦',
	          title: '产品',
	          description: '将目录、商业运营和库存连接到业务。',
	        },
	        {
	          icon: '📊',
	          title: '财务',
	          description: '通过财务控制和运营洞察做出更好决策。',
	        },
	      ],
	      featureCards: [
	        {
	          title: '运营可见性',
	          description: '了解整个业务正在发生什么。',
	        },
	        {
	          title: '业务控制',
	          description: '集中执行，减少运营混乱。',
	        },
	        {
	          title: '更好的决策',
	          description: '把日常活动转化为可行动的洞察。',
	        },
	      ],
	      visualTitle: '结构化增长',
	      visualSubtitle:
	        'Indice 将运营组织成相互连接的支柱，让每个团队都带着上下文和方向工作。',
	      visualMetricValue: '4',
	      visualMetricLabel: '连接的支柱',
	      visualSignalLabel: '运营系统',
	      welcomeTitle: '访问你的工作区',
	      welcomeText:
	        '带着可见性、控制力和业务上下文继续日常执行。',
	      emailLabel: '邮箱',
	      emailPlaceholder: 'you@company.com',
	      emailError: '请输入有效的邮箱地址。',
	      passwordLabel: '密码',
	      passwordPlaceholder: '输入你的密码',
	      forgotPassword: '忘记密码？',
	      hidePassword: '隐藏密码',
	      showPassword: '显示密码',
	      signIn: '登录',
	      signingIn: '登录中...',
	      successToast: '登录成功。',
	      errorFallback: '无法登录。',
	      insideTitle: '你将访问',
	      insideItems: ['运营可见性', '团队活动', '财务控制', '业务表现'],
	      resetBadge: '访问恢复',
	      resetTitle: '重置你的密码',
	      resetDescription:
	        '输入你的账户邮箱。如果账户存在，我们会发送一个限时有效的重置链接。',
	      resetCloseLabel: '关闭密码重置',
	      resetCancel: '取消',
	      resetSubmit: '发送重置链接',
	      resetSubmitting: '正在发送链接...',
	      resetSuccessFallback: '如果该邮箱存在，密码重置链接已经发送。',
	      resetErrorFallback: '无法发送密码重置请求。',
	    },
    learningMode: {
      welcome: '欢迎来到学习模式！',
      hide: '隐藏',
      show: '显示',
      businessBase: '业务基础',
      clearBusinessStable: '清除稳定的业务基础',
      functions: '功能',
      businessContext: '业务背景',
      indiceMethodology: '索引方法论',
      addModule: '打开',
      viewBasicModules: '查看基本模块',
      previous: '上一步',
      next: '下一步',
      stepOf: '步骤',
      modules: {
        panelInicial: {
          title: '初始面板',
          subtitle: '🎯 您的起点',
          description: '初始面板是在索引系统中组织您的公司的起点。 🏢 在这里，您定义业务的基本信息并配置允许所有其他模块正常运行的结构。 ✨ 当这个基础配置良好时，系统可以帮助您更清楚地管理人员、流程、产品和财务。',
          functions: [
            '📊 更新您的公司数据并保持您的信息始终最新。',
            '⚙️ 配置系统首选项，例如语言、货币和操作设置。',
            '📋 定义其他模块将使用的基本业务信息。',
            '🏗️ 建立您的公司结构及其运营方式。',
            '👥 邀请用户并管理他们的访问权限，为每个协作者分配角色和权限。',
            '🎓 进行初步业务评估，帮助您了解您的公司处于什么阶段。',
            '📈 计算 BMI（业务成熟度指数），这是一个分析您业务当前状态并指导您如何改进管理的工具。',
          ],
          context: '💡 此模块允许您概览您的公司并开始构建业务的运营方式。 当这个基础定义良好时，系统的所有其他流程都会变得更清晰和更易于管理。',
          quote: '🏆 组织是建立稳固业务的第一步。',
        },
        recursosHumanos: {
          title: '人力资源',
          subtitle: '管理您的团队',
          description: '管理员工和人力资源信息。',
          functions: ['查看员工', '管理合同'],
          context: '此模块允许您有效地管理您的团��。',
          quote: '人才是成功的关键。',
        },
        procesosTareas: {
          title: '流程和任务',
          subtitle: '组织您的工作',
          description: '管理和执行对您的业务重要的任务和流程。',
          functions: ['创建任务', '查看流程'],
          context: '此模块帮助您保持业务有序。',
          quote: '组织是效率的关键。',
        },
        gastos: {
          title: '开支',
          subtitle: '控制您的开支',
          description: '管理和控制您的开支以保持业务良好状态。',
          functions: ['查看开支', '批准开支'],
          context: '此模块允许您有效地控制您的开支。',
          quote: '开支控制是成功的基础。',
        },
        cajaChica: {
          title: '零用现金',
          subtitle: '小额开支',
          description: '管理您业务的小额开支。',
          functions: ['查看零用现金', '批准开支'],
          context: '此模块允许您有效地管理小额开支。',
          quote: '零用现金对于小额开支至关重要。',
        },
        puntoVenta: {
          title: '销售点',
          subtitle: '销售您的产品',
          description: '管理和执行您业务的销售。',
          functions: ['进行销售', '查看销售'],
          context: '此模块允许您有效地销售产品。',
          quote: '销售是成功的关键。',
        },
        ventas: {
          title: '销售',
          subtitle: '管理您的销售',
          description: '管理和分析您的销售以改善您的业务。',
          functions: ['查看销售', '分析销售'],
          context: '此模块允许您管理和分析您的销售。',
          quote: '销售是您业务的基础。',
        },
        kpis: {
          title: 'KPI',
          subtitle: '关键指标',
          description: '管理和分析您的 KPI 以改善您的业务。',
          functions: ['查看 KPI', '配置 KPI'],
          context: '此模块允许您管理和分析您的 KPI。',
          quote: 'KPI 对于性能跟踪至关重要。',
        },
      },
    },
    panelInicial: {
      title: '初始面板',
      back: '返回',
      tabs: {
        profile: '简介',
        businessStructure: '企业结构',
        businessProfile: '企业简介',
        personalPerformance: '个人表现',
        billing: '计费',
        plan: '计划',
        users: '用户',
      },
      personalPerformance: PERSONAL_PERFORMANCE_TRANSLATIONS['zh-CA'],
      diagnosis: {
        title: '企业诊断',
        description: '帮助我们更好地了解您的公司和管理阶段以个性化 Indice。',
        centerTitle: '企业诊断中心',
        centerDescription: '通过 4 个支柱发现您公司的管理状况：人员、流程、产品和财务。通过您的回答，我们将使用企业成熟度指数（BMI），这将帮助我们个性化 Indice 背后的建议、模块和最佳合作伙伴。',
        questionCount: '每个 10 个问题',
        questionCountLabel: '诊断包含',
        progress: '企业诊断进度',
        progressOf: '已完成',
        onboarding: {
          answeredProgress: '你已回答 {total} 个问题中的 {answered} 个',
          encouragementMid: '进展很不错',
          encouragementNear: '快完成了',
          sections: {
              people: {
                title: '第 1 步 — 你的团队',
                intro: '让我们了解你的团队如何工作',
                done: '完成 — 我们了解了你的团队',
              },
              processes: {
                title: '第 2 步 — 你的运营方式',
                intro: '让我们了解你的日常运营方式',
                done: '完成 — 我们了解了你的运营方式',
              },
              products: {
                title: '第 3 步 — 你销售的内容',
                intro: '让我们了解你的产品或服务如何进入市场',
                done: '完成 — 我们了解了你销售的内容',
              },
              finance: {
                title: '第 4 步 — 你的财务',
                intro: '让我们了解你如何管理财务数字',
                done: '完成 — 我们了解了你的财务',
              },
          },
        },
        pdf: DIAGNOSIS_PDF_TRANSLATIONS['zh-CA'],
        printDiagnosis: '下载 PDF',
        start: '开始',
        continue: '继续',
        doAgain: '重新做',
        reviewAnswers: '查看答案',
        close: '关闭',
        question: '问题',
        of: '的',
        completed: '已完成',
        previous: '上一个',
        next: '下一个',
        finish: '完成',
        restart: '重新开始诊断',
        actions: {
          save: '保存',
          saving: '保存中...',
          discard: '放弃更改',
        },
        scoreSummary: {
          title: '诊断得分',
          bmi: 'BMI',
          level: '等级',
          answered: '已回答',
          score: '得分',
        },
        messages: {
          loading: '正在加载业务诊断...',
          loadError: '无法加载业务诊断。',
          saveSuccess: '业务诊断已保存。',
          saveError: '无法保存业务诊断。',
          unsavedChanges: '业务诊断中有未保存的更改。',
        },
        pillars: {
          people: {
            title: '人员',
            description: '分析人才、团队结构和沟通。',
          },
          processes: {
            title: '流程',
            description: '评估流程、任务、可扩展性和效率。',
          },
          products: {
            title: '产品',
            description: '分析产品、市场、销售和价值主张。',
          },
          finance: {
            title: '财务',
            description: '评估财务控制、管理和决策。',
          },
        },
        questions: {
          people: [
            { question: '您的主要角色是什么？', options: ['创始人/CEO', '运营', '财务', '销售/其他'] },
            { question: '有多少人工作？', options: ['只有我', '2 到 5', '6 到 20', '21 或更多'] },
            { question: '您的团队如何组织？', options: ['无结构', '基本角色', '定义区域', '正式组织图'] },
            { question: '如何分配任务？', options: ['即兴', '列表', '结构化分配', '管理系统'] },
            { question: '绩效评估？', options: ['从不', '出问题时', '每周', '使用 KPI'] },
            { question: '委派？', options: ['全部自己做', '委派并监督', '有控制地委派', '自主团队'] },
            { question: '内部沟通？', options: ['非正式', '聊天', '会议', '正式工具'] },
            { question: '会议频率？', options: ['从不', '零星', '每周', '频繁'] },
            { question: '职责明确���？', options: ['不清楚', '有点清楚', '相当清楚', '完全清楚'] },
            { question: '整合的容易程度？', options: ['非常困难', '困难', '中等', '容易'] },
          ],
          processes: [
            { question: '记录的流程？', options: ['无', '一些', '大多数', '完全'] },
            { question: '任务管理？', options: ['即兴', '列表', '工具', '正式系统'] },
            { question: '进度监控？', options: ['未监控', '偶尔', '报告', 'KPI'] },
            { question: '自动化？', options: ['手动', '孤立工具', '部分自动化', '高度自动化'] },
            { question: '可复制性？', options: ['非常困难', '需要努力', '可能', '容易'] },
            { question: '时间浪费在哪里？', options: ['手工', '协调', '信息', '跟进'] },
            { question: '对人的依赖？', options: ['完全', '相当多', '一些', '很少'] },
            { question: '流程清晰度？', options: ['不清楚', '有点清楚', '相当清楚', '完全清楚'] },
            { question: '错误管理？', options: ['反应', '非正式', '审查', '持续改进'] },
            { question: '可扩展性？', options: ['无', '低', '中', '高'] },
          ],
          products: [
            { question: '您卖什么？', options: ['服务', '产品', '数字', '混合'] },
            { question: '客户类型？', options: ['B2C', 'B2B', '政府', '混合'] },
            { question: '主要收入？', options: ['直接销售', '服务', '订阅', '合同'] },
            { question: '多样化？', options: ['一个', '一些', '多条线', '广泛'] },
            { question: '价格定义？', options: ['直觉', '竞争', '成本', '策略'] },
            { question: '绩效跟踪？', options: ['未测量', '仅销售', '销售+盈利', '指标'] },
            { question: '价值主张？', options: ['不清楚', '有点清楚', '相当清楚', '非常清楚'] },
            { question: '客户反馈？', options: ['无', '非正式', '调查', '分析'] },
            { question: '产品演变？', options: ['即兴', '偶尔变化', '计划', '路线图'] },
            { question: '商业优先级？', options: ['客户', '当前销售', '盈利能力', '扩展'] },
          ],
          finance: [
            { question: '财务控制？', options: ['无结构', 'Excel', '软件', '集成系统'] },
            { question: '数字审查？', options: ['从不', '每月', '每周', '每天'] },
            { question: '现金流？', options: ['未控制', '反应', '审查', '预测'] },
            { question: '明确的成本？', options: ['不清楚', '大约', '相当清楚', '完全控制'] },
            { question: '利润率？', options: ['不知道', '估计', '清楚', '完全测量'] },
            { question: '财务决策？', options: ['直觉', '经验', '数据', '模型'] },
            { question: '可预测的收入？', options: ['非常可变', '可变', '稳定', '非常稳定'] },
            { question: '债务管理？', options: ['无控制', '基本', '策略', '优化'] },
            { question: '危机准备？', options: ['无', '低', '中', '高'] },
            { question: '税务合规？', options: ['无控制', '延迟', '最新', '税务策略'] },
          ],
        },
      },
      billing: {
        title: '计费',
        subtitle: '税务数据、付款方式和服务发票',
        fiscalData: {
          title: '税务数据',
          subtitle: '根据国家配置税务数据',
          country: '国家',
          selectCountry: '选择国家...',
          rfc: 'RFC',
          razonSocial: '法定名称',
          regimenFiscal: '税收制度',
          usoCFDI: 'CFDI用途（默认）',
          codigoPostalFiscal: '邮政编码（税务）',
          nit: 'NIT',
          responsabilidadFiscal: '税务责任',
          cnpjCpf: 'CNPJ/CPF',
          razaoSocial: '法定名称',
          inscricaoEstadual: '州注册',
          ein: 'EIN（税务ID）',
          legalName: '法定名称',
          state: '州',
          businessNumber: '企业编号（BN）',
          province: '省',
          taxId: '税务ID',
          companyName: '公司名称',
          taxRegime: '税收制度',
          postalCode: '邮政编码',
        },
        paymentMethod: {
          title: '付款方式',
          subtitle: '配置您的付款方式和频率',
          type: '首选付款类型',
          selectMethod: '选择方法...',
          cardNumber: '卡号',
          cvv: 'CVV',
          expirationDate: '到期日期',
          cardholderName: '持卡人姓名',
          addCard: '添加卡片',
          cancel: '取消',
          savedCards: '已保存的卡片',
          defaultCard: '默认卡片',
          saveCard: '保存卡片',
          placeholder: {
            cardNumber: '1234 5678 9012 3456',
            cvv: '123',
            expirationDate: 'MM/YY',
            cardholderName: '如卡上所示',
          },
        },
        automaticBilling: {
          title: '自动计费',
          subtitle: '配置续订、计费日期和发票电子邮件',
          enable: '启用自动续订',
          description: '您的订阅将在期末自动续订',
          billingDay: '计费日',
          selectDay: '每月1日',
          emailForInvoices: '发票电子邮件',
          reminderNote: '您将在此电子邮件收到发票',
        },
        currentBilling: {
          title: '当前计费摘要',
          plan: '计划：',
          notConfigured: '未配置',
          amount: '金额：',
          nextPayment: '下次付款：',
        },
        invoices: {
          title: '服务发票',
          subtitle: '订阅发票历史记录',
          month: '月',
          year: '金额',
          status: '状态',
          downloadPdf: '下载PDF',
          date: '日期',
          concept: '项目',
          amount: '金额',
          paid: '已支付',
          pending: '待处理',
        },
        billingFrequency: {
          title: '计费频率',
          note: '付款可能有100-30折扣',
          monthly: '每月',
          quarterly: '每季度',
          semiannual: '每半年',
          annual: '每年',
        },
      },
      structure: {
        title: '企业结构',
        subtitle: '组织和业务单元',
        status: {
          connected: 'Spring 后端已连接',
          backendNotice: '此页面现在会通过 Spring 后端进行加载和保存。这里录入的公司身份以及单元和业务详情都会通过 Spring 持久化。',
        },
        actions: {
          save: '保存更改',
          saving: '正在保存...',
          extract: '获取坐标',
          useLocation: '使用我的位置',
          addUnit: '添加新单元',
          configure: '配置单元',
          configureGroup: '配置组',
          createUnit: '添加另一个单元',
        },
        messages: {
          loading: '正在加载企业结构...',
          loadError: '无法加载企业结构。',
          saveError: '无法保存企业结构。',
          saveSuccess: '企业结构已成功保存。',
          saveOverlay: '正在保存企业结构...',
          saveOverlayDescription: '正在将公司、单元和业务详情同步到后端。',
          createUnitTitle: '正在创建单元...',
          updateUnitTitle: '正在保存单元...',
          unitOverlayDescription: '正在更新企业结构中的单元详情。',
          createUnitSuccess: '单元已添加到企业结构中。',
          updateUnitSuccess: '单元已在企业结构中更新。',
          createBusinessTitle: '正在创建业务...',
          updateBusinessTitle: '正在保存业务...',
          businessOverlayDescription: '正在更新企业结构中的业务详情。',
          createBusinessSuccess: '业务已添加到企业结构中。',
          updateBusinessSuccess: '业务已在企业结构中更新。',
        },
        mode: {
          title: '运营类型',
          description: '请选择最符合您公司的选项：',
          helper: '💡 选择您的业务运作方式',
          simple: '简单',
          multi: '多单元',
          simpleTitle: '我有一个业务或分支机构',
          simpleDescription: '您有一个分支机构或公司',
          simpleExample: '示例：一家餐厅、商店或诊所',
          multiTitle: '我有多个分支机构或品牌',
          multiDescription: '多个分支机构、子公司或关联公司',
          multiExample: '示例：多家餐厅、分支机构或品牌',
          switchPrompt: '您有不止一个业务或分支机构吗？',
          switchAction: '切换到多单元',
          multiNote: '从单一管理中管理多个单元。',
          selected: '已选择',
          structurePreviewTitle: '🧠 您的结构将这样运作',
          structurePreviewLines: [
            '公司',
            ' → 地点（例如：坎昆、多伦多）',
            '    → 业务（例如：餐厅、商店、酒店）',
          ],
        },
        identity: {
          simple: '公司总部',
          holding: '公司总部',
          simpleDesc: '公司名称、徽标、坐标、半径和基本配置。',
          holdingDesc: '公司名称、徽标、坐标、半径和基本配置。',
          holdingNotice: '💡 在这里定义您的业务从哪里运营。',
        },
        headquarters: {
          helper: '💡 在这里定义您的业务从哪里运营。',
          context: '我们将使用这些信息来组织您的运营、员工和报表。',
          basicInfo: '🏢 公司基本信息',
          industryHelper: '这有助于我们根据您的业务类型调整系统。',
          locationTitle: '📍 业务位置',
          locationHelper: '这有助于考勤和运营控制等功能。',
          addressTitle: '📍 业务地址',
          addressHelper: '填写地址，以便更好地识别您的位置',
          addressNote: '地址仅供参考。系统功能将使用坐标。',
        },
        fields: {
          companyName: '公司名称',
          holdingName: '公司名称',
          industry: '行业',
          selectIndustry: '选择行业',
          industryHint: '这有助于我们根据您的业务类型调整系统。',
          country: '国家',
          selectCountry: '选择国家',
          logo: '公司徽标',
          logoHolding: '总部徽标',
          uploadImage: '上传图像',
          noFileSelected: '未选择文件',
          uploadHint: 'JPG/PNG/SVG。最大 1MB。',
          removeLogo: '删除徽标',
          description: '描述',
          optional: '（可选）',
          basicInfo: '基本信息',
          location: '位置',
          contact: '联系信息',
          operationalInfo: '运营信息',
          address: '地址',
          city: '城市',
          state: '州/省',
          postalCode: '邮政编码',
          phone: '电话',
          email: '电子邮件',
          manager: '经理/负责人',
          schedule: '时间安排',
          logoPreviewAlt: '徽标预览',
        },
        units: {
          title: '🏬 你的业务单元',
          subtitle: '你可以在这里查看和管理业务的组织方式',
          description: '你可以在这里查看和管理业务的组织方式',
          context: '每个单元代表一个分支机构、品牌或业务线',
          groupLabel: '🧩 主组',
          mainUnit: '主单元',
          helper: '你可以先从一个单元开始，并随着业务增长添加更多单元',
          tip: '💡 你可以为每个分支机构或品牌创建单元',
          empty: '还没有业务',
          emptyHelper: '在此单元中添加第一个业务',
          groupContext: '每个位置会归集在那里运营的业务',
          tipAction: '💡 你可以先从一个单元开始，之后再添加更多',
          addUnit: '+ 新单元',
          addBusiness: '+ 添加业务',
          unitName: '单元名称',
          unitCountry: '运营国家',
          businessName: '业务名称',
          configureUnit: '⚙️ 配置单元',
          configureBusiness: '⚙️ 配置',
          businessCountSingular: '业务',
          businessCountPlural: '业务',
        },
        modal: {
          newUnit: '新业务单元',
          editUnit: '编辑业务单元',
          newBusiness: '新业务',
          editBusiness: '编辑业务',
          save: '保存更改',
          cancel: '取消',
          delete: '删除',
          createBusiness: '创建业务',
          newUnitDescription: '添加新的运营单元',
          editUnitDescription: '编辑以下内容',
          newBusinessDescription: '添加新的业务/分支机构',
          editBusinessDescription: '编辑以下内容',
          confirmDeleteUnit: '要删除这个单元吗？',
          confirmDeleteBusiness: '要删除这项业务吗？',
        },
        placeholders: {
          unitName: '例如：墨西哥城、北区、中部区域...',
          businessName: '例如：中心分店、Polanco 商店、南部仓库...',
          address: '街道、门牌号、区域...',
          city: '城市',
          state: '州',
          postalCode: '00000',
          phone: '+86 138 0000 0000',
          unitEmail: 'unit@company.com',
          businessEmail: 'business@company.com',
          manager: '负责人姓名',
          schedule: '周一至周五 9:00-18:00',
        },
        options: {
          businessIdentityIndustries: [
            { value: 'retail', label: '🛍️ 零售 / 商业' },
            { value: 'food', label: '🍔 食品和饮料' },
            { value: 'hospitality', label: '🏨 酒店与住宿服务' },
            { value: 'tech', label: '💻 科技' },
            { value: 'software-saas', label: '🧩 软件 / SaaS' },
            { value: 'health', label: '🏥 健康' },
            { value: 'beauty-wellness', label: '💅 美容与健康' },
            { value: 'education', label: '🎓 教育' },
            { value: 'services', label: '💼 专业服务' },
            { value: 'consulting', label: '🧠 咨询' },
            { value: 'legal', label: '⚖️ 法律' },
            { value: 'accounting-tax', label: '🧾 会计与税务' },
            { value: 'finance-insurance', label: '💰 金融与保险' },
            { value: 'real-estate', label: '🏢 房地产' },
            { value: 'construction', label: '🏗️ 建筑' },
            { value: 'architecture-engineering', label: '📐 建筑设计与工程' },
            { value: 'manufacturing', label: '🏭 制造业' },
            { value: 'wholesale-distribution', label: '📦 批发与分销' },
            { value: 'logistics-transportation', label: '🚚 运输与物流' },
            { value: 'automotive', label: '🚗 汽车' },
            { value: 'agriculture', label: '🌾 农业' },
            { value: 'energy-utilities', label: '⚡ 能源与公用事业' },
            { value: 'telecommunications', label: '📡 电信' },
            { value: 'marketing-advertising', label: '📣 营销与广告' },
            { value: 'media-creative', label: '🎨 媒体与创意' },
            { value: 'entertainment-events', label: '🎭 娱乐与活动' },
            { value: 'tourism-travel', label: '✈️ 旅游与旅行' },
            { value: 'sports-fitness', label: '🏋️ 体育与健身' },
            { value: 'cleaning-facility', label: '🧹 清洁与设施管理' },
            { value: 'maintenance-repair', label: '🔧 维护与维修' },
            { value: 'security', label: '🛡️ 安保' },
            { value: 'ecommerce', label: '🛒 电子商务' },
            { value: 'import-export', label: '🌐 进出口' },
            { value: 'nonprofit', label: '🤝 非营利组织' },
            { value: 'government-public', label: '🏛️ 政府 / 公共部门' },
            { value: 'pet-services', label: '🐾 宠物服务' },
            { value: 'childcare', label: '👶 儿童照护' },
            { value: 'senior-care', label: '🧓 老年照护' },
            { value: 'pharmaceutical', label: '💊 制药' },
            { value: 'other', label: '📦 其他' },
          ],
          unitIndustries: [
            { value: 'restaurante', label: '🍽️ 餐饮与食品' },
            { value: 'retail', label: '🛍️ 零售与商业' },
            { value: 'servicios', label: '💼 专业服务' },
            { value: 'salud', label: '⚕️ 健康与保健' },
            { value: 'educacion', label: '📚 教育' },
            { value: 'tecnologia', label: '💻 科技' },
            { value: 'construccion', label: '🏗️ 建筑' },
            { value: 'manufactura', label: '🏭 制造业' },
            { value: 'hospitalidad', label: '🏨 酒店与旅游' },
            { value: 'inmobiliaria', label: '🏢 房地产' },
            { value: 'transporte', label: '🚚 运输与物流' },
            { value: 'entretenimiento', label: '🎭 娱乐' },
            { value: 'financiero', label: '💰 金融服务' },
            { value: 'agricultura', label: '🌾 农业' },
            { value: 'otro', label: '📦 其他' },
          ],
          countries: [
            { value: 'MX', label: '🇲🇽 墨西哥' },
            { value: 'US', label: '🇺🇸 美国' },
            { value: 'CA', label: '🇨🇦 加拿大' },
            { value: 'ES', label: '🇪🇸 西班牙' },
            { value: 'CO', label: '🇨🇴 哥伦比亚' },
            { value: 'AR', label: '🇦🇷 阿根廷' },
            { value: 'BR', label: '🇧🇷 巴西' },
            { value: 'CL', label: '🇨🇱 智利' },
          ],
        },
      },
      profile: {
        title: '我的个人资料',
        subtitle: '个人信息和帐户设置',
        helper: '你可以随时完成此信息',
        fields: {
          fullName: '全名',
          email: '电子邮件',
          phone: '电话',
          position: '职位',
          department: '部门',
          profilePhoto: '个人资料照片',
          country: '国家',
          uploadPhoto: '上传照片',
          firstNames: '名字',
          lastNames: '姓氏',
          preferredLanguage: '首选语言',
          newPassword: '新密码',
          confirmNewPassword: '确认新密码',
        },
        sections: {
          identityTitle: '身份信息',
          identitySubtitle: '用于界面的照片和姓名。',
          contactTitle: '联系信息',
          contactSubtitle: '用于通知和沟通的信息。',
          securityTitle: '帐户安全',
          securitySubtitle: '需要时更新您的密码。',
          preferencesTitle: '偏好设置',
          preferencesSubtitle: '自定义界面语言。',
          nameGroup: '名字和姓氏',
        },
        hints: {
          photoFormat: 'JPG/PNG/WebP/HEIC，最大 25MB；上传前压缩',
          firstNames: '在某些国家/地区，您可以使用一个或多个名字。',
          lastNames: '可以是 1 个姓氏（美国/加拿大）或 2 个姓氏（墨西哥/哥伦比亚）。',
          phone: '国家会自动更新电话区号。',
          password: '如果您不想更改密码，请留空。',
          preferredLanguage: '我们将把此语言用于界面和模板。',
        },
        actions: {
          save: '保存更改',
          saving: '保存中...',
          discard: '放弃',
        },
        messages: {
          loading: '正在加载个人资料...',
          saveSuccess: '个人资料已保存。',
          loadError: '无法加载个人资料。',
          saveError: '无法保存个人资料。',
          unsavedChanges: '您有尚未保存的更改。',
          optional: '（可选）',
          savingOverlay: '正在保存个人资料...',
          passwordMismatch: '新密码和确认密码必须一致。',
          passwordMinLength: '新密码至少需要 8 个字符。',
          invalidPhone: '请输入与所选国家匹配的有效电话号码。',
        },
      },
      users: {
        title: '用户',
        subtitle: '管理系统用户和权限',
        invite: '邀请用户',
        search: '搜索用户...',
        filters: {
          all: '全部',
          active: '活跃',
          pending: '待处理',
          inactive: '非活跃',
        },
        roles: {
          superAdmin: '超级管理员',
          admin: '管理员',
          user: '用户',
        },
        status: {
          active: '活跃',
          pending: '待处理',
          inactive: '非活跃',
        },
        table: {
          name: '姓名',
          email: '电子邮件',
          role: '角色',
          status: '状态',
          modules: '模块',
          actions: '操作',
        },
        businessStructure: USERS_BUSINESS_STRUCTURE_TRANSLATIONS['zh-CA'],
        actions: {
          edit: '编辑',
          resend: '重新发送邀请',
          delete: '删除',
        },
        modal: {
          newUser: '新用户',
          editUser: '编辑用户',
          name: '姓名',
          email: '电子邮件',
          role: '角色',
          selectRole: '选择角色',
          modules: '模块',
          selectModules: '选择模块...',
          inviteLink: '邀请链接',
          copyLink: '复制链接',
          copied: '✓ 已复制',
          save: '保存',
          cancel: '取消',
          send: '发送邀请',
        },
      },
      plan: {
        title: '选择最适合您企业的计划',
        subtitle: '所有计划均包含学习模式和持续更新',
        mostPopular: '最受欢迎',
        plans: {
          inicio: {
            name: '起步',
            description: '开始组织您的业务',
            button: '选择起步',
          },
          controla: {
            name: '控制',
            description: '组织和控制的坚实基础',
            button: '选择控制',
          },
          escala: {
            name: '扩展',
            description: '优化领域，标准化流程',
            button: '选择扩展',
          },
          corporativiza: {
            name: '企业化',
            description: '通过企业 AI 和整体视野实现自动化',
            button: '选择企业化',
          },
        },
        features: {
          humanResources: '人力资源',
          processes: '流程和任务',
          products: '产品 (POS / CRM)',
          finance: '财务（费用/现金）',
          kpisBasic: '基本 KPI',
          kpisComplete: '完整 KPI',
          kpisAdvanced: '高级 KPI',
          kpisCorporate: '企业 KPI',
          users5: '最多 5 个用户',
          users10: '最多 10 个用户',
          users20: '最多 20 个用户',
          users25: '最多 25 个用户',
          complementaryModules: '补充模块',
          modules2: '2 个补充模块',
          modules4: '4 个补充模块',
          allModules: '所有模块',
          aiAnalytics: 'AI 分析和销售',
          integrations: '集成',
          sessions1: '每月 1 次会话',
          sessions2: '每月 2 次会话',
          sessions4: '每月 4 次会话',
        },
        additionalInfo: {
          title: '附加信息',
          extraUser: '额外用户',
          extraUserPrice: '任何计划中每个额外用户 +$10 USD',
          learningMode: '学习模式',
          learningModeDesc: '所有计划均包含，无额外费用',
          updates: '更新',
          updatesDesc: '所有改进自动包含',
        },
      },
    },
  },
};

interface LanguageContextType {
  currentLanguage: Language;
  setCurrentLanguage: (language: Language) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const defaultLanguageCode = 'en-US';
const languageStorageKey = 'frontend-indice-language';

const getLanguageByCode = (code?: string) =>
  languages.find((language) => language.code === code);

const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const storedLanguageCode = window.localStorage.getItem(languageStorageKey);
    const storedLanguage = getLanguageByCode(storedLanguageCode ?? undefined);

    if (storedLanguage) {
      return storedLanguage;
    }
  }

  return getLanguageByCode(defaultLanguageCode) ?? languages[0];
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getInitialLanguage);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(languageStorageKey, currentLanguage.code);
    }
  }, [currentLanguage]);

  const value = {
    currentLanguage,
    setCurrentLanguage,
    t: translations[currentLanguage.code],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
