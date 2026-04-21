import type { ReactElement } from 'react';

interface FlatIconProps {
  type: string;
  size?: number;
}

export function FlatIcon({ type, size = 40 }: FlatIconProps) {
  const icons: Record<string, ReactElement> = {
    'dashboard': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#9B87F5"/>
        <rect x="25" y="30" width="20" height="15" rx="2" fill="#1A1F2C" opacity="0.8"/>
        <rect x="50" y="30" width="25" height="15" rx="2" fill="#1A1F2C" opacity="0.8"/>
        <rect x="25" y="50" width="25" height="20" rx="2" fill="#1A1F2C" opacity="0.8"/>
        <rect x="55" y="50" width="20" height="20" rx="2" fill="#1A1F2C" opacity="0.8"/>
      </svg>
    ),
    'people': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#3B82F6"/>
        <circle cx="50" cy="38" r="10" fill="#E0F2FE"/>
        <path d="M35 65 Q35 50 50 50 Q65 50 65 65 Z" fill="#E0F2FE"/>
        <circle cx="35" cy="42" r="7" fill="#DBEAFE"/>
        <path d="M25 60 Q25 50 35 50 Q45 50 45 60 Z" fill="#DBEAFE"/>
        <circle cx="65" cy="42" r="7" fill="#DBEAFE"/>
        <path d="M55 60 Q55 50 65 50 Q75 50 75 60 Z" fill="#DBEAFE"/>
      </svg>
    ),
    'tasks': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#EAB308"/>
        <rect x="30" y="25" width="40" height="50" rx="3" fill="#FEF9C3"/>
        <line x1="37" y1="35" x2="45" y2="35" stroke="#854D0E" strokeWidth="2" strokeLinecap="round"/>
        <line x1="37" y1="45" x2="45" y2="45" stroke="#854D0E" strokeWidth="2" strokeLinecap="round"/>
        <line x1="37" y1="55" x2="45" y2="55" stroke="#854D0E" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="52" cy="35" r="3" fill="#22C55E"/>
        <path d="M50 45 L52 47 L58 41" stroke="#22C55E" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <circle cx="52" cy="55" r="3" fill="#FBBF24"/>
      </svg>
    ),
    'money': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#22C55E"/>
        <rect x="25" y="35" width="50" height="30" rx="3" fill="#DCFCE7"/>
        <circle cx="50" cy="50" r="10" fill="#16A34A"/>
        <text x="50" y="56" textAnchor="middle" fill="#DCFCE7" fontSize="14" fontWeight="bold">$</text>
        <circle cx="35" cy="42" r="3" fill="#86EFAC"/>
        <circle cx="65" cy="58" r="3" fill="#86EFAC"/>
      </svg>
    ),
    'wallet': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#10B981"/>
        <rect x="28" y="35" width="44" height="30" rx="3" fill="#D1FAE5"/>
        <rect x="60" y="45" width="8" height="10" rx="2" fill="#047857"/>
        <circle cx="64" cy="50" r="2" fill="#D1FAE5"/>
        <line x1="32" y1="42" x2="52" y2="42" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="32" y1="48" x2="48" y2="48" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    'shopping-cart': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#EF4444"/>
        <path d="M30 30 L35 30 L40 55 L65 55" stroke="#FEE2E2" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M35 30 L70 30 L65 50 L40 50 Z" fill="#FCA5A5"/>
        <circle cx="43" cy="62" r="3" fill="#FEE2E2"/>
        <circle cx="60" cy="62" r="3" fill="#FEE2E2"/>
      </svg>
    ),
    'sales': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#DC2626"/>
        <rect x="28" y="35" width="15" height="30" rx="2" fill="#FEE2E2"/>
        <rect x="46" y="25" width="15" height="40" rx="2" fill="#FECACA"/>
        <path d="M52 23 L58 17" stroke="#FEE2E2" strokeWidth="2" strokeLinecap="round"/>
        <path d="M48 23 L54 17" stroke="#FEE2E2" strokeWidth="2" strokeLinecap="round"/>
        <path d="M56 23 L62 17" stroke="#FEE2E2" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="70" cy="45" r="8" fill="#7C3AED"/>
        <text x="70" y="50" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">%</text>
      </svg>
    ),
    'analytics': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#059669"/>
        <rect x="30" y="50" width="8" height="20" rx="2" fill="#D1FAE5"/>
        <rect x="42" y="40" width="8" height="30" rx="2" fill="#A7F3D0"/>
        <rect x="54" y="30" width="8" height="40" rx="2" fill="#6EE7B7"/>
        <path d="M32 45 L46 35 L58 38 L70 25" stroke="#ECFDF5" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    'maintenance': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#6B7280"/>
        <path d="M35 45 L45 35 L50 40 L60 30 L65 35 L55 45 L50 40 Z" fill="#F3F4F6"/>
        <rect x="43" y="42" width="14" height="30" rx="2" fill="#E5E7EB"/>
        <circle cx="50" cy="60" r="3" fill="#374151"/>
      </svg>
    ),
    'inventory': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#94A3B8"/>
        <rect x="30" y="35" width="18" height="18" fill="#E2E8F0" stroke="#475569" strokeWidth="1.5"/>
        <rect x="52" y="35" width="18" height="18" fill="#E2E8F0" stroke="#475569" strokeWidth="1.5"/>
        <rect x="30" y="57" width="18" height="18" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5"/>
        <rect x="52" y="57" width="18" height="18" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5"/>
      </svg>
    ),
    'document': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#78716C"/>
        <rect x="32" y="25" width="36" height="50" rx="2" fill="#F5F5F4"/>
        <line x1="38" y1="35" x2="62" y2="35" stroke="#44403C" strokeWidth="1.5"/>
        <line x1="38" y1="42" x2="58" y2="42" stroke="#78716C" strokeWidth="1.5"/>
        <line x1="38" y1="49" x2="62" y2="49" stroke="#78716C" strokeWidth="1.5"/>
        <line x1="38" y1="56" x2="55" y2="56" stroke="#78716C" strokeWidth="1.5"/>
      </svg>
    ),
    'cleaning': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#64748B"/>
        <circle cx="48" cy="35" r="8" fill="#E0E7FF"/>
        <rect x="46" y="43" width="4" height="25" fill="#C7D2FE"/>
        <path d="M35 68 L45 68 L48 75 L52 75 L55 68 L65 68 L60 65 L40 65 Z" fill="#E0E7FF"/>
      </svg>
    ),
    'laundry': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#0EA5E9"/>
        <rect x="30" y="30" width="40" height="45" rx="3" fill="#E0F2FE"/>
        <rect x="33" y="33" width="34" height="8" rx="1" fill="#0369A1"/>
        <circle cx="39" cy="37" r="1.5" fill="#BAE6FD"/>
        <circle cx="45" cy="37" r="1.5" fill="#7DD3FC"/>
        <circle cx="50" cy="52" r="12" fill="#0284C7"/>
        <circle cx="50" cy="52" r="8" fill="#BAE6FD"/>
      </svg>
    ),
    'truck': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#F97316"/>
        <rect x="25" y="40" width="30" height="18" rx="2" fill="#FED7AA"/>
        <rect x="55" y="45" width="15" height="13" rx="2" fill="#FDBA74"/>
        <circle cx="35" cy="60" r="4" fill="#431407"/>
        <circle cx="60" cy="60" r="4" fill="#431407"/>
        <rect x="28" y="43" width="8" height="8" fill="#C2410C"/>
      </svg>
    ),
    'vehicle': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#EA580C"/>
        <path d="M30 50 L35 40 L65 40 L70 50 L70 60 L30 60 Z" fill="#FFEDD5"/>
        <rect x="38" y="42" width="10" height="8" fill="#9A3412"/>
        <rect x="52" y="42" width="10" height="8" fill="#9A3412"/>
        <circle cx="38" cy="62" r="4" fill="#431407"/>
        <circle cx="62" cy="62" r="4" fill="#431407"/>
      </svg>
    ),
    'building': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#84CC16"/>
        <rect x="32" y="28" width="36" height="47" rx="2" fill="#ECFCCB"/>
        <rect x="38" y="35" width="6" height="6" fill="#65A30D"/>
        <rect x="48" y="35" width="6" height="6" fill="#65A30D"/>
        <rect x="58" y="35" width="6" height="6" fill="#65A30D"/>
        <rect x="38" y="45" width="6" height="6" fill="#84CC16"/>
        <rect x="48" y="45" width="6" height="6" fill="#84CC16"/>
        <rect x="58" y="45" width="6" height="6" fill="#84CC16"/>
        <rect x="38" y="55" width="6" height="6" fill="#84CC16"/>
        <rect x="48" y="55" width="6" height="6" fill="#84CC16"/>
        <rect x="58" y="55" width="6" height="6" fill="#84CC16"/>
        <rect x="42" y="65" width="16" height="10" fill="#3F6212"/>
      </svg>
    ),
    'forms': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#A855F7"/>
        <rect x="30" y="25" width="40" height="50" rx="2" fill="#F3E8FF"/>
        <line x1="36" y1="35" x2="64" y2="35" stroke="#7C3AED" strokeWidth="2"/>
        <line x1="36" y1="45" x2="58" y2="45" stroke="#A855F7" strokeWidth="1.5"/>
        <line x1="36" y1="52" x2="64" y2="52" stroke="#A855F7" strokeWidth="1.5"/>
        <line x1="36" y1="59" x2="55" y2="59" stroke="#A855F7" strokeWidth="1.5"/>
      </svg>
    ),
    'invoice': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#06B6D4"/>
        <rect x="30" y="25" width="40" height="52" rx="2" fill="#CFFAFE"/>
        <path d="M30 77 L40 72 L50 77 L60 72 L70 77 L70 25 L30 25 Z" fill="#E0F2FE"/>
        <line x1="36" y1="35" x2="64" y2="35" stroke="#0E7490" strokeWidth="2"/>
        <line x1="36" y1="45" x2="58" y2="45" stroke="#06B6D4" strokeWidth="1.5"/>
        <line x1="36" y1="52" x2="64" y2="52" stroke="#06B6D4" strokeWidth="1.5"/>
        <rect x="36" y="60" width="28" height="8" fill="#0891B2"/>
      </svg>
    ),
    'email': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#4F46E5"/>
        <rect x="25" y="35" width="50" height="30" rx="3" fill="#E0E7FF"/>
        <path d="M25 35 L50 52 L75 35" fill="#4F46E5"/>
        <path d="M25 35 L50 52 L75 35" stroke="#C7D2FE" strokeWidth="2" fill="none"/>
      </svg>
    ),
    'mood': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#FBBF24"/>
        <circle cx="50" cy="50" r="22" fill="#FEF3C7"/>
        <circle cx="43" cy="45" r="3" fill="#92400E"/>
        <circle cx="57" cy="45" r="3" fill="#92400E"/>
        <path d="M40 55 Q50 62 60 55" stroke="#92400E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    'ai-robot': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D"/>
            <stop offset="50%" stopColor="#F59E0B"/>
            <stop offset="100%" stopColor="#D97706"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#goldGrad)"/>
        <rect x="35" y="35" width="30" height="30" rx="4" fill="#FFFBEB"/>
        <circle cx="43" cy="48" r="3" fill="#D97706"/>
        <circle cx="57" cy="48" r="3" fill="#D97706"/>
        <rect x="42" y="56" width="16" height="3" rx="1.5" fill="#D97706"/>
        <rect x="47" y="28" width="6" height="7" rx="2" fill="#FEF3C7"/>
        <circle cx="50" cy="26" r="3" fill="#F59E0B"/>
      </svg>
    ),
    'ai-analytics': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047"/>
            <stop offset="50%" stopColor="#FBBF24"/>
            <stop offset="100%" stopColor="#F59E0B"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#goldGrad2)"/>
        <path d="M30 55 L42 40 L54 48 L70 30" stroke="#FFFBEB" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="30" cy="55" r="4" fill="#FFFBEB"/>
        <circle cx="42" cy="40" r="4" fill="#FEF3C7"/>
        <circle cx="54" cy="48" r="4" fill="#FEF3C7"/>
        <circle cx="70" cy="30" r="4" fill="#FFFBEB"/>
        <path d="M62 60 L68 65 L75 58" stroke="#FFFBEB" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    'education': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="goldGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7"/>
            <stop offset="50%" stopColor="#FDE047"/>
            <stop offset="100%" stopColor="#FBBF24"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#goldGrad3)"/>
        <path d="M50 28 L70 38 L50 48 L30 38 Z" fill="#92400E"/>
        <path d="M30 38 L30 52 L50 62 L70 52 L70 38" fill="#D97706"/>
        <rect x="48" y="48" width="4" height="20" fill="#92400E"/>
      </svg>
    ),
    'coach': (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="goldGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24"/>
            <stop offset="50%" stopColor="#F59E0B"/>
            <stop offset="100%" stopColor="#EAB308"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#goldGrad4)"/>
        <circle cx="50" cy="40" r="10" fill="#FFFBEB"/>
        <path d="M35 70 Q35 55 50 55 Q65 55 65 70" fill="#FEF3C7"/>
        <path d="M28 52 L35 45 L42 52" stroke="#FFFBEB" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="65" cy="35" r="8" fill="#DC2626"/>
        <text x="65" y="39" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">!</text>
      </svg>
    ),
  };

  return icons[type] || icons['dashboard'];
}
