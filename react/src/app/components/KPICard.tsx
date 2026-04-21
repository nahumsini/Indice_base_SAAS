import { Card } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  orderNumber?: number;
}

export function KPICard({ title, value, change, isPositive, orderNumber }: KPICardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 snap-center relative overflow-hidden w-full">
      {/* Indicador de orden */}
      {orderNumber !== undefined && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-br from-[#558DBD] to-[#4a7aa8] text-white text-xs font-bold px-3 py-1.5 rounded-bl-lg shadow-md">
            #{orderNumber}
          </div>
        </div>
      )}
      
      <div className="space-y-2 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium pr-8">{title}</p>
        <div className="space-y-1.5">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <div className={`flex items-center justify-center gap-1.5 text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{change}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}