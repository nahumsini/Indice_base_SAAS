const en = {
  logo: 'Business logo', upload: 'Add logo', replace: 'Change logo', remove: 'Remove logo',
  logoHint: 'PNG, JPG or WebP · up to 1 MB. We will adjust it to fit your agenda.',
  invalidLogo: 'Choose a valid PNG, JPG or WebP image.', largeLogo: 'Choose an image of 1 MB or less.', preparing: 'Preparing your logo…',
  confirmationHint: 'We will review your request to confirm the appointment.',
};
export type PublicAgendaBrandCopy = {[K in keyof typeof en]:string};
const es:PublicAgendaBrandCopy = {
  logo:'Logo de tu negocio',upload:'Agregar logo',replace:'Cambiar logo',remove:'Quitar logo',
  logoHint:'PNG, JPG o WebP · hasta 1 MB. Lo ajustaremos al espacio de tu agenda.',
  invalidLogo:'Elige una imagen PNG, JPG o WebP válida.',largeLogo:'Elige una imagen de 1 MB o menos.',preparing:'Preparando tu logo…',
  confirmationHint:'Revisaremos tu solicitud para confirmar la cita.',
};
const fr:PublicAgendaBrandCopy = {
  logo:'Logo de votre entreprise',upload:'Ajouter un logo',replace:'Changer le logo',remove:'Retirer le logo',
  logoHint:'PNG, JPG ou WebP · 1 Mo maximum. Nous adapterons le logo à votre agenda.',
  invalidLogo:'Choisissez une image PNG, JPG ou WebP valide.',largeLogo:'Choisissez une image de 1 Mo ou moins.',preparing:'Préparation du logo…',
  confirmationHint:'Nous examinerons votre demande pour confirmer le rendez-vous.',
};
const pt:PublicAgendaBrandCopy = {
  logo:'Logo do seu negócio',upload:'Adicionar logo',replace:'Alterar logo',remove:'Remover logo',
  logoHint:'PNG, JPG ou WebP · até 1 MB. Ajustaremos o logo ao espaço da agenda.',
  invalidLogo:'Escolha uma imagem PNG, JPG ou WebP válida.',largeLogo:'Escolha uma imagem de até 1 MB.',preparing:'Preparando seu logo…',
  confirmationHint:'Analisaremos sua solicitação para confirmar o agendamento.',
};
const ko:PublicAgendaBrandCopy = {
  logo:'업체 로고',upload:'로고 추가',replace:'로고 변경',remove:'로고 삭제',
  logoHint:'PNG, JPG 또는 WebP · 최대 1MB. 일정 페이지에 맞게 조정합니다.',
  invalidLogo:'올바른 PNG, JPG 또는 WebP 이미지를 선택하세요.',largeLogo:'1MB 이하의 이미지를 선택하세요.',preparing:'로고 준비 중…',
  confirmationHint:'요청을 검토한 후 예약을 확정합니다.',
};
const zh:PublicAgendaBrandCopy = {
  logo:'商家标志',upload:'添加标志',replace:'更换标志',remove:'移除标志',
  logoHint:'PNG、JPG 或 WebP · 最大 1MB。我们会调整图片以适合预约页面。',
  invalidLogo:'请选择有效的 PNG、JPG 或 WebP 图片。',largeLogo:'请选择不超过 1MB 的图片。',preparing:'正在处理标志…',
  confirmationHint:'我们将审核您的请求以确认预约。',
};
const copies:Record<string,PublicAgendaBrandCopy>={'en-CA':en,'en-US':en,'es-MX':es,'es-CO':es,'fr-CA':fr,'pt-BR':pt,'ko-CA':ko,'zh-CA':zh};
export const getPublicAgendaBrandCopy=(locale:string)=>copies[locale]??en;
