const en = {
 company: 'Company', actor: 'Current administrator', assigned: 'Already assigned', unassigned: 'Not assigned',
 enabled: 'Enabled', disabled: 'Disabled', assignable: 'Can assign', restricted: 'Cannot assign', unknown: 'Unknown',
 retained: 'This assignment is preserved. It does not override company availability or tab permissions.',
 ineffective: 'This assignment is preserved but does not currently provide access because the company has not enabled this module.',
 removed: 'Will be removed when saved', retry: 'Reload catalogue', effectiveRole: 'Effective role in this company',
 unknownReason: 'Catalogue data is incomplete. Reload it; the existing assignment will be preserved.',
 entitlementReason: 'The company does not have an active entitlement for this module.',
 lifecycleReason: 'New assignments are disabled or the module is not in an available lifecycle.',
 actorReason: 'Your current company role and access do not allow delegating this module.',
 errors: {
  user_modules_required: 'Choose at least one module. An existing assignment that must be preserved also counts.',
  user_module_unknown: 'Module data is incomplete or changed. Reload the catalogue and review your selection.',
  user_module_not_enabled: 'A newly selected module is not enabled for this company. Remove the new selection or ask an authorized administrator to review availability.',
  user_module_not_assignable: 'Your current access or the module’s current state does not allow this assignment. Review the catalogue and administrator scope.',
  user_tab_permissions_required: 'Tab permissions are missing. Reload their catalogue and review the selected modules.',
  user_tab_permission_unknown: 'A tab permission is no longer in the catalogue. Reload it and review your changes.',
  user_tab_permission_module: 'A selected tab belongs to a module that is not assigned. Review the module and its tabs.',
  user_tab_permission_role: 'The selected role cannot receive one of these tabs. Review the role and tab permissions.',
  user_tab_permission_not_assignable: 'You cannot delegate one of the selected tabs with your current access. Review the tab permissions.',
 },
};
type AccessCopy = typeof en;
const es: AccessCopy = {
 company: 'Empresa', actor: 'Administrador actual', assigned: 'Ya asignado', unassigned: 'Sin asignación',
 enabled: 'Habilitado', disabled: 'No habilitado', assignable: 'Puede asignar', restricted: 'No puede asignar', unknown: 'Desconocido',
 retained: 'Se conserva esta asignación. No sustituye la habilitación de la empresa ni los permisos de pestañas.',
 ineffective: 'Se conserva la asignación, pero actualmente no da acceso porque la empresa no tiene habilitado este módulo.',
 removed: 'Se retirará al guardar', retry: 'Recargar catálogo', effectiveRole: 'Rol efectivo en esta empresa',
 unknownReason: 'Faltan datos del catálogo. Recárgalo; la asignación existente se conservará.',
 entitlementReason: 'La empresa no tiene una habilitación activa para este módulo.',
 lifecycleReason: 'Las nuevas asignaciones están deshabilitadas o el módulo no está en un estado disponible.',
 actorReason: 'Tu rol y accesos en esta empresa no permiten delegar este módulo.',
 errors: {
  user_modules_required: 'Selecciona al menos un módulo. También cuenta una asignación existente que deba conservarse.',
  user_module_unknown: 'Faltan datos del módulo o cambiaron. Recarga el catálogo y revisa la selección.',
  user_module_not_enabled: 'Un módulo nuevo seleccionado no está habilitado para esta empresa. Retira esa selección o pide a un administrador autorizado que revise la habilitación.',
  user_module_not_assignable: 'No puedes asignar o modificar un módulo con tus accesos o con su estado actual. Revisa el catálogo y el alcance del administrador.',
  user_tab_permissions_required: 'Faltan los permisos de pestañas. Recarga su catálogo y revisa los módulos seleccionados.',
  user_tab_permission_unknown: 'Un permiso de pestaña ya no está en el catálogo. Recárgalo y revisa tus cambios.',
  user_tab_permission_module: 'Una pestaña seleccionada pertenece a un módulo sin asignar. Revisa el módulo y sus pestañas.',
  user_tab_permission_role: 'El rol elegido no puede recibir alguna de estas pestañas. Revisa el rol y los permisos de pestañas.',
  user_tab_permission_not_assignable: 'Tus accesos actuales no permiten delegar alguna de las pestañas seleccionadas. Revisa sus permisos.',
 },
};
const fr: AccessCopy = {
 company:'Entreprise',actor:'Administrateur actuel',assigned:'Déjà attribué',unassigned:'Non attribué',enabled:'Activé',disabled:'Non activé',assignable:'Peut attribuer',restricted:'Ne peut pas attribuer',unknown:'Inconnu',retained:'Cette attribution est conservée sans remplacer l’activation de l’entreprise ni les permissions des onglets.',ineffective:'Cette attribution est conservée mais ne donne pas accès : ce module n’est pas activé pour l’entreprise.',removed:'Sera retiré à l’enregistrement',retry:'Recharger le catalogue',effectiveRole:'Rôle effectif dans cette entreprise',unknownReason:'Données du catalogue incomplètes. Rechargez-le ; l’attribution existante sera conservée.',entitlementReason:'L’entreprise ne dispose pas d’une activation en vigueur pour ce module.',lifecycleReason:'Les nouvelles attributions sont désactivées ou le module n’est pas disponible.',actorReason:'Votre rôle et vos accès ne permettent pas de déléguer ce module.',
 errors:{user_modules_required:'Sélectionnez au moins un module. Une attribution à conserver compte également.',user_module_unknown:'Données du module incomplètes ou modifiées. Rechargez le catalogue et vérifiez la sélection.',user_module_not_enabled:'Un nouveau module sélectionné n’est pas activé pour cette entreprise. Retirez-le ou consultez un administrateur autorisé.',user_module_not_assignable:'Ce module ne peut pas être attribué avec vos accès ou dans son état actuel. Vérifiez le catalogue et le périmètre de l’administrateur.',user_tab_permissions_required:'Permissions des onglets manquantes. Rechargez leur catalogue.',user_tab_permission_unknown:'Une permission d’onglet n’existe plus au catalogue. Rechargez-le.',user_tab_permission_module:'Un onglet sélectionné appartient à un module non attribué. Vérifiez les modules et onglets.',user_tab_permission_role:'Le rôle choisi ne peut pas recevoir l’un des onglets. Vérifiez ses permissions.',user_tab_permission_not_assignable:'Vos accès ne permettent pas de déléguer l’un des onglets sélectionnés.'},
};
const pt: AccessCopy = {
 company:'Empresa',actor:'Administrador atual',assigned:'Já atribuído',unassigned:'Não atribuído',enabled:'Habilitado',disabled:'Não habilitado',assignable:'Pode atribuir',restricted:'Não pode atribuir',unknown:'Desconhecido',retained:'A atribuição será preservada sem substituir a habilitação da empresa nem as permissões das abas.',ineffective:'A atribuição será preservada, mas não concede acesso porque a empresa não habilitou este módulo.',removed:'Será removido ao salvar',retry:'Recarregar catálogo',effectiveRole:'Função efetiva nesta empresa',unknownReason:'Faltam dados do catálogo. Recarregue-o; a atribuição existente será preservada.',entitlementReason:'A empresa não possui habilitação ativa para este módulo.',lifecycleReason:'Novas atribuições estão desabilitadas ou o módulo não está disponível.',actorReason:'Sua função e seus acessos não permitem delegar este módulo.',
 errors:{user_modules_required:'Selecione pelo menos um módulo. Uma atribuição existente que será preservada também conta.',user_module_unknown:'Dados do módulo incompletos ou alterados. Recarregue o catálogo.',user_module_not_enabled:'Um novo módulo selecionado não está habilitado nesta empresa. Remova-o ou consulte um administrador autorizado.',user_module_not_assignable:'Não é possível atribuir ou modificar este módulo com seus acessos ou no estado atual. Revise o catálogo e o alcance do administrador.',user_tab_permissions_required:'Faltam permissões das abas. Recarregue o catálogo.',user_tab_permission_unknown:'Uma permissão de aba não existe mais no catálogo. Recarregue-o.',user_tab_permission_module:'Uma aba pertence a um módulo não atribuído. Revise módulos e abas.',user_tab_permission_role:'A função escolhida não pode receber uma das abas. Revise as permissões.',user_tab_permission_not_assignable:'Seus acessos não permitem delegar uma das abas selecionadas.'},
};
const ko: AccessCopy = {
 company:'회사',actor:'현재 관리자',assigned:'이미 할당됨',unassigned:'할당되지 않음',enabled:'활성화됨',disabled:'활성화되지 않음',assignable:'할당 가능',restricted:'할당 불가',unknown:'알 수 없음',retained:'이 할당은 유지됩니다. 회사 활성화 또는 탭 권한을 대체하지 않습니다.',ineffective:'할당은 유지되지만 회사에서 모듈을 활성화하지 않아 현재 접근할 수 없습니다.',removed:'저장 시 제거됨',retry:'목록 다시 불러오기',effectiveRole:'이 회사의 유효 역할',unknownReason:'목록 데이터가 부족합니다. 다시 불러오세요. 기존 할당은 유지됩니다.',entitlementReason:'회사에 이 모듈의 활성 이용 권한이 없습니다.',lifecycleReason:'새 할당이 비활성화되었거나 모듈을 사용할 수 없습니다.',actorReason:'현재 회사 역할과 접근 권한으로는 이 모듈을 위임할 수 없습니다.',
 errors:{user_modules_required:'모듈을 하나 이상 선택하세요. 유지되는 기존 할당도 포함됩니다.',user_module_unknown:'모듈 데이터가 부족하거나 변경되었습니다. 목록을 다시 불러오세요.',user_module_not_enabled:'새로 선택한 모듈이 회사에서 활성화되지 않았습니다. 선택을 해제하거나 관리자에게 문의하세요.',user_module_not_assignable:'현재 권한 또는 상태로 이 모듈을 할당하거나 변경할 수 없습니다. 목록과 관리자 범위를 확인하세요.',user_tab_permissions_required:'탭 권한이 없습니다. 목록을 다시 불러오세요.',user_tab_permission_unknown:'탭 권한이 목록에 없습니다. 다시 불러오세요.',user_tab_permission_module:'선택한 탭의 모듈이 할당되지 않았습니다. 모듈과 탭을 확인하세요.',user_tab_permission_role:'선택한 역할은 일부 탭을 받을 수 없습니다. 권한을 확인하세요.',user_tab_permission_not_assignable:'현재 권한으로 일부 탭을 위임할 수 없습니다.'},
};
const zh: AccessCopy = {
 company:'公司',actor:'当前管理员',assigned:'已分配',unassigned:'未分配',enabled:'已启用',disabled:'未启用',assignable:'可分配',restricted:'不可分配',unknown:'未知',retained:'此分配将保留，不会替代公司的启用状态或页签权限。',ineffective:'分配将保留，但公司尚未启用此模块，因此目前无法访问。',removed:'保存时移除',retry:'重新加载目录',effectiveRole:'在此公司的有效角色',unknownReason:'目录数据不完整。请重新加载，已有分配将保留。',entitlementReason:'公司没有此模块的有效使用权限。',lifecycleReason:'新分配已禁用，或模块目前不可用。',actorReason:'当前公司角色和权限不允许委派此模块。',
 errors:{user_modules_required:'请至少选择一个模块。需要保留的已有分配也计算在内。',user_module_unknown:'模块数据不完整或已变更。请重新加载目录。',user_module_not_enabled:'新选模块未在公司启用。请取消选择或联系授权管理员。',user_module_not_assignable:'当前权限或模块状态不允许分配或修改此模块。请检查目录和管理员范围。',user_tab_permissions_required:'缺少页签权限。请重新加载目录。',user_tab_permission_unknown:'某个页签权限已不在目录中。请重新加载。',user_tab_permission_module:'所选页签属于未分配的模块。请检查模块和页签。',user_tab_permission_role:'所选角色无法获得某个页签。请检查权限。',user_tab_permission_not_assignable:'当前权限不允许委派某个所选页签。'},
};
const copies: Record<string, AccessCopy> = {en,es,fr,pt,ko,zh};
export const getUsersModuleAccessCopy = (language: string) => copies[language.split('-')[0]] ?? en;
