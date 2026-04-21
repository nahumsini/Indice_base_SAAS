import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { FavoritesBar } from '../components/FavoritesBar';
import { Printer, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, FileText, Trash2, Download, UserPlus, Mail, Search, Filter, ToggleLeft, ToggleRight, Settings, X, Copy, Check, ChevronDown } from 'lucide-react';
import { useLanguage, languages } from '../shared/context';

interface PanelInicialProps {
  onNavigate: (page?: string) => void;
}

interface DiagnosticoAnswers {
  people: Record<number, number>;
  processes: Record<number, number>;
  products: Record<number, number>;
  finance: Record<number, number>;
}

interface SavedCard {
  id: string;
  type: string;
  lastFourDigits: string;
  cardholderName: string;
  expirationDate: string;
  isDefault: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'User';
  status: 'active' | 'pending' | 'inactive';
  modules: string[];
}

export default function PanelInicial({ onNavigate }: PanelInicialProps) {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('perfilEmpresarial');
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [showAddCard, setShowAddCard] = useState<boolean>(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    {
      id: '1',
      type: 'Visa',
      lastFourDigits: '4242',
      cardholderName: 'Juan Pérez',
      expirationDate: '12/25',
      isDefault: true
    },
    {
      id: '2',
      type: 'Mastercard',
      lastFourDigits: '8888',
      cardholderName: 'Juan Pérez',
      expirationDate: '06/26',
      isDefault: false
    }
  ]);
  const [answers, setAnswers] = useState<DiagnosticoAnswers>({
    people: {},
    processes: {},
    products: {},
    finance: {}
  });

  // Estados para gestión de usuarios
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan.perez@empresa.com',
      role: 'Super Admin',
      status: 'active',
      modules: ['panel-inicial', 'recursos-humanos', 'procesos-tareas', 'gastos', 'caja-chica', 'punto-venta', 'ventas', 'kpis', 'inventarios', 'facturacion', 'agente-ventas', 'analitica']
    },
    {
      id: '2',
      name: 'María González',
      email: 'maria.gonzalez@empresa.com',
      role: 'Admin',
      status: 'pending',
      modules: ['panel-inicial', 'recursos-humanos', 'procesos-tareas', 'gastos', 'kpis', 'clima-laboral']
    },
    {
      id: '3',
      name: 'Carlos López',
      email: 'carlos.lopez@empresa.com',
      role: 'User',
      status: 'active',
      modules: ['procesos-tareas', 'punto-venta', 'ventas', 'inventarios']
    },
    {
      id: '4',
      name: 'Ana Rodríguez',
      email: 'ana.rodriguez@empresa.com',
      role: 'User',
      status: 'inactive',
      modules: ['recursos-humanos', 'clima-laboral']
    },
    {
      id: '5',
      name: 'Luis Martínez',
      email: 'luis.martinez@empresa.com',
      role: 'User',
      status: 'active',
      modules: ['punto-venta', 'ventas', 'inventarios', 'transportacion']
    }
  ]);
  
  const [selectedUserForModules, setSelectedUserForModules] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedUserForResend, setSelectedUserForResend] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Estados para estructura empresarial
  const [estructuraType, setEstructuraType] = useState<'simple' | 'multi'>('simple');
  const [unidades, setUnidades] = useState([{ id: '1', name: 'Principal', negocios: [] as any[] }]);
  const [selectedUnidad, setSelectedUnidad] = useState<string>('1');
  
  // Modales de estructura empresarial
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [showNegocioModal, setShowNegocioModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<any>(null);
  const [editingNegocio, setEditingNegocio] = useState<any>(null);
  
  // Estados para vista previa de logos
  const [unidadLogoPreview, setUnidadLogoPreview] = useState<string>('');
  const [negocioLogoPreview, setNegocioLogoPreview] = useState<string>('');

  // Módulos disponibles del sistema
  const availableModules = [
    // Módulos básicos (8)
    { id: 'panel-inicial', name: 'Panel Inicial', emoji: '📊', color: 'purple', category: 'basico' },
    { id: 'recursos-humanos', name: 'Recursos Humanos', emoji: '👥', color: 'blue', category: 'basico' },
    { id: 'procesos-tareas', name: 'Procesos y tareas', emoji: '✅', color: 'yellow', category: 'basico' },
    { id: 'gastos', name: 'Gastos', emoji: '💰', color: 'yellow', category: 'basico' },
    { id: 'caja-chica', name: 'Caja chica', emoji: '💳', color: 'yellow', category: 'basico' },
    { id: 'punto-venta', name: 'Punto de venta', emoji: '🛒', color: 'orange', category: 'basico' },
    { id: 'ventas', name: 'Ventas', emoji: '🎁', color: 'orange', category: 'basico' },
    { id: 'kpis', name: 'KPIs', emoji: '📈', color: 'purple', category: 'basico' },
    
    // Módulos complementarios (12)
    { id: 'mantenimiento', name: 'Mantenimiento', emoji: '🔧', color: 'yellow', category: 'complementario' },
    { id: 'inventarios', name: 'Inventarios', emoji: '📦', color: 'orange', category: 'complementario' },
    { id: 'control-minutas', name: 'Control de minutas', emoji: '📄', color: 'yellow', category: 'complementario' },
    { id: 'limpieza', name: 'Limpieza', emoji: '🧹', color: 'yellow', category: 'complementario' },
    { id: 'lavanderia', name: 'Lavandería', emoji: '👕', color: 'blue', category: 'complementario' },
    { id: 'transportacion', name: 'Transportación', emoji: '🚚', color: 'orange', category: 'complementario' },
    { id: 'vehiculos-maquinaria', name: 'Vehículos y maquinaria', emoji: '🚗', color: 'orange', category: 'complementario' },
    { id: 'inmuebles', name: 'Inmuebles', emoji: '🏢', color: 'blue', category: 'complementario' },
    { id: 'formularios', name: 'Formularios', emoji: '📋', color: 'blue', category: 'complementario' },
    { id: 'facturacion', name: 'Facturación', emoji: '🧾', color: 'green', category: 'complementario' },
    { id: 'correo-electronico', name: 'Correo electrónico', emoji: '✉️', color: 'blue', category: 'complementario' },
    { id: 'clima-laboral', name: 'Clima laboral', emoji: '😊', color: 'blue', category: 'complementario' },
    
    // Inteligencia artificial (4)
    { id: 'agente-ventas', name: 'Índice Agente de Ventas', emoji: '🤖', color: 'yellow', category: 'ia' },
    { id: 'analitica', name: 'Índice Analítica', emoji: '📊', color: 'yellow', category: 'ia' },
    { id: 'capacitacion', name: 'Capacitación', emoji: '🎓', color: 'blue', category: 'ia' },
    { id: 'coach', name: 'Índice Coach', emoji: '💬', color: 'yellow', category: 'ia' }
  ];

  const toggleUserModule = (userId: string, moduleId: string) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const hasModule = user.modules.includes(moduleId);
        return {
          ...user,
          modules: hasModule 
            ? user.modules.filter(m => m !== moduleId)
            : [...user.modules, moduleId]
        };
      }
      return user;
    }));
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          status: user.status === 'active' ? 'inactive' : 'active' as 'active' | 'pending' | 'inactive'
        };
      }
      return user;
    }));
  };

  const changeUserRole = (userId: string, newRole: 'Super Admin' | 'Admin' | 'User') => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return { ...user, role: newRole };
      }
      return user;
    }));
  };

  const generateInviteLink = (email: string) => {
    const token = Math.random().toString(36).substring(2, 15);
    return `https://indice-erp.com/invite/${token}`;
  };

  const handleSendInvite = (firstName: string, lastName: string, email: string) => {
    const link = generateInviteLink(email);
    setInviteLink(link);
    
    // Crear nuevo usuario
    const newUser: User = {
      id: Date.now().toString(),
      name: `${firstName} ${lastName}`,
      email: email,
      role: 'User',
      status: 'pending',
      modules: []
    };
    
    setUsers([...users, newUser]);
    
    // Simular envío de correo
    console.log(`Invitación enviada a ${email} con link: ${link}`);
  };

  const handleResendInvite = (userId: string, newEmail?: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const emailToSend = newEmail || user.email;
    const link = generateInviteLink(emailToSend);
    setInviteLink(link);
    
    if (newEmail) {
      setUsers(users.map(u => u.id === userId ? { ...u, email: newEmail } : u));
    }
    
    console.log(`Invitación reenviada a ${emailToSend} con link: ${link}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const subTabs = [
    { id: 'perfil', label: t.panelInicial.tabs.profile, emoji: '👤' },
    { id: 'estructuraEmpresarial', label: t.panelInicial.tabs.businessStructure, emoji: '🏢' },
    { id: 'perfilEmpresarial', label: t.panelInicial.tabs.businessProfile, emoji: '📊' },
    { id: 'plan', label: t.panelInicial.tabs.plan, emoji: '📋' },
    { id: 'facturacion', label: t.panelInicial.tabs.billing, emoji: '🧾' },
    { id: 'usuarios', label: t.panelInicial.tabs.users, emoji: '👥' },
  ];

  // Preguntas del diagnóstico desde las traducciones
  const diagnosticoQuestions = {
    people: t.panelInicial.diagnosis.questions.people,
    processes: t.panelInicial.diagnosis.questions.processes,
    products: t.panelInicial.diagnosis.questions.products,
    finance: t.panelInicial.diagnosis.questions.finance,
  };

  const pilares = [
    { 
      id: 'people', 
      emoji: '👥', 
      title: t.panelInicial.diagnosis.pillars.people.title, 
      description: t.panelInicial.diagnosis.pillars.people.description,
      color: 'blue'
    },
    { 
      id: 'processes', 
      emoji: '⚙️', 
      title: t.panelInicial.diagnosis.pillars.processes.title, 
      description: t.panelInicial.diagnosis.pillars.processes.description,
      color: 'yellow'
    },
    { 
      id: 'products', 
      emoji: '📦', 
      title: t.panelInicial.diagnosis.pillars.products.title, 
      description: t.panelInicial.diagnosis.pillars.products.description,
      color: 'orange'
    },
    { 
      id: 'finance', 
      emoji: '💰', 
      title: t.panelInicial.diagnosis.pillars.finance.title, 
      description: t.panelInicial.diagnosis.pillars.finance.description,
      color: 'green'
    }
  ];

  // Efecto para cargar vista previa del logo de unidad cuando se edita
  useEffect(() => {
    if (editingUnidad?.logo && showUnidadModal) {
      setUnidadLogoPreview(editingUnidad.logo);
    } else if (!showUnidadModal) {
      setUnidadLogoPreview('');
    }
  }, [editingUnidad, showUnidadModal]);

  // Efecto para cargar vista previa del logo de negocio cuando se edita
  useEffect(() => {
    if (editingNegocio?.logo && showNegocioModal) {
      setNegocioLogoPreview(editingNegocio.logo);
    } else if (!showNegocioModal) {
      setNegocioLogoPreview('');
    }
  }, [editingNegocio, showNegocioModal]);

  const calculateProgress = (pillarId: string) => {
    const pillarAnswers = answers[pillarId as keyof DiagnosticoAnswers];
    return Object.keys(pillarAnswers).length;
  };

  const calculateTotalProgress = () => {
    const total = Object.values(answers).reduce((acc, pillar) => {
      return acc + Object.keys(pillar).length;
    }, 0);
    return Math.round((total / 40) * 100);
  };

  const handleAnswer = (pillar: string, questionIndex: number, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [pillar]: {
        ...prev[pillar as keyof DiagnosticoAnswers],
        [questionIndex]: answerIndex
      }
    }));
  };

  const handleRestartPillar = (pillarId: string) => {
    setAnswers(prev => ({
      ...prev,
      [pillarId]: {}
    }));
    setCurrentQuestion(0);
  };

  const handleNextQuestion = () => {
    if (activePillar && currentQuestion < 9) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleStartPillar = (pillarId: string) => {
    setActivePillar(pillarId);
    setCurrentQuestion(0);
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string, text: string, border: string, icon: string }> = {
      blue: { 
        bg: 'bg-blue-50 dark:bg-blue-900/20', 
        text: 'text-blue-700 dark:text-blue-300', 
        border: 'border-blue-200 dark:border-blue-700',
        icon: 'bg-blue-100 dark:bg-blue-900/40'
      },
      yellow: { 
        bg: 'bg-yellow-50 dark:bg-yellow-900/20', 
        text: 'text-yellow-700 dark:text-yellow-300', 
        border: 'border-yellow-200 dark:border-yellow-700',
        icon: 'bg-yellow-100 dark:bg-yellow-900/40'
      },
      orange: { 
        bg: 'bg-orange-50 dark:bg-orange-900/20', 
        text: 'text-orange-700 dark:text-orange-300', 
        border: 'border-orange-200 dark:border-orange-700',
        icon: 'bg-orange-100 dark:bg-orange-900/40'
      },
      green: { 
        bg: 'bg-green-50 dark:bg-green-900/20', 
        text: 'text-green-700 dark:text-green-300', 
        border: 'border-green-200 dark:border-green-700',
        icon: 'bg-green-100 dark:bg-green-900/40'
      }
    };
    return colorMap[color];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'panel-inicial') return; // Ya estamos aquí
              onNavigate(page);
            }} 
            currentModule="panel-inicial" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Panel Inicial
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configura tu perfil, estructura empresarial, facturación y más.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> Regresar
            </Button>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeSubTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Aquí irá el contenido de cada pestaña */}
        {activeSubTab === 'perfil' && (
          <div>
            {/* Barra de título */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 border border-purple-200 dark:border-purple-700/30 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <span className="text-2xl">👤</span>
                    {t.panelInicial.profile.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t.panelInicial.profile.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Identidad */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Identidad
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Tu foto y tu nombre para la interfaz.
                </p>
              </div>

              {/* Foto de perfil */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t.panelInicial.profile.fields.profilePhoto}
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-md">
                    JD
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium">
                      📷 {t.panelInicial.profile.fields.uploadPhoto}
                    </button>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      JPG/PNG, Máx 1MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Nombre y apellidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Nombre y apellidos
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Nombre o nombres
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. María Fernanda"
                      defaultValue="Juan"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      En algunos países puedes usar uno o varios nombres.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Apellido o apellidos
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. López García"
                      defaultValue="Domínguez"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Puede ser 1 (USA/Canadá) o 2 (México/Colombia).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Información de contacto
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Datos para notificaciones y comunicación.
                </p>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.profile.fields.email}
                </label>
                <input
                  type="email"
                  defaultValue="juan@empresa.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.profile.fields.phone} <span className="text-gray-400 text-[11px]">(opcional)</span>
                </label>
                <div className="flex gap-2">
                  <select className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                    <option value="+4">🇺🇸 +4</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+1">🇨🇦 +1</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+57">🇨🇴 +57</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="+52 999 000 0000"
                    defaultValue="999 000 0000"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Selecciona tu país para prefijar la clave.
                </p>
              </div>
            </div>

            {/* Seguridad de la cuenta */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Seguridad de la cuenta
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Actualiza tu contraseña cuando lo necesites.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Si no quieres cambiarla, déjala vacía.
              </p>
            </div>

            {/* Preferencias */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preferencias
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Personaliza el idioma de la interfaz.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Idioma preferido
                </label>
                <select className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                  <option value="es-MX">🇲🇽 Español (México)</option>
                  <option value="es-ES">🇪🇸 Español (España)</option>
                  <option value="en-US">🇺🇸 English (US)</option>
                  <option value="en-GB">🇬🇧 English (UK)</option>
                  <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                  <option value="fr-FR">🇫🇷 Français</option>
                </select>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Usaremos este idioma para la interfaz y plantillas.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'estructuraEmpresarial' && (
          <div>
            {/* Barra de título */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 border border-purple-200 dark:border-purple-700/30 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <span className="text-2xl">🏢</span>
                    ¿Cómo está organizada tu empresa?
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Elige cómo operas para organizar tus negocios dentro de Índice.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Se guarda automáticamente</span>
                </div>
              </div>
            </div>

            {/* Estructura */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tipo de operación
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Selecciona la opción que mejor describe tu empresa:
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Esto te ayudará a organizar mejor tus operaciones, ventas y finanzas.
                </p>
              </div>

              {/* Estructura operativa */}
              <div className="mb-6">

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Opción Simple */}
                  <button
                    type="button"
                    onClick={() => setEstructuraType('simple')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      estructuraType === 'simple'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        estructuraType === 'simple'
                          ? 'border-purple-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {estructuraType === 'simple' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{t.panelInicial.structure.mode.simpleTitle}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-7 mb-2">
                      {t.panelInicial.structure.mode.simpleDescription}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 ml-7 italic">
                      Ejemplo: un restaurante, tienda o consultorio
                    </p>
                  </button>

                  {/* Opción Multi-unidad */}
                  <button
                    type="button"
                    onClick={() => setEstructuraType('multi')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      estructuraType === 'multi'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        estructuraType === 'multi'
                          ? 'border-purple-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {estructuraType === 'multi' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{t.panelInicial.structure.mode.multiTitle}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-7 mb-2">
                      {t.panelInicial.structure.mode.multiDescription}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 ml-7 italic">
                      Ejemplo: varios restaurantes, sucursales o marcas
                    </p>
                  </button>
                </div>

                {/* Descripción según el tipo */}
                {estructuraType === 'simple' ? (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700/30 text-center">
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      ¿Tienes más de un negocio o sucursal?{' '}
                      <button
                        type="button"
                        onClick={() => setEstructuraType('multi')}
                        className="font-semibold hover:underline"
                      >
                        Puedes cambiar a modo avanzado.
                      </button>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Primero crea tus <strong>ubicaciones (unidades)</strong> y luego agrega tus <strong>negocios</strong>.
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Así se organizará tu empresa:
                      </p>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono">
{`Empresa
 → Ubicación (ej: Cancún, CDMX)
    → Negocio (ej: Restaurante, tienda, hotel)`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Unidades (solo en multi-unidad) */}
            {estructuraType === 'multi' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t.panelInicial.structure.units.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t.panelInicial.structure.units.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de unidades */}
                <div className="space-y-4 mb-4">
                  {unidades.map((unidad) => (
                    <div
                      key={unidad.id}
                      className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all"
                    >
                      {/* Header de la unidad */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📍</span>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {unidad.name}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {unidad.negocios.length} negocio{unidad.negocios.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingUnidad(unidad);
                              setShowUnidadModal(true);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            ⚙️ Configurar unidad
                          </button>
                          {unidad.id !== '1' && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setUnidades(unidades.filter(u => u.id !== unidad.id));
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Negocios de la unidad */}
                      {unidad.negocios.length > 0 && (
                        <div className="ml-8 space-y-2 mb-3">
                          {unidad.negocios.map((negocio: any) => (
                            <div
                              key={negocio.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">🏪</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {negocio.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingNegocio({ ...negocio, unidadId: unidad.id });
                                    setShowNegocioModal(true);
                                  }}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                                >
                                  ⚙️ Configurar
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const updatedUnidades = unidades.map(u => {
                                      if (u.id === unidad.id) {
                                        return {
                                          ...u,
                                          negocios: u.negocios.filter((n: any) => n.id !== negocio.id)
                                        };
                                      }
                                      return u;
                                    });
                                    setUnidades(updatedUnidades);
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botón agregar negocio */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingNegocio({ unidadId: unidad.id });
                          setShowNegocioModal(true);
                        }}
                        className="ml-8 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        + Agregar negocio
                      </button>
                    </div>
                  ))}
                </div>

                {/* Botón agregar unidad */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingUnidad(null);
                    setShowUnidadModal(true);
                  }}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {t.panelInicial.structure.units.addUnit}
                </button>
              </div>
            )}

            {/* Identidad empresarial (Simple) o Identidad del holding (Multi) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {estructuraType === 'simple' ? t.panelInicial.structure.identity.simple : t.panelInicial.structure.identity.holding}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {estructuraType === 'simple' 
                    ? t.panelInicial.structure.identity.simpleDesc
                    : t.panelInicial.structure.identity.holdingDesc
                  }
                </p>
              </div>

              {estructuraType === 'multi' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-5 border border-purple-200 dark:border-purple-700/30">
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    <strong>Estos datos representan la identidad de la empresa principal (holding).</strong>
                  </p>
                </div>
              )}

              {/* Nombre de la empresa/holding */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {estructuraType === 'simple' ? t.panelInicial.structure.fields.companyName : t.panelInicial.structure.fields.holdingName} {estructuraType === 'simple' ? 'empresa' : 'holding'}
                  </label>
                  <input
                    type="text"
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.panelInicial.structure.fields.industry}
                  </label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                    <option value="">{t.panelInicial.structure.fields.selectIndustry}</option>
                    <option value="retail">🛍️ Retail / Comercio</option>
                    <option value="food">🍔 Alimentos y Bebidas</option>
                    <option value="tech">💻 Tecnología</option>
                    <option value="health">🏥 Salud</option>
                    <option value="education">🎓 Educación</option>
                    <option value="services">🔧 Servicios</option>
                    <option value="manufacturing">🏭 Manufactura</option>
                    <option value="other">📦 Otro</option>
                  </select>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Afecta presets de módulos y reportes.
                  </p>
                </div>
              </div>

              {/* Logo */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo de la {estructuraType === 'simple' ? 'empresa' : 'holding'}
                </label>
                <div className="flex items-center gap-4">
                  <button className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium transition-all">
                    Seleccionar archivo
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Ningún archivo seleccionado
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  JPG/PNG/SVG. Máx 1MB.
                </p>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.structure.fields.description} <span className="text-xs text-gray-500">{t.panelInicial.structure.fields.optional}</span>
                </label>
                <textarea
                  rows={4}
                  placeholder=""
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'perfilEmpresarial' && (
          <>
            {/* Header de la sección con título y botones de acción */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 mb-6 border border-purple-200 dark:border-purple-700/30">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    {t.panelInicial.diagnosis.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t.panelInicial.diagnosis.description}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700"
                >
                  <Printer className="h-4 w-4" />
                  {t.panelInicial.diagnosis.printDiagnosis}
                </Button>
              </div>
            </div>

            {/* Mensaje de centro de diagnóstico */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t.panelInicial.diagnosis.centerTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t.panelInicial.diagnosis.centerDescription}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  {t.panelInicial.diagnosis.questionCountLabel}{' '}
                  <span className="text-purple-600">{t.panelInicial.diagnosis.questionCount}</span>
                </p>

                {/* Checkboxes de pilares */}
                <div className="grid grid-cols-4 gap-4">
                  {pilares.map(pilar => {
                    const progress = calculateProgress(pilar.id);
                    const isComplete = progress === 10;
                    return (
                      <div key={pilar.id} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isComplete 
                            ? 'bg-purple-600 border-purple-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isComplete && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {pilar.emoji} {pilar.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Progreso del diagnóstico */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t.panelInicial.diagnosis.progress}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {calculateTotalProgress()}% {t.panelInicial.diagnosis.progressOf}
              </p>
              <div className="grid grid-cols-4 gap-4">
                {pilares.map(pilar => {
                  const progress = calculateProgress(pilar.id);
                  const isComplete = progress === 10;
                  return (
                    <div key={pilar.id} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isComplete 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isComplete && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {pilar.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cards de pilares */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pilares.map(pilar => {
                const progress = calculateProgress(pilar.id);
                const isActive = activePillar === pilar.id;
                const colors = getColorClasses(pilar.color);

                return (
                  <div key={pilar.id}>
                    <div className={`border-2 rounded-lg p-6 transition-all ${colors.border} ${colors.bg}`}>
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors.icon}`}>
                          {pilar.emoji}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold mb-1 ${colors.text}`}>
                            {pilar.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {pilar.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {progress}/10
                        </span>
                        <Button 
                          onClick={() => handleStartPillar(pilar.id)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {progress === 0 ? t.panelInicial.diagnosis.start : progress === 10 ? t.panelInicial.diagnosis.doAgain : t.panelInicial.diagnosis.continue}
                        </Button>
                      </div>
                    </div>

                    {/* Carrusel de preguntas */}
                    {isActive && (
                      <div className="mt-4 bg-white dark:bg-gray-800 border-2 border-purple-600 rounded-lg p-8 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {pilar.emoji} {pilar.title}
                          </h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActivePillar(null)}
                          >
                            {t.panelInicial.diagnosis.close}
                          </Button>
                        </div>

                        {/* Indicador de progreso */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t.panelInicial.diagnosis.question} {currentQuestion + 1} {t.panelInicial.diagnosis.of} 10
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {progress}/10 {t.panelInicial.diagnosis.completed}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(currentQuestion + 1) * 10}%` }}
                            />
                          </div>
                        </div>

                        {/* Pregunta actual */}
                        {(() => {
                          const currentQ = diagnosticoQuestions[pilar.id as keyof typeof diagnosticoQuestions][currentQuestion];
                          const selectedAnswer = answers[pilar.id as keyof DiagnosticoAnswers][currentQuestion];
                          
                          return (
                            <div className="mb-8">
                              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                                {currentQuestion + 1}. {currentQ.question}
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                {currentQ.options.map((option, optionIndex) => (
                                  <button
                                    key={optionIndex}
                                    onClick={() => handleAnswer(pilar.id, currentQuestion, optionIndex)}
                                    className={`px-6 py-4 rounded-lg text-base font-medium transition-all border-2 text-left ${ 
                                      selectedAnswer === optionIndex
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Navegación del carrusel */}
                        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousQuestion}
                            disabled={currentQuestion === 0}
                            className="gap-2"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            {t.panelInicial.diagnosis.previous}
                          </Button>

                          {currentQuestion < 9 ? (
                            <Button
                              size="sm"
                              onClick={handleNextQuestion}
                              className="gap-2 bg-purple-600 hover:bg-purple-700"
                            >
                              {t.panelInicial.diagnosis.next}
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActivePillar(null);
                                setCurrentQuestion(0);
                              }}
                              disabled={progress < 10}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {t.panelInicial.diagnosis.finish}
                            </Button>
                          )}
                        </div>

                        {/* Opción de reiniciar si está completado */}
                        {progress === 10 && (
                          <div className="mt-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestartPillar(pilar.id)}
                              className="text-sm"
                            >
                              {t.panelInicial.diagnosis.restart}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeSubTab === 'facturacion' && (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 border border-purple-200 dark:border-purple-700/30">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <span className="text-2xl">🧾</span>
                {t.panelInicial.billing.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.panelInicial.billing.subtitle}
              </p>
            </div>

            <div className="space-y-6">
              {/* Datos Fiscales */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start gap-2 mb-4">
                    <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      📋
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t.panelInicial.billing.fiscalData.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t.panelInicial.billing.fiscalData.subtitle}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.panelInicial.billing.fiscalData.country}
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                        <option value="">{t.panelInicial.billing.fiscalData.selectCountry}</option>
                        <option value="es-MX">🇲🇽 México</option>
                        <option value="es-CO">🇨🇴 Colombia</option>
                        <option value="en-US">🇺🇸 USA</option>
                        <option value="en-CA">🇨🇦 Canada</option>
                        <option value="pt-BR">🇧🇷 Brasil</option>
                        <option value="no-invoice">No factura</option>
                      </select>
                    </div>

                    {/* Campos específicos según el país seleccionado */}
                    {selectedCountry === 'es-MX' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.rfc}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.razonSocial}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.regimenFiscal}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.usoCFDI}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t.panelInicial.billing.fiscalData.codigoPostalFiscal}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </>
                    )}

                    {selectedCountry === 'es-CO' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.nit}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.razonSocial}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t.panelInicial.billing.fiscalData.responsabilidadFiscal}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </>
                    )}

                    {selectedCountry === 'pt-BR' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.cnpjCpf}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.razaoSocial}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t.panelInicial.billing.fiscalData.inscricaoEstadual}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </>
                    )}

                    {selectedCountry === 'en-US' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.ein}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.legalName}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t.panelInicial.billing.fiscalData.state}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </>
                    )}

                    {selectedCountry === 'en-CA' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.businessNumber}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.legalName}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t.panelInicial.billing.fiscalData.province}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </>
                    )}

                    {(selectedCountry === 'fr-CA' || selectedCountry === 'ko-CA' || selectedCountry === 'zh-CA') && selectedCountry && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.taxId}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t.panelInicial.billing.fiscalData.companyName}
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t.panelInicial.billing.fiscalData.postalCode}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Método de pago y Facturación */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Método de pago
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Configura tu método y frecuencia de pago
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddCard(!showAddCard)}
                      className="gap-2"
                    >
                      {showAddCard ? '✕ Cancelar' : '+ Agregar tarjeta'}
                    </Button>
                  </div>

                  {/* Tarjetas guardadas */}
                  {!showAddCard && savedCards.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tarjetas guardadas
                      </label>
                      {savedCards.map((card) => (
                        <div 
                          key={card.id}
                          className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                            card.isDefault
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => {
                            setSavedCards(savedCards.map(c => ({
                              ...c,
                              isDefault: c.id === card.id
                            })));
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {card.type} •••• {card.lastFourDigits}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {card.cardholderName} • Exp: {card.expirationDate}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {card.isDefault && (
                                <span className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-full">
                                  Predeterminada
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSavedCards(savedCards.filter(c => c.id !== card.id));
                                }}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulario para agregar nueva tarjeta */}
                  {showAddCard && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tipo de pago preferido
                        </label>
                        <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                          <option>Selecciona un método...</option>
                          <option>💳 Visa</option>
                          <option>💳 Mastercard</option>
                          <option>💳 American Express</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Número de tarjeta
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            maxLength={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fecha de expiración
                          </label>
                          <input
                            type="text"
                            placeholder="MM/AA"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nombre en la tarjeta
                        </label>
                        <input
                          type="text"
                          placeholder="Como aparece en la tarjeta"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        Guardar tarjeta
                      </Button>
                    </div>
                  )}

                  {/* Configuración de facturación */}
                  {!showAddCard && (
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <span className="flex items-center gap-2">
                            ⚙️ Facturación automática
                          </span>
                        </label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Configura renovación, día de cobro y correo de facturas
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Día de facturación
                        </label>
                        <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                          <option>Día 1 de cada mes</option>
                          {[...Array(28)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Día {i + 1} de cada mes
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email para facturas
                        </label>
                        <input
                          type="email"
                          placeholder="factura@empresa.com"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Recibirás tus facturas en este correo
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Facturas del servicio */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start gap-2 mb-4">
                    <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Facturas del servicio
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Historial de facturas y pagos realizados
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                            Concepto
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                            Monto
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                            Descargar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            Marzo 2026
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            Plan Premium - Mensual
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            $199.00 USD
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Pagada
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="inline-flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            Febrero 2026
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            Plan Premium - Mensual
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            $199.00 USD
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Pagada
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="inline-flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            Enero 2026
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            Plan Premium - Mensual
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            $199.00 USD
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Pagada
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="inline-flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            Diciembre 2025
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            Plan Premium - Mensual
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            $199.00 USD
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                              Pendiente
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="inline-flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            Noviembre 2025
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            Plan Premium - Mensual
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            $199.00 USD
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Pagada
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="inline-flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          </div>
        )}

        {activeSubTab === 'plan' && (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 border border-purple-200 dark:border-purple-700/30 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {t.panelInicial.plan.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t.panelInicial.plan.subtitle}
              </p>
            </div>

            {/* Grid de planes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Plan Inicio */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:scale-105 hover:border-green-400 dark:hover:border-green-500">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🟢</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t.panelInicial.plan.plans.inicio.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t.panelInicial.plan.plans.inicio.description}
                  </p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-green-600 dark:text-green-400">$65</span>
                    <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 mt-0.5">❌</span>
                    <span className="text-gray-500 dark:text-gray-500">{t.panelInicial.plan.features.products}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 mt-0.5">❌</span>
                    <span className="text-gray-500 dark:text-gray-500">{t.panelInicial.plan.features.finance}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">📈</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisBasic}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">👤</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users5}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 mt-0.5">❌</span>
                    <span className="text-gray-500 dark:text-gray-500">{t.panelInicial.plan.features.complementaryModules}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">📞</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions1}</span>
                  </div>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  {t.panelInicial.plan.plans.inicio.button}
                </Button>
              </div>

              {/* Plan Controla */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:scale-105 hover:border-blue-400 dark:hover:border-blue-500">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🔵</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t.panelInicial.plan.plans.controla.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t.panelInicial.plan.plans.controla.description}
                  </p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">$129</span>
                    <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.products}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.finance}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">📈</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisComplete}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">👤</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users10}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">🧩</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.modules2}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">📞</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions2}</span>
                  </div>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {t.panelInicial.plan.plans.controla.button}
                </Button>
              </div>

              {/* Plan Escala - Más Popular */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 border-cyan-400 dark:border-cyan-500 p-6 transition-all hover:shadow-2xl hover:scale-105 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    {t.panelInicial.plan.mostPopular}
                  </span>
                </div>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t.panelInicial.plan.plans.escala.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t.panelInicial.plan.plans.escala.description}
                  </p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">$229</span>
                    <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.products}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.finance}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">📈</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisAdvanced}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">👤</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users20}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">🧩</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.modules4}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">🤖</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.aiAnalytics}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-600 mt-0.5">📞</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions2}</span>
                  </div>
                </div>

                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                  {t.panelInicial.plan.plans.escala.button}
                </Button>
              </div>

              {/* Plan Corporativiza */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:scale-105 hover:border-orange-400 dark:hover:border-orange-500">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🏢</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t.panelInicial.plan.plans.corporativiza.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t.panelInicial.plan.plans.corporativiza.description}
                  </p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">$395</span>
                    <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.products}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.finance}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">📈</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisCorporate}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">👤</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users25}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">🧩</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.allModules}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">🤖</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.aiAnalytics}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">🔗</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.integrations}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5">📞</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions4}</span>
                  </div>
                </div>

                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  {t.panelInicial.plan.plans.corporativiza.button}
                </Button>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  ℹ️ {t.panelInicial.plan.additionalInfo.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      {t.panelInicial.plan.additionalInfo.extraUser}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t.panelInicial.plan.additionalInfo.extraUserPrice}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      {t.panelInicial.plan.additionalInfo.learningMode}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t.panelInicial.plan.additionalInfo.learningModeDesc}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      {t.panelInicial.plan.additionalInfo.updates}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t.panelInicial.plan.additionalInfo.updatesDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'usuarios' && (
          <div className="space-y-6">
            {/* Barra de título */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 border border-purple-200 dark:border-purple-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <span className="text-2xl">👥</span>
                    {t.panelInicial.users.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t.panelInicial.users.subtitle}
                  </p>
                </div>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-4 h-4" />
                  {t.panelInicial.users.invite}
                </Button>
              </div>
            </div>

            {/* Barra de filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t.panelInicial.users.search}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro por Rol */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer">
                    <option value="">{t.panelInicial.users.filters.all}</option>
                    <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option>
                    <option value="Admin">{t.panelInicial.users.roles.admin}</option>
                    <option value="User">{t.panelInicial.users.roles.user}</option>
                  </select>
                </div>

                {/* Filtro por Estado */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer">
                    <option value="">{t.panelInicial.users.filters.all}</option>
                    <option value="active">{t.panelInicial.users.status.active}</option>
                    <option value="pending">{t.panelInicial.users.status.pending}</option>
                    <option value="inactive">{t.panelInicial.users.status.inactive}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabla de usuarios */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t.panelInicial.users.table.name}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t.panelInicial.users.table.role}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t.panelInicial.users.table.status}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t.panelInicial.users.table.modules}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t.panelInicial.users.table.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => {
                      const initials = user.name.split(' ').map(n => n[0]).join('');
                      const statusColors = {
                        active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', dot: 'bg-green-500', label: 'Activo' },
                        pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Por activar' },
                        inactive: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-400', dot: 'bg-gray-500', label: 'Desactivado' }
                      };
                      const status = statusColors[user.status];
                      const roleColors = {
                        'Super Admin': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                        'Admin': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                        'User': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      };

                      return (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${roleColors[user.role]} flex items-center justify-center font-semibold`}>
                                {initials}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative group">
                              <select
                                value={user.role}
                                onChange={(e) => changeUserRole(user.id, e.target.value as 'Super Admin' | 'Admin' | 'User')}
                                className={`appearance-none cursor-pointer px-3 py-1 pr-8 rounded-full text-xs font-medium border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all ${roleColors[user.role]}`}
                              >
                                <option value="Super Admin">Super Admin</option>
                                <option value="Admin">Admin</option>
                                <option value="User">User</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedUserForModules(user.id)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              <span>{user.modules.length} módulos</span>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* Toggle Switch mejorado */}
                              <button 
                                onClick={() => toggleUserStatus(user.id)}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                                  user.status === 'active' 
                                    ? 'bg-green-500 hover:bg-green-600' 
                                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                                }`}
                                title={user.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'}
                              >
                                <span 
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ease-in-out shadow-md ${
                                    user.status === 'active' ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              
                              {/* Botón de reenviar invitación */}
                              <button 
                                onClick={() => {
                                  setSelectedUserForResend(user.id);
                                  setShowResendModal(true);
                                }}
                                className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors group"
                                title="Reenviar invitación"
                              >
                                <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Información de resumen */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    5
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total de usuarios
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    3
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Activos
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                    1
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Por activar
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                    1
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Desactivados
                  </div>
                </div>
              </div>
            </div>

            {/* Modal de Gestión de Módulos */}
            {selectedUserForModules && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                  {/* Header del Modal */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Gestionar Módulos
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {users.find(u => u.id === selectedUserForModules)?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedUserForModules(null)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Cuerpo del Modal */}
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                    {/* Módulos Básicos */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <span>📱</span> Módulos básicos
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableModules.filter(m => m.category === 'basico').map((module) => {
                          const user = users.find(u => u.id === selectedUserForModules);
                          const isSelected = user?.modules.includes(module.id) || false;
                          
                          const colorClasses = {
                            blue: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
                            yellow: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
                            orange: 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20',
                            green: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
                            purple: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                          };

                          return (
                            <button
                              key={module.id}
                              onClick={() => toggleUserModule(selectedUserForModules, module.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? `${colorClasses[module.color as keyof typeof colorClasses]} border-opacity-100`
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${
                                isSelected ? colorClasses[module.color as keyof typeof colorClasses] : 'bg-gray-100 dark:bg-gray-700'
                              } flex items-center justify-center text-xl`}>
                                {module.emoji}
                              </div>
                              <div className="flex-1">
                                <div className={`font-medium ${
                                  isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {module.name}
                                </div>
                              </div>
                              <div>
                                {isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      </div>
                    </div>

                    {/* Módulos Complementarios */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <span>🔧</span> Módulos complementarios
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableModules.filter(m => m.category === 'complementario').map((module) => {
                          const user = users.find(u => u.id === selectedUserForModules);
                          const isSelected = user?.modules.includes(module.id) || false;
                          
                          const colorClasses = {
                            blue: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
                            yellow: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
                            orange: 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20',
                            green: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
                            purple: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                          };

                          return (
                            <button
                              key={module.id}
                              onClick={() => toggleUserModule(selectedUserForModules, module.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? `${colorClasses[module.color as keyof typeof colorClasses]} border-opacity-100`
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${
                                isSelected ? colorClasses[module.color as keyof typeof colorClasses] : 'bg-gray-100 dark:bg-gray-700'
                              } flex items-center justify-center text-xl`}>
                                {module.emoji}
                              </div>
                              <div className="flex-1">
                                <div className={`font-medium ${
                                  isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {module.name}
                                </div>
                              </div>
                              <div>
                                {isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      </div>
                    </div>

                    {/* Inteligencia Artificial */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <span>🤖</span> Inteligencia artificial
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableModules.filter(m => m.category === 'ia').map((module) => {
                          const user = users.find(u => u.id === selectedUserForModules);
                          const isSelected = user?.modules.includes(module.id) || false;
                          
                          const colorClasses = {
                            blue: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
                            yellow: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
                            orange: 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20',
                            green: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
                            purple: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                          };

                          return (
                            <button
                              key={module.id}
                              onClick={() => toggleUserModule(selectedUserForModules, module.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? `${colorClasses[module.color as keyof typeof colorClasses]} border-opacity-100`
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${
                                isSelected ? colorClasses[module.color as keyof typeof colorClasses] : 'bg-gray-100 dark:bg-gray-700'
                              } flex items-center justify-center text-xl`}>
                                {module.emoji}
                              </div>
                              <div className="flex-1">
                                <div className={`font-medium ${
                                  isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {module.name}
                                </div>
                              </div>
                              <div>
                                {isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  </div>

                  {/* Footer del Modal */}
                  <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {users.find(u => u.id === selectedUserForModules)?.modules.length || 0} módulos seleccionados
                    </div>
                    <Button
                      onClick={() => setSelectedUserForModules(null)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Mandar Invitación */}
            {showInviteModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
                  {/* Header del Modal */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Mandar Invitación
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Invita a un nuevo colaborador a la organización
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteLink('');
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Cuerpo del Modal */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const firstName = formData.get('firstName') as string;
                    const lastName = formData.get('lastName') as string;
                    const email = formData.get('email') as string;
                    handleSendInvite(firstName, lastName, email);
                  }}>
                    <div className="p-6 space-y-4">
                      {!inviteLink ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Nombre
                            </label>
                            <input
                              type="text"
                              name="firstName"
                              required
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Ej: Juan"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Apellidos
                            </label>
                            <input
                              type="text"
                              name="lastName"
                              required
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Ej: Pérez García"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Correo electrónico
                            </label>
                            <input
                              type="email"
                              name="email"
                              required
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="correo@ejemplo.com"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                            <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">¡Invitación enviada!</span>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-400">
                              Se ha enviado un correo electrónico con el link de invitación.
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Link de invitación
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inviteLink}
                                readOnly
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => copyToClipboard(inviteLink)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                              >
                                {copiedLink ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    Copiar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer del Modal */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      {!inviteLink ? (
                        <>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowInviteModal(false);
                              setInviteLink('');
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Enviar Invitación
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            setShowInviteModal(false);
                            setInviteLink('');
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Cerrar
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal de Reenviar Invitación */}
            {showResendModal && selectedUserForResend && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
                  {/* Header del Modal */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Reenviar Invitación
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {users.find(u => u.id === selectedUserForResend)?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowResendModal(false);
                        setSelectedUserForResend(null);
                        setInviteLink('');
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Cuerpo del Modal */}
                  <div className="p-6 space-y-4">
                    {!inviteLink ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Correo electrónico actual
                          </label>
                          <input
                            type="text"
                            value={users.find(u => u.id === selectedUserForResend)?.email || ''}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nuevo correo electrónico (opcional)
                          </label>
                          <input
                            type="email"
                            id="newEmail"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Dejar vacío para usar el correo actual"
                          />
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Si cambias el correo, se actualizará en el sistema y se enviará la invitación al nuevo correo.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">¡Invitación reenviada!</span>
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            Se ha enviado un nuevo correo electrónico con el link de invitación.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Link de invitación
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={inviteLink}
                              readOnly
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <button
                              onClick={() => copyToClipboard(inviteLink)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                              {copiedLink ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copiar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer del Modal */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {!inviteLink ? (
                      <>
                        <Button
                          onClick={() => {
                            setShowResendModal(false);
                            setSelectedUserForResend(null);
                            setInviteLink('');
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => {
                            const newEmailInput = document.getElementById('newEmail') as HTMLInputElement;
                            const newEmail = newEmailInput?.value.trim() || undefined;
                            handleResendInvite(selectedUserForResend, newEmail);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Reenviar Invitación
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => {
                          setShowResendModal(false);
                          setSelectedUserForResend(null);
                          setInviteLink('');
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Cerrar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modales de Estructura Empresarial */}
        {/* Modal de Configurar Unidad */}
        {showUnidadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 bg-purple-600 dark:bg-purple-700">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {editingUnidad ? t.panelInicial.structure.modal.editUnit : t.panelInicial.structure.modal.newUnit}
                  </h3>
                  <p className="text-sm text-purple-100 mt-1">
                    {editingUnidad ? `Edita los datos de ${editingUnidad.name}` : 'Agrega una nueva unidad operativa'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUnidadModal(false);
                    setEditingUnidad(null);
                    setUnidadLogoPreview('');
                  }}
                  className="p-2 hover:bg-purple-700 dark:hover:bg-purple-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Cuerpo */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    id: editingUnidad?.id || Date.now().toString(),
                    name: formData.get('name') as string,
                    logo: unidadLogoPreview || editingUnidad?.logo || '',
                    industria: formData.get('industria') as string,
                    direccion: formData.get('direccion') as string,
                    ciudad: formData.get('ciudad') as string,
                    estado: formData.get('estado') as string,
                    pais: formData.get('pais') as string,
                    cp: formData.get('cp') as string,
                    telefono: formData.get('telefono') as string,
                    email: formData.get('email') as string,
                    negocios: editingUnidad?.negocios || []
                  };

                  if (editingUnidad) {
                    setUnidades(unidades.map(u => u.id === editingUnidad.id ? data : u));
                  } else {
                    setUnidades([...unidades, data]);
                  }
                  
                  setShowUnidadModal(false);
                  setEditingUnidad(null);
                  setUnidadLogoPreview('');
                }}
                className="overflow-y-auto max-h-[calc(90vh-160px)]"
              >
                <div className="p-6 space-y-5">
                  {/* Información básica */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Información básica
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nombre de la unidad <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={editingUnidad?.name || ''}
                          required
                          placeholder="Ej. Ciudad de México, Norte, Región Centro..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Logo <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                        </label>
                        <div className="flex items-start gap-4">
                          {/* Vista previa del logo */}
                          {(unidadLogoPreview || editingUnidad?.logo) && (
                            <div className="flex-shrink-0">
                              <img
                                src={unidadLogoPreview || editingUnidad?.logo}
                                alt="Logo preview"
                                className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                              />
                            </div>
                          )}
                          
                          {/* Input de archivo */}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setUnidadLogoPreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 file:cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Sube una imagen (PNG, JPG, max 5MB)
                            </p>
                            {(unidadLogoPreview || editingUnidad?.logo) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUnidadLogoPreview('');
                                  if (editingUnidad) {
                                    setEditingUnidad({ ...editingUnidad, logo: '' });
                                  }
                                }}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                              >
                                Eliminar logo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Industria <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                        </label>
                        <select
                          name="industria"
                          defaultValue={editingUnidad?.industria || ''}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">Seleccionar industria...</option>
                          <option value="restaurante">🍽️ Restaurante y Alimentos</option>
                          <option value="retail">🛍️ Retail y Comercio</option>
                          <option value="servicios">💼 Servicios Profesionales</option>
                          <option value="salud">⚕️ Salud y Bienestar</option>
                          <option value="educacion">📚 Educación</option>
                          <option value="tecnologia">💻 Tecnología</option>
                          <option value="construccion">🏗️ Construcción</option>
                          <option value="manufactura">🏭 Manufactura</option>
                          <option value="hospitalidad">🏨 Hospitalidad y Turismo</option>
                          <option value="inmobiliaria">🏢 Bienes Raíces</option>
                          <option value="transporte">🚚 Transporte y Logística</option>
                          <option value="entretenimiento">🎭 Entretenimiento</option>
                          <option value="financiero">💰 Servicios Financieros</option>
                          <option value="agricultura">🌾 Agricultura</option>
                          <option value="otro">📦 Otro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dirección */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Ubicación <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          name="direccion"
                          defaultValue={editingUnidad?.direccion || ''}
                          placeholder="Calle, número, colonia..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ciudad
                          </label>
                          <input
                            type="text"
                            name="ciudad"
                            defaultValue={editingUnidad?.ciudad || ''}
                            placeholder="Ciudad"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Estado/Provincia
                          </label>
                          <input
                            type="text"
                            name="estado"
                            defaultValue={editingUnidad?.estado || ''}
                            placeholder="Estado"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            C.P.
                          </label>
                          <input
                            type="text"
                            name="cp"
                            defaultValue={editingUnidad?.cp || ''}
                            placeholder="00000"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          País
                        </label>
                        <select
                          name="pais"
                          defaultValue={editingUnidad?.pais || ''}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">Seleccionar país...</option>
                          <option value="MX">🇲🇽 México</option>
                          <option value="US">🇺🇸 Estados Unidos</option>
                          <option value="CA">🇨🇦 Canadá</option>
                          <option value="ES">🇪🇸 España</option>
                          <option value="CO">🇨🇴 Colombia</option>
                          <option value="AR">🇦🇷 Argentina</option>
                          <option value="BR">🇧🇷 Brasil</option>
                          <option value="CL">🇨🇱 Chile</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Contacto <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          name="telefono"
                          defaultValue={editingUnidad?.telefono || ''}
                          placeholder="+52 55 1234 5678"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          defaultValue={editingUnidad?.email || ''}
                          placeholder="unidad@empresa.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowUnidadModal(false);
                      setEditingUnidad(null);
                      setUnidadLogoPreview('');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    {t.panelInicial.structure.modal.cancel}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {t.panelInicial.structure.modal.save}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Configurar Negocio */}
        {showNegocioModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 bg-purple-600 dark:bg-purple-700">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {editingNegocio?.id ? 'Configurar Negocio' : 'Nuevo Negocio'}
                  </h3>
                  <p className="text-sm text-purple-100 mt-1">
                    {editingNegocio?.id ? `Edita los datos de ${editingNegocio.name}` : 'Agrega un nuevo negocio/sucursal'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNegocioModal(false);
                    setEditingNegocio(null);
                    setNegocioLogoPreview('');
                  }}
                  className="p-2 hover:bg-purple-700 dark:hover:bg-purple-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Cuerpo */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newNegocio = {
                    id: editingNegocio?.id || Date.now().toString(),
                    name: formData.get('name') as string,
                    logo: negocioLogoPreview || editingNegocio?.logo || '',
                    industria: formData.get('industria') as string,
                    direccion: formData.get('direccion') as string,
                    ciudad: formData.get('ciudad') as string,
                    estado: formData.get('estado') as string,
                    pais: formData.get('pais') as string,
                    cp: formData.get('cp') as string,
                    telefono: formData.get('telefono') as string,
                    email: formData.get('email') as string,
                    gerente: formData.get('gerente') as string,
                    horario: formData.get('horario') as string
                  };

                  const updatedUnidades = unidades.map(u => {
                    if (u.id === editingNegocio?.unidadId) {
                      if (editingNegocio?.id) {
                        return {
                          ...u,
                          negocios: u.negocios.map((n: any) => n.id === editingNegocio.id ? newNegocio : n)
                        };
                      } else {
                        return {
                          ...u,
                          negocios: [...u.negocios, newNegocio]
                        };
                      }
                    }
                    return u;
                  });

                  setUnidades(updatedUnidades);
                  setShowNegocioModal(false);
                  setEditingNegocio(null);
                  setNegocioLogoPreview('');
                }}
                className="overflow-y-auto max-h-[calc(90vh-160px)]"
              >
                <div className="p-6 space-y-5">
                  {/* Información básica */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Información básica
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nombre del negocio <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={editingNegocio?.name || ''}
                          required
                          placeholder="Ej. Sucursal Centro, Tienda Polanco, Almacén Sur..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Logo <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                        </label>
                        <div className="flex items-start gap-4">
                          {/* Vista previa del logo */}
                          {(negocioLogoPreview || editingNegocio?.logo) && (
                            <div className="flex-shrink-0">
                              <img
                                src={negocioLogoPreview || editingNegocio?.logo}
                                alt="Logo preview"
                                className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                              />
                            </div>
                          )}
                          
                          {/* Input de archivo */}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNegocioLogoPreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 file:cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Sube una imagen (PNG, JPG, max 5MB)
                            </p>
                            {(negocioLogoPreview || editingNegocio?.logo) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNegocioLogoPreview('');
                                  if (editingNegocio) {
                                    setEditingNegocio({ ...editingNegocio, logo: '' });
                                  }
                                }}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                              >
                                Eliminar logo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Industria <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                        </label>
                        <select
                          name="industria"
                          defaultValue={editingNegocio?.industria || ''}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">Seleccionar industria...</option>
                          <option value="restaurante">🍽️ Restaurante y Alimentos</option>
                          <option value="retail">🛍️ Retail y Comercio</option>
                          <option value="servicios">💼 Servicios Profesionales</option>
                          <option value="salud">⚕️ Salud y Bienestar</option>
                          <option value="educacion">📚 Educación</option>
                          <option value="tecnologia">💻 Tecnología</option>
                          <option value="construccion">🏗️ Construcción</option>
                          <option value="manufactura">🏭 Manufactura</option>
                          <option value="hospitalidad">🏨 Hospitalidad y Turismo</option>
                          <option value="inmobiliaria">🏢 Bienes Raíces</option>
                          <option value="transporte">🚚 Transporte y Logística</option>
                          <option value="entretenimiento">🎭 Entretenimiento</option>
                          <option value="financiero">💰 Servicios Financieros</option>
                          <option value="agricultura">🌾 Agricultura</option>
                          <option value="otro">📦 Otro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dirección */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Ubicación <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          name="direccion"
                          defaultValue={editingNegocio?.direccion || ''}
                          placeholder="Calle, número, colonia..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ciudad
                          </label>
                          <input
                            type="text"
                            name="ciudad"
                            defaultValue={editingNegocio?.ciudad || ''}
                            placeholder="Ciudad"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Estado/Provincia
                          </label>
                          <input
                            type="text"
                            name="estado"
                            defaultValue={editingNegocio?.estado || ''}
                            placeholder="Estado"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            C.P.
                          </label>
                          <input
                            type="text"
                            name="cp"
                            defaultValue={editingNegocio?.cp || ''}
                            placeholder="00000"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          País
                        </label>
                        <select
                          name="pais"
                          defaultValue={editingNegocio?.pais || ''}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">Seleccionar país...</option>
                          <option value="MX">🇲🇽 México</option>
                          <option value="US">🇺🇸 Estados Unidos</option>
                          <option value="CA">🇨🇦 Canadá</option>
                          <option value="ES">🇪🇸 España</option>
                          <option value="CO">🇨🇴 Colombia</option>
                          <option value="AR">🇦🇷 Argentina</option>
                          <option value="BR">🇧🇷 Brasil</option>
                          <option value="CL">🇨🇱 Chile</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Información operativa */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Información operativa <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            name="telefono"
                            defaultValue={editingNegocio?.telefono || ''}
                            placeholder="+52 55 1234 5678"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            defaultValue={editingNegocio?.email || ''}
                            placeholder="negocio@empresa.com"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Gerente/Responsable
                          </label>
                          <input
                            type="text"
                            name="gerente"
                            defaultValue={editingNegocio?.gerente || ''}
                            placeholder="Nombre del responsable"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Horario
                          </label>
                          <input
                            type="text"
                            name="horario"
                            defaultValue={editingNegocio?.horario || ''}
                            placeholder="Lun-Vie 9:00-18:00"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowNegocioModal(false);
                      setEditingNegocio(null);
                      setNegocioLogoPreview('');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {editingNegocio?.id ? 'Guardar cambios' : 'Crear negocio'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
