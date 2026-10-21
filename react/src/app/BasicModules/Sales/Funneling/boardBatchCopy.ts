const messages={
 es:{title:'Captura rápida',hint:'Agrega hasta 3 elementos. Ponles nombre y revisa los detalles de cada uno.',add:'Agregar otro',name:'Nombre del elemento',details:'Ver detalles',remove:'Quitar de la tanda',save:'Guardar {n} elementos',unnamed:'Sin nombre',required:'Completa los nombres y los pasos pendientes antes de guardar.'},
 en:{title:'Quick capture',hint:'Add up to 3 elements. Name them and review each one’s details.',add:'Add another',name:'Element name',details:'View details',remove:'Remove from batch',save:'Save {n} elements',unnamed:'Unnamed',required:'Complete the names and any unfinished steps before saving.'},
 fr:{title:'Saisie rapide',hint:'Ajoutez jusqu’à 3 éléments. Nommez-les et vérifiez leurs détails.',add:'Ajouter un autre',name:'Nom de l’élément',details:'Voir les détails',remove:'Retirer du lot',save:'Enregistrer {n} éléments',unnamed:'Sans nom',required:'Complétez les noms et les étapes inachevées avant d’enregistrer.'},
 pt:{title:'Cadastro rápido',hint:'Adicione até 3 elementos. Dê nomes e revise os detalhes de cada um.',add:'Adicionar outro',name:'Nome do elemento',details:'Ver detalhes',remove:'Remover do lote',save:'Salvar {n} elementos',unnamed:'Sem nome',required:'Complete os nomes e os passos pendentes antes de salvar.'},
 ko:{title:'빠른 입력',hint:'최대 3개의 요소를 추가하고 이름과 세부 사항을 확인하세요.',add:'하나 더 추가',name:'요소 이름',details:'세부 정보 보기',remove:'일괄 입력에서 삭제',save:'요소 {n}개 저장',unnamed:'이름 없음',required:'저장하기 전에 이름과 미완료 단계를 입력하세요.'},
 zh:{title:'快速录入',hint:'最多添加3个元素，填写名称并检查各项详情。',add:'再添加一个',name:'元素名称',details:'查看详情',remove:'从本批次移除',save:'保存{n}个元素',unnamed:'未命名',required:'保存前请填写名称及未完成的步骤。'},
} as const;
export const boardBatchCopy=(locale:string)=>messages[locale.split('-')[0] as keyof typeof messages]??messages.es;
