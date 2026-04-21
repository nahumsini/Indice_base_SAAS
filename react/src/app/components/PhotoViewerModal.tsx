import { X } from 'lucide-react';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  employeeName: string;
  timestamp: string;
  type: 'entrada' | 'salida';
}

export function PhotoViewerModal({
  isOpen,
  onClose,
  photoUrl,
  employeeName,
  timestamp,
  type
}: PhotoViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Foto de {type}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {employeeName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              {timestamp}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Photo */}
        <div className="p-4 bg-gray-100 dark:bg-gray-900">
          <img
            src={photoUrl}
            alt={`Foto de ${type}`}
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Foto capturada al momento de registrar {type}
          </p>
        </div>
      </div>
    </div>
  );
}
