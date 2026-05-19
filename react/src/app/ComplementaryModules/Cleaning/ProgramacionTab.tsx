import { useState } from 'react';

export default function ProgramacionTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
            📅
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Programación de Servicios
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Agenda y asigna órdenes de trabajo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl mb-2">📅</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Programadas hoy</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completadas</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pendientes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
