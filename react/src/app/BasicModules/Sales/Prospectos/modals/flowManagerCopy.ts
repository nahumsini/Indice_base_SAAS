const en = {
 title:'Sales flows', description:'Organize your sales stages and choose the flow you want to view.',
 viewing:'Viewing now', duplicate:'Duplicate', copyName:'Copy of {name}', deleteFlow:'Delete flow',
 team:'Team stages', myColors:'My colors', teamHint:'Names, order and probabilities are shared with your company.',
 personalHint:'These colors are only for you. Your team’s settings stay the same.',
 palette:'Color on my board', colorHex:'Color code', customColor:'Custom color', resetColors:'Restore original colors',
 saveColors:'Save my colors', colorsSaved:'Your colors have been saved.', loadColorsError:'Could not load your colors. Try again before editing.',
 unsavedTitle:'Discard unsaved changes?', unsavedHint:'Your changes have not been saved yet.', discard:'Discard changes', keep:'Keep editing',
 preview:'Board preview', previewCard:'Your opportunities appear here', factoryName:'Factory flow',
 factoryHint:'This flow is protected. Create a copy to change its stages, or personalize your own colors.',
 createCopy:'Create a copy to customize', readOnly:'Protected settings', probabilityHint:'Suggested likelihood of closing when an opportunity reaches this stage.',
 deleteTitle:'Delete {name}', deleteHint:'Keep your opportunities and their history when removing this flow from the list.',
 destination:'Move opportunities to', mapping:'Choose the destination stages',
 mappingHint:'Open opportunities move to the stage you choose, using its suggested probability.',
 preserveTerminal:'Won and Lost keep their status and move to the matching destination stages.',
 confirmDelete:'Delete flow', deleteEmpty:'This flow has no opportunities. Its history will be retained.',
 deletePopulated:'{count} opportunities will move to {name}.', review:'Review and confirm', back:'Back',
 deleteError:'Could not delete this flow. Your choices have been kept.', deleteChanged:'This flow changed. Refresh the review before confirming.',
 deletePending:'We could not confirm the result. Retry with the same choices to check it safely.',
 deleteLimit:'This flow has more than 5,000 opportunities. Move some of them before deleting it.',
 loading:'Preparing the review…', saveError:'Could not save. Your changes are still here.',
};
type Copy = typeof en;
const es: Copy = {
 title:'Flujos de venta',description:'Organiza tus etapas de venta y elige el flujo que quieres consultar.',
 viewing:'Viendo actualmente',duplicate:'Duplicar',copyName:'Copia de {name}',deleteFlow:'Eliminar flujo',
 team:'Etapas del equipo',myColors:'Mis colores',teamHint:'El nombre, el orden y las probabilidades se comparten con tu empresa.',
 personalHint:'Estos colores son solo para ti. La configuración de tu equipo se conserva.',
 palette:'Color en mi tablero',colorHex:'Código de color',customColor:'Color personalizado',resetColors:'Restaurar colores originales',
 saveColors:'Guardar mis colores',colorsSaved:'Tus colores quedaron guardados.',loadColorsError:'No pudimos cargar tus colores. Vuelve a intentarlo antes de editarlos.',
 unsavedTitle:'¿Descartar cambios sin guardar?',unsavedHint:'Tus cambios aún no se han guardado.',discard:'Descartar cambios',keep:'Seguir editando',
 preview:'Así se verá tu tablero',previewCard:'Aquí aparecen tus oportunidades',factoryName:'Flujo de fábrica',
 factoryHint:'Este flujo está protegido. Crea una copia para cambiar sus etapas o personaliza tus propios colores.',
 createCopy:'Crear una copia para personalizar',readOnly:'Configuración protegida',probabilityHint:'Posibilidad de cierre sugerida cuando una oportunidad llega a esta etapa.',
 deleteTitle:'Eliminar {name}',deleteHint:'Retira este flujo de la lista conservando tus oportunidades y su historial.',
 destination:'Mover las oportunidades a',mapping:'Elige las etapas de destino',
 mappingHint:'Las oportunidades abiertas pasan a la etapa que elijas y toman su probabilidad sugerida.',
 preserveTerminal:'Ganada y Perdida conservan su estado y pasan a las etapas equivalentes del destino.',
 confirmDelete:'Eliminar flujo',deleteEmpty:'Este flujo no tiene oportunidades. Su historial se conservará.',
 deletePopulated:'Se moverán {count} oportunidades a {name}.',review:'Revisar y confirmar',back:'Volver',
 deleteError:'No pudimos eliminar el flujo. Conservamos tus elecciones.',deleteChanged:'El flujo cambió. Actualiza la revisión antes de confirmar.',
 deletePending:'No pudimos confirmar el resultado. Reintenta con estas mismas elecciones para comprobarlo.',
 deleteLimit:'Este flujo tiene más de 5,000 oportunidades. Mueve algunas antes de eliminarlo.',
 loading:'Preparando la revisión…',saveError:'No pudimos guardar. Tus cambios siguen aquí.',
};
const fr: Copy = {
 title:'Parcours de vente',description:'Organisez vos étapes et choisissez le parcours à consulter.',viewing:'Affichage actuel',duplicate:'Dupliquer',copyName:'Copie de {name}',deleteFlow:'Supprimer le parcours',team:'Étapes de l’équipe',myColors:'Mes couleurs',teamHint:'Le nom, l’ordre et les probabilités sont partagés avec votre entreprise.',personalHint:'Ces couleurs sont personnelles. Les réglages de l’équipe sont conservés.',palette:'Couleur de mon tableau',colorHex:'Code de couleur',customColor:'Couleur personnalisée',resetColors:'Rétablir les couleurs originales',saveColors:'Enregistrer mes couleurs',colorsSaved:'Vos couleurs sont enregistrées.',loadColorsError:'Impossible de charger vos couleurs. Réessayez avant de les modifier.',unsavedTitle:'Abandonner les modifications?',unsavedHint:'Vos modifications ne sont pas enregistrées.',discard:'Abandonner',keep:'Continuer',preview:'Aperçu du tableau',previewCard:'Vos occasions apparaissent ici',factoryName:'Parcours d’origine',factoryHint:'Ce parcours est protégé. Créez une copie pour modifier ses étapes ou personnalisez vos couleurs.',createCopy:'Créer une copie à personnaliser',readOnly:'Réglages protégés',probabilityHint:'Probabilité de conclure suggérée à cette étape.',deleteTitle:'Supprimer {name}',deleteHint:'Retirez ce parcours de la liste en conservant vos occasions et leur historique.',destination:'Déplacer les occasions vers',mapping:'Choisir les étapes de destination',mappingHint:'Les occasions ouvertes passent à l’étape choisie et prennent sa probabilité suggérée.',preserveTerminal:'Gagnée et Perdue conservent leur état dans les étapes équivalentes.',confirmDelete:'Supprimer le parcours',deleteEmpty:'Ce parcours ne contient aucune occasion. Son historique sera conservé.',deletePopulated:'{count} occasions seront déplacées vers {name}.',review:'Vérifier et confirmer',back:'Retour',deleteError:'Impossible de supprimer. Vos choix sont conservés.',deleteChanged:'Le parcours a changé. Actualisez la vérification.',deletePending:'Résultat non confirmé. Réessayez avec les mêmes choix.',deleteLimit:'Ce parcours contient plus de 5 000 occasions. Déplacez-en avant de le supprimer.',loading:'Préparation de la vérification…',saveError:'Impossible d’enregistrer. Vos modifications sont conservées.',
};
const pt: Copy = {
 title:'Fluxos de vendas',description:'Organize as etapas e escolha o fluxo que deseja consultar.',viewing:'Visualizando agora',duplicate:'Duplicar',copyName:'Cópia de {name}',deleteFlow:'Excluir fluxo',team:'Etapas da equipe',myColors:'Minhas cores',teamHint:'Nome, ordem e probabilidades são compartilhados com sua empresa.',personalHint:'Estas cores são apenas suas. A configuração da equipe é mantida.',palette:'Cor no meu quadro',colorHex:'Código da cor',customColor:'Cor personalizada',resetColors:'Restaurar cores originais',saveColors:'Salvar minhas cores',colorsSaved:'Suas cores foram salvas.',loadColorsError:'Não foi possível carregar as cores. Tente novamente antes de editar.',unsavedTitle:'Descartar alterações?',unsavedHint:'Suas alterações ainda não foram salvas.',discard:'Descartar',keep:'Continuar editando',preview:'Prévia do quadro',previewCard:'Suas oportunidades aparecem aqui',factoryName:'Fluxo de fábrica',factoryHint:'Este fluxo está protegido. Crie uma cópia para alterar as etapas ou personalize suas cores.',createCopy:'Criar uma cópia para personalizar',readOnly:'Configuração protegida',probabilityHint:'Probabilidade sugerida de fechamento nesta etapa.',deleteTitle:'Excluir {name}',deleteHint:'Retire este fluxo da lista mantendo suas oportunidades e o histórico.',destination:'Mover oportunidades para',mapping:'Escolha as etapas de destino',mappingHint:'Oportunidades abertas passam à etapa escolhida e usam sua probabilidade sugerida.',preserveTerminal:'Ganha e Perdida mantêm o estado nas etapas equivalentes.',confirmDelete:'Excluir fluxo',deleteEmpty:'Este fluxo não tem oportunidades. O histórico será mantido.',deletePopulated:'{count} oportunidades serão movidas para {name}.',review:'Revisar e confirmar',back:'Voltar',deleteError:'Não foi possível excluir. Suas escolhas foram mantidas.',deleteChanged:'O fluxo mudou. Atualize a revisão.',deletePending:'Não confirmamos o resultado. Tente novamente com as mesmas escolhas.',deleteLimit:'Este fluxo tem mais de 5.000 oportunidades. Mova algumas antes de excluí-lo.',loading:'Preparando a revisão…',saveError:'Não foi possível salvar. Suas alterações foram mantidas.',
};
const ko: Copy = {
 title:'판매 흐름',description:'판매 단계를 정리하고 조회할 흐름을 선택하세요.',viewing:'현재 조회 중',duplicate:'복제',copyName:'{name} 사본',deleteFlow:'흐름 삭제',team:'팀 단계',myColors:'내 색상',teamHint:'이름, 순서, 확률은 회사와 공유됩니다.',personalHint:'이 색상은 나에게만 적용됩니다. 팀 설정은 유지됩니다.',palette:'내 보드의 색상',colorHex:'색상 코드',customColor:'사용자 지정 색상',resetColors:'원래 색상 복원',saveColors:'내 색상 저장',colorsSaved:'색상을 저장했습니다.',loadColorsError:'색상을 불러오지 못했습니다. 다시 시도하세요.',unsavedTitle:'변경 사항을 버릴까요?',unsavedHint:'아직 저장되지 않았습니다.',discard:'변경 사항 버리기',keep:'계속 편집',preview:'보드 미리 보기',previewCard:'기회가 여기에 표시됩니다',factoryName:'기본 흐름',factoryHint:'보호된 흐름입니다. 사본을 만들어 단계를 편집하거나 내 색상을 설정하세요.',createCopy:'사용자 지정을 위한 사본 만들기',readOnly:'보호된 설정',probabilityHint:'이 단계에서 제안하는 성사 확률입니다.',deleteTitle:'{name} 삭제',deleteHint:'기회와 기록을 보존하고 목록에서 흐름을 제거합니다.',destination:'기회를 이동할 대상',mapping:'대상 단계 선택',mappingHint:'진행 중인 기회는 선택한 단계와 권장 확률로 이동합니다.',preserveTerminal:'성사 및 실패 상태는 해당 대상 단계에 유지됩니다.',confirmDelete:'흐름 삭제',deleteEmpty:'기회가 없는 흐름입니다. 기록은 유지됩니다.',deletePopulated:'기회 {count}개를 {name}(으)로 이동합니다.',review:'검토 및 확인',back:'뒤로',deleteError:'삭제하지 못했습니다. 선택 사항은 유지됩니다.',deleteChanged:'흐름이 변경되었습니다. 검토를 새로 고치세요.',deletePending:'결과를 확인하지 못했습니다. 같은 선택으로 다시 시도하세요.',deleteLimit:'기회가 5,000개를 초과합니다. 일부를 이동한 후 삭제하세요.',loading:'검토 준비 중…',saveError:'저장하지 못했습니다. 변경 사항은 유지됩니다.',
};
const zh: Copy = {
 title:'销售流程',description:'整理销售阶段并选择要查看的流程。',viewing:'当前查看',duplicate:'复制',copyName:'{name}的副本',deleteFlow:'删除流程',team:'团队阶段',myColors:'我的颜色',teamHint:'名称、顺序和概率与公司共享。',personalHint:'这些颜色仅对您生效，团队设置保持不变。',palette:'我的看板颜色',colorHex:'颜色代码',customColor:'自定义颜色',resetColors:'恢复原始颜色',saveColors:'保存我的颜色',colorsSaved:'颜色已保存。',loadColorsError:'无法加载颜色，请重试后再编辑。',unsavedTitle:'放弃未保存的更改？',unsavedHint:'您的更改尚未保存。',discard:'放弃更改',keep:'继续编辑',preview:'看板预览',previewCard:'您的商机显示在这里',factoryName:'出厂流程',factoryHint:'此流程受保护。创建副本以更改阶段，或自定义您的颜色。',createCopy:'创建副本进行自定义',readOnly:'受保护的设置',probabilityHint:'商机到达此阶段时的建议成交概率。',deleteTitle:'删除{name}',deleteHint:'保留商机及历史，并从列表中移除此流程。',destination:'将商机移至',mapping:'选择目标阶段',mappingHint:'未结束的商机将移至所选阶段并采用其建议概率。',preserveTerminal:'已赢得和已失去的商机保留状态，移至对应阶段。',confirmDelete:'删除流程',deleteEmpty:'此流程没有商机，其历史将保留。',deletePopulated:'将{count}个商机移至{name}。',review:'检查并确认',back:'返回',deleteError:'无法删除，已保留您的选择。',deleteChanged:'流程已更改，请刷新检查。',deletePending:'无法确认结果，请使用相同选择重试。',deleteLimit:'此流程超过5,000个商机，请先移动部分商机。',loading:'正在准备检查…',saveError:'无法保存，您的更改仍然保留。',
};
export type FlowManagerCopy=Copy;
export const flowManagerCopy=(locale:string):Copy=>({en,es,fr,pt,ko,zh} as Record<string,Copy>)[locale.split('-')[0]]??en;
export const flowText=(template:string,values:Record<string,string|number>)=>template.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]??''));
