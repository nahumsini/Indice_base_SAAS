import { useLanguage } from '../../shared/context';

const en = {
  title: 'Complete template fields',
  hint: 'These values apply to this message and all its recipients. Your shared template stays unchanged.',
  apply: 'Apply values',
};
const es: typeof en = {
  title: 'Completa los datos de la plantilla',
  hint: 'Se usarán en este correo para todos sus destinatarios. La plantilla original se conserva.',
  apply: 'Aplicar datos',
};
const fr: typeof en = { title: 'Complétez les champs du modèle', hint: 'Ces valeurs s’appliquent à ce message et à tous ses destinataires. Le modèle partagé est conservé.', apply: 'Appliquer les valeurs' };
const pt: typeof en = { title: 'Preencha os campos do modelo', hint: 'Os valores se aplicam a esta mensagem e a todos os destinatários. O modelo compartilhado é preservado.', apply: 'Aplicar dados' };
const ko: typeof en = { title: '템플릿 항목을 완성하세요', hint: '입력한 값은 이 메시지와 모든 수신자에게 적용됩니다. 공유 템플릿은 유지됩니다.', apply: '값 적용' };
const zh: typeof en = { title: '填写模板字段', hint: '这些值适用于此邮件及其所有收件人。共享模板保持不变。', apply: '应用内容' };

export function useMailTemplateVariablesCopy() {
  const { currentLanguage } = useLanguage();
  return ({ en, es, fr, pt, ko, zh }[currentLanguage.code.slice(0, 2)] ?? en) as typeof en;
}
