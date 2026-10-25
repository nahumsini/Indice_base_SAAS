const messages={
 details:['Detalles','Details','Détails','Detalhes','세부 정보','详情'],
 optional:['Opcional','Optional','Facultatif','Opcional','선택 사항','可选'],
 type:['Tipo de persona','Person type','Type de personne','Tipo de pessoa','사람 유형','人员类型'],
 configuring:['Ajustando: {name}','Adjusting: {name}','Réglages : {name}','Ajustando: {name}','설정: {name}','正在设置：{name}'],
 photoHint:['Foto opcional','Optional photo','Photo facultative','Foto opcional','선택 사진','可选照片'],
 stepsHint:['Pasos y más opciones','Steps and more options','Étapes et autres options','Passos e mais opções','단계 및 추가 옵션','步骤与更多选项'],
 typesHint:['Más opciones de tipo','More type options','Autres options de type','Mais opções de tipo','추가 유형 옵션','更多类型选项'],
 pending:['Hay pasos sin completar','Some steps are incomplete','Certaines étapes sont incomplètes','Há passos incompletos','완료되지 않은 단계가 있습니다','有未完成的步骤'],
 stepCount:['1 paso','1 step','1 étape','1 passo','1단계','1个步骤'],
 stepsCount:['{n} pasos','{n} steps','{n} étapes','{n} passos','{n}단계','{n}个步骤'],
 photoAdded:['Con foto','Photo added','Avec photo','Com foto','사진 있음','已添加照片'],
} as const;
export function boardElementFormCopy(locale:string){const index=({es:0,en:1,fr:2,pt:3,ko:4,zh:5} as Record<string,number>)[locale.split('-')[0]]??1;return Object.fromEntries(Object.entries(messages).map(([key,values])=>[key,values[index]])) as {[K in keyof typeof messages]:string};}
