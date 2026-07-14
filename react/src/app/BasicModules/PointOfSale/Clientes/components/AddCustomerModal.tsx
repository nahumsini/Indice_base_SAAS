import { useEffect, useState } from 'react';
import { Building2, Check, User } from 'lucide-react';
import { Customer, CustomerType } from '../types/customer.types';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Partial<Customer>) => void;
  customer?: Customer;
}

export function AddCustomerModal({ isOpen, onClose, onSave, customer }: AddCustomerModalProps) {
  const [customerType, setCustomerType] = useState<CustomerType>(customer?.customerType || 'individual');
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    rfc: customer?.rfc || '',
    address: customer?.address || '',
    city: customer?.city || '',
    state: customer?.state || '',
    postalCode: customer?.postalCode || '',
    creditLimit: customer?.creditLimit?.toString() || '',
    notes: customer?.notes || '',
  });

  useEffect(() => {
    if (!isOpen) return;

    setCustomerType(customer?.customerType || 'individual');
    setFormData({
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      rfc: customer?.rfc || '',
      address: customer?.address || '',
      city: customer?.city || '',
      state: customer?.state || '',
      postalCode: customer?.postalCode || '',
      creditLimit: customer?.creditLimit?.toString() || '',
      notes: customer?.notes || '',
    });
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newCustomer: Partial<Customer> = {
      id: customer?.id,
      ...formData,
      customerType,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      status: 'active',
      totalPurchases: 0,
      currentBalance: 0,
      loyaltyPoints: 0,
      createdAt: new Date(),
    };

    onSave(newCustomer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <PosModalFrame
      closeLabel="Cerrar cliente"
      eyebrow="Clientes POS"
      footerClassName={posModalModuleFooterClassName}
      icon={<User className="h-6 w-6" />}
      onClose={onClose}
      size="md"
      subtitle="Mantiene el directorio operativo listo para tickets, credito y estados de cuenta."
      title={customer ? 'Editar Cliente' : 'Agregar Cliente'}
      tone="coral"
      footer={(
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={posModalSecondaryActionClassName}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pos-customer-form"
            className={posModalPrimaryActionClassName}
          >
            <Check className="h-4 w-4" />
            {customer ? 'Guardar cambios' : 'Agregar cliente'}
          </button>
        </div>
      )}
    >
        <form id="pos-customer-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tipo de cliente
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCustomerType('individual')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  customerType === 'individual'
                    ? 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/10 border-[#FF6B5E] text-[#A7352C] dark:text-[#FFB5AE]'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Persona Física</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('business')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  customerType === 'business'
                    ? 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/10 border-[#FF6B5E] text-[#A7352C] dark:text-[#FFB5AE]'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Persona Moral</span>
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre completo / Razón social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder={customerType === 'individual' ? 'Juan Pérez García' : 'Comercializadora ABC SA de CV'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="cliente@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="55-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RFC
                </label>
                <input
                  type="text"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent font-mono"
                  placeholder="XAXX010101000"
                  maxLength={13}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Límite de crédito
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Dirección
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Calle y número
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="Av. Reforma 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="Ciudad de México"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="CDMX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código Postal
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="01000"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas adicionales
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent resize-none"
              placeholder="Información adicional sobre el cliente..."
            />
          </div>

        </form>
    </PosModalFrame>
  );
}
