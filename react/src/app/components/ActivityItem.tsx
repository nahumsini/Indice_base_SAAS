import { LucideIcon } from 'lucide-react';

interface ActivityItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  color: 'blue' | 'yellow' | 'orange' | 'green';
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  orange: 'bg-orange-100 text-orange-600',
  green: 'bg-green-100 text-green-600',
};

export function ActivityItem({ icon: Icon, title, description, time, color }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-4 p-5 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className={`${colorClasses[color]} rounded-full p-2.5 flex-shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0 font-medium">{time}</span>
    </div>
  );
}