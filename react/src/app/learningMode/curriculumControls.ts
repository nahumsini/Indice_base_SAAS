import { chapterFor, learningText, learningGuideModules } from './curriculum';
import type { LearningModeControl } from './types';
export function curriculumControls(guideId: string, tab: string | undefined, locale: string) {
    const chapter = tab ? chapterFor(learningGuideModules[guideId], tab) : undefined;
    if (!chapter || !chapter.companion)
        return [];
    const english = !locale.toLowerCase().startsWith('es');
    return chapter.steps.map((step, index): LearningModeControl => ({
        id: `${chapter.id}.${['prepare', 'operate', 'verify'][index]}`, emoji: ['🧭', '🛠️', '✅'][index],
        kind: english ? 'Business workflow' : 'Flujo operativo', title: english ? ['Before starting', 'Perform the operation', 'Verify the result'][index] : ['Antes de empezar', 'Realiza la operación', 'Comprueba el resultado'][index],
        purpose: learningText(step, locale), behavior: learningText(step, locale), whenToUse: learningText(chapter.label, locale),
        result: learningText(chapter.steps[2], locale),
        tipByCharacter: { emily: english ? 'Review the same workflow in each branch.' : 'Revisa el mismo flujo en cada sucursal.',
            juanito: english ? 'Use a responsible person, date and verifiable record.' : 'Usa un responsable, una fecha y un registro verificable.',
            camila: english ? 'Keep responsibility and agreements visible to the team.' : 'Deja responsabilidad y acuerdos visibles para el equipo.' },
        storyByCharacter: { emily: english ? `Emily reviews ${learningText(chapter.label, locale)} across her Canadian cafés using the same checklist.` : `Emily revisa ${learningText(chapter.label, locale)} en sus cafeterías de Canadá con la misma lista de comprobación.`,
            juanito: english ? `Juanito verifies ${learningText(chapter.label, locale)} with records from his Mexican supermarket before comparing results.` : `Juanito verifica ${learningText(chapter.label, locale)} con registros de su supermercado en México antes de comparar resultados.`,
            camila: english ? `Camila records ${learningText(chapter.label, locale)} in her Colombian parts business so the family team can continue the work.` : `Camila registra ${learningText(chapter.label, locale)} en su negocio de autopartes en Colombia para que el equipo familiar pueda continuar el trabajo.` },
    }));
}
