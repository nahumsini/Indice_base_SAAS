const messages={
 access:['Quién tiene acceso','Who has access','Qui a accès','Quem tem acesso','액세스 권한이 있는 사람','谁有访问权限'],
 you:['Tú','You','Vous','Você','나','你'],
 owner:['Propietario del proyecto','Project owner','Propriétaire du projet','Proprietário do projeto','프로젝트 소유자','项目所有者'],
 private:['Solo tú puedes consultar este proyecto. Agrega empleados para compartirlo.','Only you can view this project. Add employees to share it.','Vous seul pouvez consulter ce projet. Ajoutez des employés pour le partager.','Só você pode consultar este projeto. Adicione funcionários para compartilhá-lo.','나만 이 프로젝트를 볼 수 있습니다. 직원을 추가하여 공유하세요.','只有你可以查看此项目。添加员工即可共享。'],
 addEmployees:['Agregar empleados','Add employees','Ajouter des employés','Adicionar funcionários','직원 추가','添加员工'],
 searchPlaceholder:['Nombre del empleado','Employee name','Nom de l’employé','Nome do funcionário','직원 이름','员工姓名'],
 searchHelp:['Busca por nombre. Solo aparecen empleados de tu empresa con acceso a Pizarra.','Search by name. Only employees in your company with access to Ideas Board appear.','Recherchez par nom. Seuls les employés de votre entreprise ayant accès au tableau apparaissent.','Busque pelo nome. Aparecem apenas funcionários da sua empresa com acesso ao quadro.','이름으로 검색하세요. 회사에서 보드에 액세스할 수 있는 직원만 표시됩니다.','按姓名搜索。仅显示公司内有画板访问权限的员工。'],
 clearSearch:['Limpiar búsqueda','Clear search','Effacer la recherche','Limpar busca','검색 지우기','清除搜索'],
 noResults:['No encontramos empleados con ese nombre.','No employees found with that name.','Aucun employé trouvé avec ce nom.','Nenhum funcionário encontrado com esse nome.','해당 이름의 직원을 찾지 못했습니다.','未找到该姓名的员工。'],
 noCandidates:['No hay más empleados disponibles. Puedes buscar por nombre.','No more employees available. You can search by name.','Aucun autre employé disponible. Vous pouvez rechercher par nom.','Não há mais funcionários disponíveis. Você pode buscar pelo nome.','추가할 직원이 없습니다. 이름으로 검색할 수 있습니다.','没有更多可添加的员工。你可以按姓名搜索。'],
 add:['Agregar','Add','Ajouter','Adicionar','추가','添加'],
 addLabel:['Agregar a {name}','Add {name}','Ajouter {name}','Adicionar {name}','{name} 추가','添加{name}'],
 remove:['Quitar','Remove','Retirer','Remover','제거','移除'],
 removeLabel:['Quitar acceso a {name}','Remove access for {name}','Retirer l’accès à {name}','Remover acesso de {name}','{name}의 액세스 제거','移除{name}的访问权限'],
 undo:['Deshacer','Undo','Annuler','Desfazer','실행 취소','撤销'],
 undoLabel:['Deshacer cambio de acceso de {name}','Undo access change for {name}','Annuler le changement d’accès de {name}','Desfazer alteração de acesso de {name}','{name}의 액세스 변경 취소','撤销{name}的访问权限更改'],
 pendingAdd:['Tendrá acceso al guardar','Will have access when saved','Aura accès après l’enregistrement','Terá acesso ao salvar','저장하면 액세스할 수 있습니다','保存后将有访问权限'],
 pendingRemove:['Se quitará el acceso al guardar','Access will be removed when saved','L’accès sera retiré après l’enregistrement','O acesso será removido ao salvar','저장하면 액세스가 제거됩니다','保存后将移除访问权限'],
 pending:['Cambios por guardar: {count}','Unsaved changes: {count}','Modifications à enregistrer : {count}','Alterações para salvar: {count}','저장하지 않은 변경: {count}','待保存更改：{count}'],
 noChanges:['Los cambios se aplican al guardar.','Changes apply when saved.','Les changements s’appliquent à l’enregistrement.','As alterações são aplicadas ao salvar.','저장하면 변경 사항이 적용됩니다.','更改将在保存后生效。'],
 saving:['Guardando…','Saving…','Enregistrement…','Salvando…','저장 중…','正在保存…'],
 retrySave:['Reintentar guardado','Retry saving','Réessayer l’enregistrement','Tentar salvar novamente','저장 재시도','重试保存'],
 searchError:['No pudimos buscar empleados. Tu selección sigue guardada en este formulario.','We couldn’t search employees. Your selection is still in this form.','Impossible de rechercher les employés. Votre sélection reste dans ce formulaire.','Não foi possível buscar funcionários. Sua seleção continua neste formulário.','직원을 검색하지 못했습니다. 선택한 직원은 이 양식에 유지됩니다.','无法搜索员工。你的选择仍保留在此表单中。'],
 conflict:['Los accesos cambiaron en otra ventana. Actualízalos para revisar quién tiene acceso antes de guardar.','Access changed in another window. Refresh to review who has access before saving.','Les accès ont changé dans une autre fenêtre. Actualisez pour les vérifier avant d’enregistrer.','Os acessos mudaram em outra janela. Atualize para revisá-los antes de salvar.','다른 창에서 액세스가 변경되었습니다. 저장하기 전에 새로 고침하여 확인하세요.','访问权限已在另一窗口更改。请刷新查看后再保存。'],
 reloadAccess:['Actualizar accesos','Refresh access','Actualiser les accès','Atualizar acessos','액세스 새로 고침','刷新访问权限'],
} as const;
export function projectSharingCopy(locale:string){
 const index=({es:0,en:1,fr:2,pt:3,ko:4,zh:5} as Record<string,number>)[locale.split('-')[0]]??1;
 return Object.fromEntries(Object.entries(messages).map(([key,values])=>[key,values[index]])) as {[K in keyof typeof messages]:string};
}
