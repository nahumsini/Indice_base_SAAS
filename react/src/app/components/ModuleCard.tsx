import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Star } from 'lucide-react';
import { FlatIcon } from './icons/FlatIcon';

interface ModuleCardProps {
  id?: string;
  icon?: LucideIcon;
  iconType?: string;
  emoji?: string;
  title: string;
  color: 'blue' | 'yellow' | 'orange' | 'green' | 'gray' | 'purple' | 'red' | 'gold';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  stepNumber?: number;
  isHighlighted?: boolean;
}

const colorClasses = {
  blue: {
    border: 'border-[#143675]',
    icon: 'text-[#143675]',
    iconBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
    shadow: 'shadow-blue-200',
  },
  yellow: {
    border: 'border-[#FFC300]',
    icon: 'text-[#FFC300]',
    iconBg: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
    shadow: 'shadow-yellow-200',
  },
  orange: {
    border: 'border-orange-500',
    icon: 'text-orange-600',
    iconBg: 'bg-gradient-to-br from-orange-100 to-orange-200',
    shadow: 'shadow-orange-200',
  },
  green: {
    border: 'border-[#147514]',
    icon: 'text-[#147514]',
    iconBg: 'bg-gradient-to-br from-green-100 to-green-200',
    shadow: 'shadow-green-200',
  },
  gray: {
    border: 'border-[#558DBD]',
    icon: 'text-[#558DBD]',
    iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
    shadow: 'shadow-gray-200',
  },
  purple: {
    border: 'border-purple-600',
    icon: 'text-purple-600',
    iconBg: 'bg-gradient-to-br from-purple-100 to-purple-200',
    shadow: 'shadow-purple-200',
  },
  red: {
    border: 'border-red-500',
    icon: 'text-red-500',
    iconBg: 'bg-gradient-to-br from-red-100 to-red-200',
    shadow: 'shadow-red-200',
  },
  gold: {
    border: 'border-yellow-500',
    icon: 'text-yellow-700',
    iconBg: 'bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-300',
    shadow: 'shadow-yellow-300',
  },
};

export function ModuleCard({ 
  id,
  icon: Icon, 
  iconType,
  emoji,
  title, 
  color, 
  isFavorite = false, 
  onToggleFavorite,
  onClick,
  size = 'medium',
  stepNumber,
  isHighlighted,
}: ModuleCardProps) {
  const sizeClasses = {
    small: 'p-2',
    medium: 'p-3',
    large: 'p-3.5',
  };

  const iconSizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6',
  };

  const iconContainerClasses = {
    small: 'p-1',
    medium: 'p-1.5',
    large: 'p-2',
  };

  const textSizeClasses = {
    small: 'text-[13px]',
    medium: 'text-[15px]',
    large: 'text-[18px]',
  };

  const emojiSizeClasses = {
    small: 'text-4xl',
    medium: 'text-5xl',
    large: 'text-6xl',
  };

  const flatIconSizes = {
    small: 48,
    medium: 60,
    large: 72,
  };

  return (
    <Card 
      onClick={onClick}
      className={`
      ${sizeClasses[size]} 
      aspect-[5/4]
      hover:shadow-md hover:-translate-y-1
      transition-all duration-300 
      cursor-pointer 
      relative 
      group 
      bg-white dark:bg-gray-800
      border-2
      ${isHighlighted ? 'border-blue-500 shadow-lg shadow-blue-200 scale-105 ring-4 ring-blue-100' : colorClasses[color].border}
      flex-shrink-0
      w-[140px] md:w-auto
      snap-center
    `}>
      {/* Step Number Badge - Solo visible cuando stepNumber está presente */}
      {stepNumber !== undefined && (
        <div className={`
          absolute -bottom-3 left-1/2 -translate-x-1/2 
          ${isHighlighted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} 
          rounded-full h-6 w-6 
          flex items-center justify-center 
          text-xs font-bold 
          border-2 border-white
          shadow-md
          transition-all duration-300
          ${isHighlighted ? 'scale-110' : ''}
        `}>
          {stepNumber}
        </div>
      )}

      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Star
            className={`h-2.5 w-2.5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
          />
        </button>
      )}
      
      <div className="flex flex-col items-center justify-center text-center h-full">
        {emoji ? (
          <div className="transition-transform group-hover:scale-110 flex-1 flex items-center justify-center mb-1">
            <span className={`${emojiSizeClasses[size]} group-hover:animate-bounce-subtle`}>{emoji}</span>
          </div>
        ) : iconType ? (
          <div className="transition-transform group-hover:scale-110 flex-1 flex items-center justify-center mb-1">
            <FlatIcon type={iconType} size={flatIconSizes[size]} />
          </div>
        ) : Icon ? (
          <div className={`
            ${colorClasses[color].iconBg} 
            rounded-lg 
            ${iconContainerClasses[size]} 
            transition-transform 
            group-hover:scale-110
            animate-pulse-glow
            flex-1 flex items-center justify-center mb-1
          `}>
            <Icon className={`${iconSizeClasses[size]} ${colorClasses[color].icon} group-hover:animate-bounce-subtle`} />
          </div>
        ) : null}
        <p className={`font-semibold text-gray-900 dark:text-white ${textSizeClasses[size]} leading-tight px-0.5 break-words hyphens-auto`}>{title}</p>
      </div>
    </Card>
  );
}