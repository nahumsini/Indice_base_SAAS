const messages={
 intro:['Muestra cómo estaba y cómo quedó.','Show how it looked before and after.','Montrez la situation avant et après.','Mostre como estava e como ficou.','개선 전후의 모습을 보여주세요.','展示改进前后的情况。'],
 beforeHelp:['Antes de hacer la mejora','Before the improvement','Avant l’amélioration','Antes da melhoria','개선하기 전','改进之前'],
 afterHelp:['Después de hacer la mejora','After the improvement','Après l’amélioration','Depois da melhoria','개선한 후','改进之后'],
 choose:['Agregar foto','Add photo','Ajouter une photo','Adicionar foto','사진 추가','添加照片'],
 replace:['Cambiar foto','Change photo','Changer la photo','Trocar foto','사진 변경','更换照片'],
 remove:['Quitar foto','Remove photo','Retirer la photo','Remover foto','사진 제거','移除照片'],
 drop:['Arrastra una foto aquí o elígela de tu dispositivo.','Drop a photo here or choose one from your device.','Déposez une photo ici ou choisissez-la sur votre appareil.','Arraste uma foto aqui ou escolha no seu dispositivo.','사진을 여기에 놓거나 기기에서 선택하세요.','将照片拖到这里，或从设备选择。'],
 mobileChoose:['Elige una foto de tu dispositivo.','Choose a photo from your device.','Choisissez une photo sur votre appareil.','Escolha uma foto no seu dispositivo.','기기에서 사진을 선택하세요.','从设备中选择照片。'],
 dropReady:['Suelta la foto para subirla','Drop the photo to upload','Déposez la photo pour l’envoyer','Solte a foto para enviar','사진을 놓아 업로드하세요','松开以上传照片'],
 missing:['Sin foto por ahora','No photo yet','Pas encore de photo','Ainda sem foto','아직 사진 없음','暂无照片'],
 ready:['Foto agregada','Photo added','Photo ajoutée','Foto adicionada','사진 추가됨','已添加照片'],
 compare:['Comparar fotos','Compare photos','Comparer les photos','Comparar fotos','사진 비교','对比照片'],
 compareHelp:['Míralas juntas o elige una para verla más grande.','View them together or choose one for a larger view.','Affichez-les ensemble ou agrandissez une photo.','Veja juntas ou escolha uma para ampliar.','나란히 비교하거나 하나를 선택해 크게 보세요.','并排对比，或选择一张放大查看。'],
 together:['Juntas','Together','Ensemble','Juntas','나란히','并排'],
 view:['Vista de las fotos','Photo view','Affichage des photos','Visualização das fotos','사진 보기','照片视图'],
 back:['Volver a las fotos','Back to photos','Retour aux photos','Voltar às fotos','사진 관리로 돌아가기','返回照片'],
 enlarge:['Ampliar foto','Enlarge photo','Agrandir la photo','Ampliar foto','사진 확대','放大照片'],
 oneFile:['Elige una sola foto para cada espacio.','Choose one photo for each slot.','Choisissez une seule photo par emplacement.','Escolha uma foto para cada espaço.','각 칸에 사진 한 장을 선택하세요.','每个位置请选择一张照片。'],
 imageError:['No pudimos mostrar esta foto.','Could not display this photo.','Impossible d’afficher cette photo.','Não foi possível mostrar esta foto.','사진을 표시하지 못했습니다.','无法显示此照片。'],
 reload:['Volver a cargar foto','Reload photo','Recharger la photo','Recarregar foto','사진 다시 불러오기','重新加载照片'],
 savedOnAction:['Las fotos se conservan al guardar la acción.','Photos are kept when you save the action.','Les photos sont conservées en enregistrant l’action.','As fotos são mantidas ao salvar a ação.','작업을 저장하면 사진이 유지됩니다.','保存行动后保留照片。'],
} as const;
export function fiveSEvidenceCopy(locale:string){
 const index=({es:0,en:1,fr:2,pt:3,ko:4,zh:5} as Record<string,number>)[locale.split('-')[0]]??1;
 return Object.fromEntries(Object.entries(messages).map(([key,values])=>[key,values[index]])) as {[K in keyof typeof messages]:string};
}
