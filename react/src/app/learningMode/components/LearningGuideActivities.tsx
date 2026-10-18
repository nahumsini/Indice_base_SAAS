import { useState, type ReactNode } from 'react';
import { useLanguage } from '../../shared/context';
import { Button } from '../../components/ui/button';

const labels = {
  es: ['Ejemplo práctico', 'Herramientas de la pestaña', 'Qué quieres revisar'],
  en: ['Practical example', 'Tab tools', 'What would you like to review'],
  fr: ['Exemple pratique', 'Outils de l’onglet', 'Que souhaitez-vous consulter'],
  pt: ['Exemplo prático', 'Ferramentas da aba', 'O que deseja revisar'],
  ko: ['실습 예시', '탭 도구', '살펴볼 내용'],
  zh: ['练习示例', '选项卡工具', '选择要查看的内容'],
};

export function LearningGuideActivities({ introduction, children }: { introduction?: ReactNode; children: ReactNode }) {
  const { currentLanguage } = useLanguage();
  const [view, setView] = useState<'practice' | 'tools'>('practice');
  if (!introduction) return <>{children}</>;
  const copy = labels[currentLanguage.code.split('-')[0]] ?? labels.en;
  return <>
    <div role="group" aria-label={copy[2]} className="grid min-w-0 grid-cols-2 gap-2 px-3 pt-3 sm:flex sm:flex-wrap">
      {(['practice', 'tools'] as const).map((id, index) => <Button key={id} type="button" size="sm" variant={view === id ? 'secondary' : 'outline'} aria-pressed={view === id} onClick={() => setView(id)} className="h-auto min-h-11 min-w-0 whitespace-normal rounded-xl px-2 py-2 text-center leading-5 sm:min-h-9 sm:rounded-full">{copy[index]}</Button>)}
    </div>
    {view === 'practice' ? <div className="p-3">{introduction}</div> : children}
  </>;
}
