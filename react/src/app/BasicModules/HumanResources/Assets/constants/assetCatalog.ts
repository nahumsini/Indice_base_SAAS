export const assetTypeOptions = [
  { value: 'laptop', labelKey: 'laptop', icon: '💻' },
  { value: 'desktop', labelKey: 'desktop', icon: '🖥️' },
  { value: 'monitor', labelKey: 'monitor', icon: '🖥️' },
  { value: 'keyboard_mouse', labelKey: 'keyboardMouse', icon: '⌨️' },
  { value: 'printer_scanner', labelKey: 'printerScanner', icon: '🖨️' },
  { value: 'networking_equipment', labelKey: 'networkingEquipment', icon: '🌐' },
  { value: 'server', labelKey: 'server', icon: '🗄️' },
  { value: 'tablet', labelKey: 'tablet', icon: '📱' },
  { value: 'mobile_phone', labelKey: 'mobilePhone', icon: '📱' },
  { value: 'attendance_terminal', labelKey: 'attendanceTerminal', icon: '🕘' },
  { value: 'point_of_sale', labelKey: 'pointOfSale', icon: '🧾' },
  { value: 'radio_communication', labelKey: 'radioCommunication', icon: '📻' },
  { value: 'vehicle', labelKey: 'vehicle', icon: '🚗' },
  { value: 'motorcycle', labelKey: 'motorcycle', icon: '🏍️' },
  { value: 'bicycle', labelKey: 'bicycle', icon: '🚲' },
  { value: 'machinery', labelKey: 'machinery', icon: '⚙️' },
  { value: 'production_equipment', labelKey: 'productionEquipment', icon: '🏭' },
  { value: 'kitchen_equipment', labelKey: 'kitchenEquipment', icon: '🍳' },
  { value: 'refrigeration_equipment', labelKey: 'refrigerationEquipment', icon: '❄️' },
  { value: 'cleaning_equipment', labelKey: 'cleaningEquipment', icon: '🧽' },
  { value: 'security_equipment', labelKey: 'securityEquipment', icon: '🛡️' },
  { value: 'camera_cctv', labelKey: 'cameraCctv', icon: '📹' },
  { value: 'tool_kit', labelKey: 'toolKit', icon: '🧰' },
  { value: 'maintenance_kit', labelKey: 'maintenanceKit', icon: '🧰' },
  { value: 'furniture', labelKey: 'furniture', icon: '🪑' },
  { value: 'office_equipment', labelKey: 'officeEquipment', icon: '📎' },
  { value: 'uniform', labelKey: 'uniform', icon: '👕' },
  { value: 'safety_equipment', labelKey: 'safetyEquipment', icon: '🦺' },
  { value: 'medical_equipment', labelKey: 'medicalEquipment', icon: '🏥' },
  { value: 'warehouse_equipment', labelKey: 'warehouseEquipment', icon: '📦' },
  { value: 'construction_equipment', labelKey: 'constructionEquipment', icon: '🏗️' },
  { value: 'software_license', labelKey: 'softwareLicense', icon: '🔑' },
  { value: 'access_card', labelKey: 'accessCard', icon: '💳' },
  { value: 'key_set', labelKey: 'keySet', icon: '🗝️' },
  { value: 'other', labelKey: 'other', icon: '📦' },
] as const;

export type AddNewAssetType = (typeof assetTypeOptions)[number]['value'];
export type AssetTypeOption = (typeof assetTypeOptions)[number];
export type AssetTypeLabelKey = AssetTypeOption['labelKey'];

export const assetTypeOptionByValue = new Map<string, AssetTypeOption>(
  assetTypeOptions.map((option) => [option.value, option]),
);
