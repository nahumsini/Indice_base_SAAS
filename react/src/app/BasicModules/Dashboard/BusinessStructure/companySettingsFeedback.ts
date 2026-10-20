const es = {
 retry: 'Reintentar', pending: 'Cambios pendientes', saved: 'Cambios guardados', discard: 'Descartar cambios',
 load: 'No pudimos cargar todos los datos. Reintenta antes de editar.', save: 'No se guardaron los cambios. Tus datos siguen aquí; vuelve a intentarlo.',
 permission: 'No tienes permiso para editar la configuración de esta empresa.', changed: 'Cambió la cuenta o empresa activa. Abre de nuevo su configuración.',
 name: 'Escribe un nombre antes de guardar.', longName: 'El nombre de la empresa admite hasta 120 caracteres; las unidades y negocios, hasta 160.',
 logoSize: 'Elige una imagen de 1 MB o menos.', logo: 'Elige una imagen válida JPG, PNG, WebP o SVG simple.',
 coordinates: 'Completa latitud y longitud con valores válidos (−90 a 90 y −180 a 180).', radius: 'El radio debe ser un número entero mayor que cero.',
 organization: 'Revisa los nombres: no repitas unidades ni negocios dentro de una unidad.', address: 'La dirección admite hasta 255 caracteres.',
 busy: 'Termina de cargar la imagen o ubicación antes de guardar.',
};
export type CompanySettingsFeedback = typeof es;
const en: CompanySettingsFeedback = {
 retry: 'Retry', pending: 'Unsaved changes', saved: 'Changes saved', discard: 'Discard changes',
 load: 'We could not load all company data. Retry before editing.', save: 'Changes were not saved. Your entries are still here; please retry.',
 permission: 'You cannot edit settings for this company.', changed: 'The active account or company changed. Reopen its settings.',
 name: 'Enter a name before saving.', longName: 'Company names allow up to 120 characters; units and businesses, up to 160.',
 logoSize: 'Choose an image of 1 MB or less.', logo: 'Choose a valid JPG, PNG, WebP or simple SVG image.',
 coordinates: 'Enter valid latitude and longitude (−90 to 90 and −180 to 180).', radius: 'The radius must be a positive whole number.',
 organization: 'Check names: do not repeat units or businesses within a unit.', address: 'Addresses allow up to 255 characters.', busy: 'Wait for the image or location to finish loading before saving.',
};
const copies: Record<string, CompanySettingsFeedback> = {
 es, en,
 fr: { retry: 'Réessayer', pending: 'Modifications en attente', saved: 'Modifications enregistrées', discard: 'Annuler les modifications', load: 'Impossible de charger toutes les données. Réessayez avant de modifier.', save: 'Enregistrement impossible. Vos données sont conservées ; réessayez.', permission: 'Vous ne pouvez pas modifier cette entreprise.', changed: 'Le compte ou l’entreprise a changé. Rouvrez ses paramètres.', name: 'Saisissez un nom avant d’enregistrer.', longName: 'Maximum : 120 caractères pour l’entreprise, 160 pour les unités et établissements.', logoSize: 'Choisissez une image de 1 Mo maximum.', logo: 'Choisissez une image JPG, PNG, WebP ou SVG simple valide.', coordinates: 'Saisissez une latitude et une longitude valides (−90 à 90 et −180 à 180).', radius: 'Le rayon doit être un entier positif.', organization: 'Vérifiez les noms : pas de doublons dans une même unité.', address: 'L’adresse accepte 255 caractères maximum.', busy: 'Attendez la fin du chargement de l’image ou de la position.' },
 pt: { retry: 'Tentar novamente', pending: 'Alterações pendentes', saved: 'Alterações salvas', discard: 'Descartar alterações', load: 'Não foi possível carregar todos os dados. Tente novamente antes de editar.', save: 'As alterações não foram salvas. Seus dados continuam aqui; tente novamente.', permission: 'Você não pode editar esta empresa.', changed: 'A conta ou empresa ativa mudou. Abra suas configurações novamente.', name: 'Digite um nome antes de salvar.', longName: 'Até 120 caracteres para a empresa; 160 para unidades e negócios.', logoSize: 'Escolha uma imagem de até 1 MB.', logo: 'Escolha uma imagem JPG, PNG, WebP ou SVG simples válida.', coordinates: 'Informe latitude e longitude válidas (−90 a 90 e −180 a 180).', radius: 'O raio deve ser um inteiro positivo.', organization: 'Revise os nomes: não repita unidades nem negócios na mesma unidade.', address: 'O endereço aceita até 255 caracteres.', busy: 'Aguarde o carregamento da imagem ou localização.' },
 ko: { retry: '다시 시도', pending: '저장되지 않은 변경 사항', saved: '저장됨', discard: '변경 사항 취소', load: '회사 정보를 모두 불러오지 못했습니다. 수정하기 전에 다시 시도하세요.', save: '저장하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도하세요.', permission: '이 회사의 설정을 수정할 권한이 없습니다.', changed: '계정 또는 회사가 변경되었습니다. 설정을 다시 여세요.', name: '이름을 입력하세요.', longName: '회사 이름은 120자, 단위와 사업장은 160자까지 가능합니다.', logoSize: '1MB 이하 이미지를 선택하세요.', logo: '올바른 JPG, PNG, WebP 또는 단순 SVG 이미지를 선택하세요.', coordinates: '올바른 위도와 경도를 입력하세요 (−90~90, −180~180).', radius: '반경은 양의 정수여야 합니다.', organization: '같은 단위 안에 중복된 이름이 없는지 확인하세요.', address: '주소는 255자까지 가능합니다.', busy: '이미지 또는 위치를 불러올 때까지 기다리세요.' },
 zh: { retry: '重试', pending: '有未保存的更改', saved: '已保存', discard: '放弃更改', load: '无法加载全部公司资料。请先重试再编辑。', save: '未能保存。已保留输入内容，请重试。', permission: '您无权编辑这家公司的设置。', changed: '当前账户或公司已更改。请重新打开设置。', name: '请先填写名称。', longName: '公司名称最多120个字符，单位和营业场所最多160个字符。', logoSize: '请选择不超过1MB的图片。', logo: '请选择有效的JPG、PNG、WebP或简单SVG图片。', coordinates: '请填写有效的纬度和经度（−90到90，−180到180）。', radius: '半径必须是正整数。', organization: '请检查名称，单位及同一单位内的营业场所不能重名。', address: '地址最多255个字符。', busy: '请等待图片或位置加载完成。' },
};
export const getCompanySettingsFeedback = (language: string) => copies[language.split('-')[0]] ?? en;

export function getCompanyPostalFeedback(language: string, country: string) {
  const messages: Record<string,string> = {
    es: 'Revisa el código postal del país seleccionado.', en: 'Check the postal code for the selected country.',
    fr: 'Vérifiez le code postal du pays sélectionné.', pt: 'Confira o código postal do país selecionado.',
    ko: '선택한 국가의 우편번호를 확인하세요.', zh: '请检查所选国家的邮政编码。',
  };
  const formats: Record<string,string> = { MX: '01000', US: '10001', CA: 'M5V 2T6', CO: '110111', BR: '01001-000' };
  return `${messages[language.split('-')[0]] ?? messages.en}${formats[country] ? ` (${formats[country]})` : ''}`;
}
