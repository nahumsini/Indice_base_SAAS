// Customer and company-account presentation only; machine values and entered names are unchanged.
export const customerAccountLocales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'] as const;
export type CustomerAccountLocale = typeof customerAccountLocales[number];
const localeIndex: Record<CustomerAccountLocale, number> = { 'en-CA': 0, 'en-US': 0, 'es-MX': 1, 'es-CO': 1, 'fr-CA': 2, 'pt-BR': 3, 'ko-CA': 4, 'zh-CA': 5 };
// Columns: Canadian English, Spanish, Canadian French, Brazilian Portuguese, Korean, Chinese.
const messages = {
  identifierId: ["ID {id}", "ID {id}", "Identifiant {id}", "ID {id}", "식별자 {id}", "编号 {id}"],
  "account": [
    "Account",
    "Cuenta",
    "Compte",
    "Conta",
    "계정",
    "账户"
  ],
  "accountUsers": [
    "Account users",
    "Usuarios de la cuenta",
    "Utilisateurs du compte",
    "Usuários da conta",
    "계정 사용자",
    "账户用户"
  ],
  "customerAccount": [
    "Customer account",
    "Cuenta de cliente",
    "Compte client",
    "Conta de cliente",
    "고객 계정",
    "客户账户"
  ],
  "close": [
    "Close",
    "Cerrar",
    "Fermer",
    "Fechar",
    "닫기",
    "关闭"
  ],
  "cancel": [
    "Cancel",
    "Cancelar",
    "Annuler",
    "Cancelar",
    "취소",
    "取消"
  ],
  "save": [
    "Save",
    "Guardar",
    "Enregistrer",
    "Salvar",
    "저장",
    "保存"
  ],
  "saving": [
    "Saving...",
    "Guardando...",
    "Enregistrement…",
    "Salvando…",
    "저장 중…",
    "正在保存…"
  ],
  "noOwnerEmail": [
    "No owner email",
    "Sin correo propietario",
    "Aucun courriel du propriétaire",
    "Sem e-mail do proprietário",
    "소유자 이메일 없음",
    "无所有者邮箱"
  ],
  "companyId": [
    "Company #{id}",
    "Empresa #{id}",
    "Entreprise nº {id}",
    "Empresa nº {id}",
    "회사 #{id}",
    "公司 #{id}"
  ],
  "usersManagement": [
    "User management",
    "Administración de usuarios",
    "Gestion des utilisateurs",
    "Gestão de usuários",
    "사용자 관리",
    "用户管理"
  ],
  "usersManagementHelp": [
    "Invite, reactivate or deactivate users independently of module and billing changes.",
    "Invita, reactiva o desactiva personas sin mezclar cambios de módulos o facturación.",
    "Invitez, réactivez ou désactivez des utilisateurs indépendamment des modules et de la facturation.",
    "Convide, reative ou desative usuários independentemente de alterações em módulos e faturamento.",
    "모듈 및 청구 변경과 별개로 사용자를 초대하거나 다시 활성화 또는 비활성화하세요.",
    "邀请、重新启用或停用用户，独立于模块和账单变更。"
  ],
  "seatSummary": [
    "Active: {active} · Reserved: {reserved} · Capacity: {capacity}",
    "Activos: {active} · Reservados: {reserved} · Capacidad: {capacity}",
    "Actifs : {active} · Réservés : {reserved} · Capacité : {capacity}",
    "Ativos: {active} · Reservados: {reserved} · Capacidade: {capacity}",
    "활성: {active} · 예약: {reserved} · 정원: {capacity}",
    "活跃：{active} · 预留：{reserved} · 容量：{capacity}"
  ],
  "modulesSummary": [
    "Active modules: {count}",
    "Módulos activos: {count}",
    "Modules actifs : {count}",
    "Módulos ativos: {count}",
    "활성 모듈: {count}",
    "已启用模块：{count}"
  ],
  "inviteSent": [
    "Invitation sent. A seat is reserved until it is accepted or canceled.",
    "Invitación enviada. El lugar quedó reservado hasta que sea aceptada o cancelada.",
    "Invitation envoyée. Une place est réservée jusqu’à son acceptation ou son annulation.",
    "Convite enviado. Uma vaga fica reservada até ser aceito ou cancelado.",
    "초대를 보냈습니다. 수락하거나 취소할 때까지 자리가 예약됩니다.",
    "邀请已发送。在接受或取消前将预留一个名额。"
  ],
  "inviteCreated": [
    "Invitation created and seat reserved. Copy the link to share it securely.",
    "Invitación creada y lugar reservado. Copia el enlace para compartirlo de forma segura.",
    "Invitation créée et place réservée. Copiez le lien pour le partager de façon sécuritaire.",
    "Convite criado e vaga reservada. Copie o link para compartilhá-lo com segurança.",
    "초대를 만들고 자리를 예약했습니다. 링크를 복사해 안전하게 공유하세요.",
    "邀请已创建，名额已预留。请复制链接并安全分享。"
  ],
  "inviteFailed": [
    "The invitation could not be created.",
    "No se pudo crear la invitación.",
    "Impossible de créer l’invitation.",
    "Não foi possível criar o convite.",
    "초대를 만들 수 없습니다.",
    "无法创建邀请。"
  ],
  "userReactivated": [
    "User reactivated and seat occupied.",
    "Usuario reactivado y lugar ocupado.",
    "Utilisateur réactivé et place occupée.",
    "Usuário reativado e vaga ocupada.",
    "사용자를 다시 활성화하고 자리를 배정했습니다.",
    "用户已重新启用并占用一个名额。"
  ],
  "userDeactivated": [
    "User deactivated and seat released.",
    "Usuario desactivado y lugar liberado.",
    "Utilisateur désactivé et place libérée.",
    "Usuário desativado e vaga liberada.",
    "사용자를 비활성화하고 자리를 비웠습니다.",
    "用户已停用，名额已释放。"
  ],
  "userUpdateFailed": [
    "The user could not be updated.",
    "No se pudo actualizar el usuario.",
    "Impossible de mettre à jour l’utilisateur.",
    "Não foi possível atualizar o usuário.",
    "사용자를 업데이트할 수 없습니다.",
    "无法更新用户。"
  ],
  "inviteResent": [
    "Invitation resent and validity renewed.",
    "Invitación reenviada y vigencia renovada.",
    "Invitation renvoyée et validité renouvelée.",
    "Convite reenviado e validade renovada.",
    "초대를 다시 보내고 유효 기간을 갱신했습니다.",
    "邀请已重新发送，有效期已更新。"
  ],
  "inviteRenewed": [
    "Validity renewed. Copy the new link to share it.",
    "Vigencia renovada. Copia el nuevo enlace para compartirlo.",
    "Validité renouvelée. Copiez le nouveau lien pour le partager.",
    "Validade renovada. Copie o novo link para compartilhar.",
    "유효 기간을 갱신했습니다. 새 링크를 복사해 공유하세요.",
    "有效期已更新。请复制新链接进行分享。"
  ],
  "inviteResendFailed": [
    "The invitation could not be resent.",
    "No se pudo reenviar la invitación.",
    "Impossible de renvoyer l’invitation.",
    "Não foi possível reenviar o convite.",
    "초대를 다시 보낼 수 없습니다.",
    "无法重新发送邀请。"
  ],
  "inviteCanceled": [
    "Invitation canceled and seat released.",
    "Invitación cancelada y lugar liberado.",
    "Invitation annulée et place libérée.",
    "Convite cancelado e vaga liberada.",
    "초대를 취소하고 자리를 비웠습니다.",
    "邀请已取消，名额已释放。"
  ],
  "inviteCancelFailed": [
    "The invitation could not be canceled.",
    "No se pudo cancelar la invitación.",
    "Impossible d’annuler l’invitation.",
    "Não foi possível cancelar o convite.",
    "초대를 취소할 수 없습니다.",
    "无法取消邀请。"
  ],
  "activePlural": [
    "Active",
    "Activos",
    "Actifs",
    "Ativos",
    "활성",
    "活跃"
  ],
  "inactivePlural": [
    "Inactive",
    "Inactivos",
    "Inactifs",
    "Inativos",
    "비활성",
    "已停用"
  ],
  "invitations": [
    "Invitations",
    "Invitaciones",
    "Invitations",
    "Convites",
    "초대",
    "邀请"
  ],
  "linkCopied": [
    "Link copied",
    "Enlace copiado",
    "Lien copié",
    "Link copiado",
    "링크 복사됨",
    "链接已复制"
  ],
  "copyInvitation": [
    "Copy invitation",
    "Copiar invitación",
    "Copier l’invitation",
    "Copiar convite",
    "초대 복사",
    "复制邀请"
  ],
  "userCapacity": [
    "User capacity",
    "Capacidad de usuarios",
    "Capacité d’utilisateurs",
    "Capacidade de usuários",
    "사용자 정원",
    "用户容量"
  ],
  "committedCapacity": [
    "Committed seats: {used} of {limit}",
    "Lugares comprometidos: {used} de {limit}",
    "Places engagées : {used} sur {limit}",
    "Vagas comprometidas: {used} de {limit}",
    "배정된 자리: {used}/{limit}",
    "已分配名额：{used}/{limit}"
  ],
  "activeCount": [
    "Active users: {count}",
    "Usuarios activos: {count}",
    "Utilisateurs actifs : {count}",
    "Usuários ativos: {count}",
    "활성 사용자: {count}",
    "活跃用户：{count}"
  ],
  "activeLower": [
    "active",
    "activos",
    "actifs",
    "ativos",
    "활성",
    "活跃"
  ],
  "reservedLower": [
    "reserved",
    "reservados",
    "réservés",
    "reservados",
    "예약",
    "预留"
  ],
  "availableLower": [
    "available",
    "disponibles",
    "disponibles",
    "disponíveis",
    "사용 가능",
    "可用"
  ],
  "includedLower": [
    "included",
    "incluidos",
    "inclus",
    "incluídos",
    "포함",
    "包含"
  ],
  "additionalCount": [
    "Additional: {count}",
    "Adicionales: {count}",
    "Supplémentaires : {count}",
    "Adicionais: {count}",
    "추가: {count}",
    "额外：{count}"
  ],
  "unlimitedSeats": [
    "This account has no commercial seat limit.",
    "Esta cuenta no tiene un límite comercial de lugares.",
    "Ce compte n’a aucune limite commerciale de places.",
    "Esta conta não tem limite comercial de vagas.",
    "이 계정에는 상업적 자리 제한이 없습니다.",
    "此账户没有商业名额上限。"
  ],
  "adjustSeats": [
    "Adjust seats",
    "Ajustar lugares",
    "Ajuster les places",
    "Ajustar vagas",
    "자리 조정",
    "调整名额"
  ],
  "noSeatsInvite": [
    "No seats are available; adjust capacity before inviting.",
    "No hay lugares disponibles; ajusta la capacidad antes de invitar.",
    "Aucune place disponible; ajustez la capacité avant d’inviter.",
    "Não há vagas disponíveis; ajuste a capacidade antes de convidar.",
    "사용 가능한 자리가 없습니다. 초대 전에 정원을 조정하세요.",
    "没有可用名额，请先调整容量再邀请。"
  ],
  "inviteUser": [
    "Invite user",
    "Invitar usuario",
    "Inviter un utilisateur",
    "Convidar usuário",
    "사용자 초대",
    "邀请用户"
  ],
  "ownerSeatHelp": [
    "The owner occupies one seat; each pending invitation reserves another.",
    "El propietario ocupa un lugar; cada invitación pendiente reserva otro.",
    "Le propriétaire occupe une place; chaque invitation en attente en réserve une autre.",
    "O proprietário ocupa uma vaga; cada convite pendente reserva outra.",
    "소유자는 한 자리를 사용하며 대기 중인 각 초대는 다른 자리를 예약합니다.",
    "所有者占用一个名额；每个待处理邀请另预留一个名额。"
  ],
  "userStatus": [
    "User status",
    "Estado de usuarios",
    "État des utilisateurs",
    "Status dos usuários",
    "사용자 상태",
    "用户状态"
  ],
  "owner": [
    "Owner",
    "Propietario",
    "Propriétaire",
    "Proprietário",
    "소유자",
    "所有者"
  ],
  "ownerProtected": [
    "The account owner is protected.",
    "El propietario de la cuenta está protegido.",
    "Le propriétaire du compte est protégé.",
    "O proprietário da conta está protegido.",
    "계정 소유자는 보호됩니다.",
    "账户所有者受保护。"
  ],
  "deactivateRelease": [
    "Deactivate and release seat",
    "Desactivar y liberar lugar",
    "Désactiver et libérer la place",
    "Desativar e liberar vaga",
    "비활성화 및 자리 해제",
    "停用并释放名额"
  ],
  "protected": [
    "Protected",
    "Protegido",
    "Protégé",
    "Protegido",
    "보호됨",
    "受保护"
  ],
  "deactivate": [
    "Deactivate",
    "Desactivar",
    "Désactiver",
    "Desativar",
    "비활성화",
    "停用"
  ],
  "reactivate": [
    "Reactivate",
    "Reactivar",
    "Réactiver",
    "Reativar",
    "다시 활성화",
    "重新启用"
  ],
  "expires": [
    "Expires",
    "Vence",
    "Expire le",
    "Vence em",
    "만료",
    "到期"
  ],
  "resendInvitation": [
    "Resend invitation",
    "Reenviar invitación",
    "Renvoyer l’invitation",
    "Reenviar convite",
    "초대 다시 보내기",
    "重新发送邀请"
  ],
  "resendRenew": [
    "Resend and renew validity",
    "Reenviar y renovar vigencia",
    "Renvoyer et renouveler la validité",
    "Reenviar e renovar validade",
    "다시 보내기 및 유효 기간 갱신",
    "重新发送并更新有效期"
  ],
  "cancelInvitation": [
    "Cancel invitation",
    "Cancelar invitación",
    "Annuler l’invitation",
    "Cancelar convite",
    "초대 취소",
    "取消邀请"
  ],
  "cancelRelease": [
    "Cancel and release seat",
    "Cancelar y liberar lugar",
    "Annuler et libérer la place",
    "Cancelar e liberar vaga",
    "취소 및 자리 해제",
    "取消并释放名额"
  ],
  "noActiveUsers": [
    "There are no active users.",
    "No hay usuarios activos.",
    "Aucun utilisateur actif.",
    "Não há usuários ativos.",
    "활성 사용자가 없습니다.",
    "没有活跃用户。"
  ],
  "noInvitations": [
    "No pending invitations or reserved seats.",
    "No hay invitaciones pendientes ni lugares reservados.",
    "Aucune invitation en attente ni place réservée.",
    "Não há convites pendentes nem vagas reservadas.",
    "대기 중인 초대나 예약된 자리가 없습니다.",
    "没有待处理邀请或预留名额。"
  ],
  "noInactiveUsers": [
    "There are no inactive users.",
    "No hay usuarios inactivos.",
    "Aucun utilisateur inactif.",
    "Não há usuários inativos.",
    "비활성 사용자가 없습니다.",
    "没有已停用用户。"
  ],
  "recentBilling": [
    "Recent billing",
    "Facturación reciente",
    "Facturation récente",
    "Faturamento recente",
    "최근 청구",
    "近期账单"
  ],
  "stripeTransactions": [
    "Transactions synchronized with Stripe.",
    "Movimientos sincronizados con Stripe.",
    "Transactions synchronisées avec Stripe.",
    "Transações sincronizadas com o Stripe.",
    "Stripe와 동기화된 거래입니다.",
    "已与 Stripe 同步的交易。"
  ],
  "invoiceId": [
    "Invoice #{id}",
    "Factura #{id}",
    "Facture nº {id}",
    "Fatura nº {id}",
    "청구서 #{id}",
    "账单 #{id}"
  ],
  "openInvoice": [
    "Open invoice",
    "Abrir factura",
    "Ouvrir la facture",
    "Abrir fatura",
    "청구서 열기",
    "打开账单"
  ],
  "noInvoices": [
    "No invoices have been synchronized yet.",
    "Aún no hay facturas sincronizadas.",
    "Aucune facture synchronisée pour le moment.",
    "Ainda não há faturas sincronizadas.",
    "아직 동기화된 청구서가 없습니다.",
    "尚无已同步账单。"
  ],
  "inviteDescription": [
    "Reserves one seat in {name} until the invitation is accepted or canceled.",
    "Reserva 1 lugar en {name} hasta que la invitación se acepte o cancele.",
    "Réserve une place chez {name} jusqu’à l’acceptation ou l’annulation de l’invitation.",
    "Reserva uma vaga em {name} até o convite ser aceito ou cancelado.",
    "초대를 수락하거나 취소할 때까지 {name}의 한 자리를 예약합니다.",
    "在邀请被接受或取消前，为 {name} 预留一个名额。"
  ],
  "availableBeforeInvite": [
    "Available seats before inviting: {count}",
    "Lugares disponibles antes de invitar: {count}",
    "Places disponibles avant l’invitation : {count}",
    "Vagas disponíveis antes de convidar: {count}",
    "초대 전 사용 가능한 자리: {count}",
    "邀请前可用名额：{count}"
  ],
  "unlimitedCapacity": [
    "Capacity without a commercial limit",
    "Capacidad sin límite comercial",
    "Capacité sans limite commerciale",
    "Capacidade sem limite comercial",
    "상업적 제한 없는 정원",
    "无商业容量上限"
  ],
  "sending": [
    "Sending…",
    "Enviando…",
    "Envoi…",
    "Enviando…",
    "보내는 중…",
    "正在发送…"
  ],
  "sendInvitation": [
    "Send invitation",
    "Enviar invitación",
    "Envoyer l’invitation",
    "Enviar convite",
    "초대 보내기",
    "发送邀请"
  ],
  "fullName": [
    "Full name",
    "Nombre completo",
    "Nom complet",
    "Nome completo",
    "성명",
    "姓名"
  ],
  "nameExample": [
    "e.g. Alex Martin",
    "Ej. Andrea López",
    "Ex. : Alex Martin",
    "Ex.: Ana Souza",
    "예: 김민준",
    "例如：张明"
  ],
  "email": [
    "Email address",
    "Correo electrónico",
    "Adresse courriel",
    "Endereço de e-mail",
    "이메일 주소",
    "电子邮箱"
  ],
  "emailExample": [
    "user@company.com",
    "usuario@empresa.com",
    "utilisateur@entreprise.com",
    "usuario@empresa.com",
    "user@company.com",
    "user@company.com"
  ],
  "initialRole": [
    "Initial role",
    "Perfil inicial",
    "Rôle initial",
    "Perfil inicial",
    "초기 역할",
    "初始角色"
  ],
  "employee": [
    "Employee",
    "Colaborador",
    "Employé",
    "Colaborador",
    "직원",
    "员工"
  ],
  "employeeAccess": [
    "Operational access to active modules.",
    "Acceso operativo a los módulos activos.",
    "Accès opérationnel aux modules actifs.",
    "Acesso operacional aos módulos ativos.",
    "활성 모듈에 대한 업무 접근 권한입니다.",
    "可访问已启用模块的业务功能。"
  ],
  "administrator": [
    "Administrator",
    "Administrador",
    "Administrateur",
    "Administrador",
    "관리자",
    "管理员"
  ],
  "adminRoleHelp": [
    "Can manage the account without replacing the owner.",
    "Puede administrar la cuenta, sin sustituir al propietario.",
    "Peut gérer le compte sans remplacer le propriétaire.",
    "Pode gerenciar a conta sem substituir o proprietário.",
    "소유자를 대신하지 않고 계정을 관리할 수 있습니다.",
    "可管理账户，但不替代所有者。"
  ],
  "operationalReason": [
    "Operational reason",
    "Motivo operativo",
    "Motif opérationnel",
    "Motivo operacional",
    "업무 사유",
    "操作原因"
  ],
  "inviteReasonExample": [
    "e.g. The company requested an account for its administrator",
    "Ej. Alta del responsable administrativo solicitada por la empresa",
    "Ex. : Compte demandé par l’entreprise pour son administrateur",
    "Ex.: A empresa solicitou acesso para seu administrador",
    "예: 회사 요청에 따른 관리자 계정 생성",
    "例如：应公司要求为管理员创建账户"
  ],
  "platformAuditHelp": [
    "This will be saved in the platform audit log.",
    "Se guardará en la bitácora de plataforma.",
    "Ce motif sera inscrit au journal d’audit de la plateforme.",
    "Será salvo no registro de auditoria da plataforma.",
    "플랫폼 감사 로그에 저장됩니다.",
    "此内容将保存到平台审计日志中。"
  ],
  "initialPermissions": [
    "Initial permissions are limited to this account’s active modules. They can later be adjusted in Settings.",
    "Los permisos iniciales se limitan a los módulos activos de esta cuenta. Después podrán ajustarse desde Configuración.",
    "Les permissions initiales se limitent aux modules actifs du compte. Elles pourront être ajustées dans les paramètres.",
    "As permissões iniciais se limitam aos módulos ativos da conta. Depois, poderão ser ajustadas em Configurações.",
    "초기 권한은 이 계정의 활성 모듈로 제한됩니다. 이후 설정에서 조정할 수 있습니다.",
    "初始权限仅限于此账户已启用的模块，之后可在设置中调整。"
  ],
  "deactivateUser": [
    "Deactivate user",
    "Desactivar usuario",
    "Désactiver l’utilisateur",
    "Desativar usuário",
    "사용자 비활성화",
    "停用用户"
  ],
  "reactivateUser": [
    "Reactivate user",
    "Reactivar usuario",
    "Réactiver l’utilisateur",
    "Reativar usuário",
    "사용자 다시 활성화",
    "重新启用用户"
  ],
  "deactivateHelp": [
    "Access will be blocked and the seat released immediately.",
    "El acceso se bloqueará y su lugar quedará disponible inmediatamente.",
    "L’accès sera bloqué et la place sera libérée immédiatement.",
    "O acesso será bloqueado e a vaga liberada imediatamente.",
    "접근이 차단되고 자리가 즉시 비워집니다.",
    "访问权限将被阻止，名额会立即释放。"
  ],
  "reactivateHelp": [
    "The user will regain access and occupy an available seat.",
    "El usuario recuperará el acceso y ocupará un lugar disponible.",
    "L’utilisateur retrouvera l’accès et occupera une place disponible.",
    "O usuário recuperará o acesso e ocupará uma vaga disponível.",
    "사용자가 접근 권한을 되찾고 사용 가능한 자리를 배정받습니다.",
    "用户将恢复访问权限并占用一个可用名额。"
  ],
  "accessChangeReason": [
    "Explain why access is changing",
    "Explica por qué cambia el acceso",
    "Expliquez le changement d’accès",
    "Explique a alteração de acesso",
    "접근 권한 변경 사유를 설명하세요",
    "请说明更改访问权限的原因"
  ],
  "cancelInvitationHelp": [
    "The invitation will stop working and the reserved seat will be released immediately.",
    "La invitación dejará de funcionar y el lugar reservado quedará disponible inmediatamente.",
    "L’invitation ne fonctionnera plus et la place réservée sera libérée immédiatement.",
    "O convite deixará de funcionar e a vaga reservada será liberada imediatamente.",
    "초대가 더 이상 작동하지 않으며 예약된 자리가 즉시 비워집니다.",
    "邀请将失效，预留名额会立即释放。"
  ],
  "status": [
    "Status",
    "Estado",
    "État",
    "Status",
    "상태",
    "状态"
  ],
  "active": [
    "Active",
    "Activo",
    "Actif",
    "Ativo",
    "활성",
    "有效"
  ],
  "inactive": [
    "Inactive",
    "Inactivo",
    "Inactif",
    "Inativo",
    "비활성",
    "已停用"
  ],
  "canceled": [
    "Canceled",
    "Cancelado",
    "Annulé",
    "Cancelado",
    "취소됨",
    "已取消"
  ],
  "expired": [
    "Expired",
    "Vencido",
    "Expiré",
    "Expirado",
    "만료됨",
    "已到期"
  ],
  "pendingPayment": [
    "Payment pending",
    "Pago pendiente",
    "Paiement en attente",
    "Pagamento pendente",
    "결제 대기",
    "待付款"
  ],
  "revoked": [
    "Revoked",
    "Revocado",
    "Révoqué",
    "Revogado",
    "취소됨",
    "已撤销"
  ],
  "scheduled": [
    "Scheduled",
    "Programado",
    "Planifié",
    "Agendado",
    "예정됨",
    "已计划"
  ],
  "trial": [
    "Trial",
    "Prueba",
    "Essai",
    "Teste",
    "체험",
    "试用"
  ],
  "paid": [
    "Paid",
    "Pagado",
    "Payé",
    "Pago",
    "결제 완료",
    "已付款"
  ],
  "unpaid": [
    "Unpaid",
    "Sin pagar",
    "Impayé",
    "Não pago",
    "미결제",
    "未付款"
  ],
  "failed": [
    "Failed",
    "Fallido",
    "Échec",
    "Falhou",
    "실패",
    "失败"
  ],
  "open": [
    "Open",
    "Abierto",
    "Ouvert",
    "Aberto",
    "진행 중",
    "待处理"
  ],
  "pending": [
    "Pending",
    "Pendiente",
    "En attente",
    "Pendente",
    "대기 중",
    "待处理"
  ],
  "processing": [
    "Processing",
    "Procesando",
    "Traitement",
    "Processando",
    "처리 중",
    "处理中"
  ],
  "noStatus": [
    "No status",
    "Sin estado",
    "Aucun état",
    "Sem status",
    "상태 없음",
    "无状态"
  ],
  "noDate": [
    "No date",
    "Sin fecha",
    "Aucune date",
    "Sem data",
    "날짜 없음",
    "无日期"
  ],
  "courtesy": [
    "Courtesy",
    "Cortesía",
    "Courtoisie",
    "Cortesia",
    "무료 제공",
    "赠送"
  ],
  "support": [
    "Support",
    "Soporte",
    "Soutien",
    "Suporte",
    "지원",
    "支持"
  ],
  "promotion": [
    "Promotion",
    "Promoción",
    "Promotion",
    "Promoção",
    "프로모션",
    "促销"
  ],
  "subscription": [
    "Subscription",
    "Suscripción",
    "Abonnement",
    "Assinatura",
    "구독",
    "订阅"
  ],
  "demo": [
    "Demo",
    "Demo",
    "Démo",
    "Demonstração",
    "데모",
    "演示"
  ],
  "root": [
    "Root",
    "Root",
    "Root",
    "Root",
    "Root",
    "Root"
  ],
  "superAdmin": [
    "Super Admin",
    "Super Admin",
    "Super administrateur",
    "Superadministrador",
    "최고 관리자",
    "超级管理员"
  ],
  "user": [
    "User",
    "Usuario",
    "Utilisateur",
    "Usuário",
    "사용자",
    "用户"
  ],
  "adminAccessTitle": [
    "Administrative access",
    "Accesos administrativos",
    "Accès administratifs",
    "Acessos administrativos",
    "관리자 부여 접근",
    "管理员授权访问"
  ],
  "adminAccessDescription": [
    "Courtesy access, promotions, trials and support with auditable validity.",
    "Cortesías, promociones, pruebas y apoyos con vigencia auditable.",
    "Accès de courtoisie, promotions, essais et soutien avec validité vérifiable.",
    "Cortesias, promoções, testes e suporte com validade auditável.",
    "감사 가능한 유효 기간의 무료 접근, 프로모션, 체험 및 지원입니다.",
    "可审计有效期的赠送访问、促销、试用和支持。"
  ],
  "createAdjustment": [
    "Create adjustment",
    "Crear ajuste",
    "Créer un ajustement",
    "Criar ajuste",
    "조정 만들기",
    "创建调整"
  ],
  "adminAdjustment": [
    "Administrative adjustment",
    "Ajuste administrativo",
    "Ajustement administratif",
    "Ajuste administrativo",
    "관리 조정",
    "管理调整"
  ],
  "untilDate": [
    "until {date}",
    "hasta {date}",
    "jusqu’au {date}",
    "até {date}",
    "{date}까지",
    "截至 {date}"
  ],
  "noExpiry": [
    "no expiration",
    "sin vencimiento",
    "sans expiration",
    "sem vencimento",
    "만료 없음",
    "永久有效"
  ],
  "revoke": [
    "Revoke",
    "Revocar",
    "Révoquer",
    "Revogar",
    "철회",
    "撤销"
  ],
  "noAdjustments": [
    "No administrative adjustments recorded.",
    "No hay ajustes administrativos registrados.",
    "Aucun ajustement administratif enregistré.",
    "Nenhum ajuste administrativo registrado.",
    "등록된 관리 조정이 없습니다.",
    "尚无管理调整记录。"
  ],
  "module": [
    "Module",
    "Módulo",
    "Module",
    "Módulo",
    "모듈",
    "模块"
  ],
  "modules": [
    "Modules",
    "Módulos",
    "Modules",
    "Módulos",
    "모듈",
    "模块"
  ],
  "extraUsers": [
    "Additional users",
    "Usuarios adicionales",
    "Utilisateurs supplémentaires",
    "Usuários adicionais",
    "추가 사용자",
    "额外用户"
  ],
  "storage": [
    "Storage",
    "Almacenamiento",
    "Stockage",
    "Armazenamento",
    "저장 공간",
    "存储"
  ],
  "applyAccessAdjustment": [
    "Apply access adjustment",
    "Aplicar ajuste de acceso",
    "Appliquer un ajustement d’accès",
    "Aplicar ajuste de acesso",
    "접근 권한 조정 적용",
    "应用访问调整"
  ],
  "adjustmentHelp": [
    "Select controlled values to keep access consistent.",
    "Selecciona valores controlados para evitar accesos inconsistentes.",
    "Sélectionnez des valeurs contrôlées pour assurer un accès cohérent.",
    "Selecione valores controlados para manter o acesso consistente.",
    "일관된 접근 권한을 위해 지정된 값을 선택하세요.",
    "选择受控值以保持访问权限一致。"
  ],
  "applying": [
    "Applying…",
    "Aplicando…",
    "Application…",
    "Aplicando…",
    "적용 중…",
    "正在应用…"
  ],
  "applyAdjustment": [
    "Apply adjustment",
    "Aplicar ajuste",
    "Appliquer l’ajustement",
    "Aplicar ajuste",
    "조정 적용",
    "应用调整"
  ],
  "adjustmentType": [
    "Adjustment type",
    "Tipo de ajuste",
    "Type d’ajustement",
    "Tipo de ajuste",
    "조정 유형",
    "调整类型"
  ],
  "origin": [
    "Origin",
    "Origen",
    "Origine",
    "Origem",
    "출처",
    "来源"
  ],
  "selectModule": [
    "Select a module",
    "Selecciona un módulo",
    "Sélectionnez un module",
    "Selecione um módulo",
    "모듈 선택",
    "选择模块"
  ],
  "quantity": [
    "Quantity",
    "Cantidad",
    "Quantité",
    "Quantidade",
    "수량",
    "数量"
  ],
  "validUntilOptional": [
    "Valid until (optional)",
    "Vigencia hasta (opcional)",
    "Valide jusqu’au (facultatif)",
    "Válido até (opcional)",
    "유효 기한(선택 사항)",
    "有效期至（可选）"
  ],
  "auditReason": [
    "Audit reason",
    "Motivo auditable",
    "Motif d’audit",
    "Motivo auditável",
    "감사 사유",
    "审计原因"
  ],
  "selectReason": [
    "Select a reason",
    "Selecciona un motivo",
    "Sélectionnez un motif",
    "Selecione um motivo",
    "사유 선택",
    "选择原因"
  ],
  "otherReason": [
    "Other reason",
    "Otro motivo",
    "Autre motif",
    "Outro motivo",
    "기타 사유",
    "其他原因"
  ],
  "describeReason": [
    "Describe the reason",
    "Describe el motivo",
    "Décrivez le motif",
    "Descreva o motivo",
    "사유 설명",
    "说明原因"
  ],
  "usersBilling": [
    "Users and billing",
    "Usuarios y facturación",
    "Utilisateurs et facturation",
    "Usuários e faturamento",
    "사용자 및 청구",
    "用户和账单"
  ],
  "access": [
    "Access",
    "Acceso",
    "Accès",
    "Acesso",
    "접근",
    "访问"
  ],
  "accesses": [
    "Access",
    "Accesos",
    "Accès",
    "Acessos",
    "접근 권한",
    "访问权限"
  ],
  "stripeTrial": [
    "Stripe trial",
    "Prueba Stripe",
    "Essai Stripe",
    "Teste Stripe",
    "Stripe 체험",
    "Stripe 试用"
  ],
  "stripeSubscription": [
    "Stripe subscription",
    "Suscripción Stripe",
    "Abonnement Stripe",
    "Assinatura Stripe",
    "Stripe 구독",
    "Stripe 订阅"
  ],
  "adminAccess": [
    "Administrative access",
    "Acceso administrativo",
    "Accès administratif",
    "Acesso administrativo",
    "관리자 부여 접근",
    "管理员授权访问"
  ],
  "noCommercialAccess": [
    "No commercial access",
    "Sin acceso comercial",
    "Aucun accès commercial",
    "Sem acesso comercial",
    "상업적 접근 없음",
    "无商业访问权限"
  ],
  "accountSections": [
    "Account sections",
    "Secciones de la cuenta",
    "Sections du compte",
    "Seções da conta",
    "계정 섹션",
    "账户栏目"
  ],
  "noPlan": [
    "No plan",
    "Sin plan",
    "Aucun forfait",
    "Sem plano",
    "플랜 없음",
    "无方案"
  ],
  "stripeManaged": [
    "Managed in Stripe",
    "Administrado en Stripe",
    "Géré dans Stripe",
    "Gerenciado no Stripe",
    "Stripe에서 관리",
    "由 Stripe 管理"
  ],
  "stripeNoContract": [
    "Stripe customer without a contract",
    "Cliente Stripe sin contrato",
    "Client Stripe sans contrat",
    "Cliente Stripe sem contrato",
    "계약 없는 Stripe 고객",
    "无合同的 Stripe 客户"
  ],
  "noStripe": [
    "No Stripe",
    "Sin Stripe",
    "Sans Stripe",
    "Sem Stripe",
    "Stripe 없음",
    "未连接 Stripe"
  ],
  "operationalSummary": [
    "Operational overview",
    "Resumen operativo",
    "Aperçu opérationnel",
    "Resumo operacional",
    "업무 개요",
    "运营概览"
  ],
  "overviewDescription": [
    "Status, commercial relationship, capacity and billing in one view.",
    "Estado, relación comercial, capacidad y facturación en una sola vista.",
    "État, relation commerciale, capacité et facturation en une seule vue.",
    "Status, relação comercial, capacidade e faturamento em uma só visão.",
    "상태, 거래 관계, 정원 및 청구를 한눈에 확인합니다.",
    "集中查看状态、商业关系、容量和账单。"
  ],
  "userType": [
    "User type",
    "Tipo de usuario",
    "Type d’utilisateur",
    "Tipo de usuário",
    "사용자 유형",
    "用户类型"
  ],
  "ownerRole": [
    "Account owner role",
    "Rol propietario de la cuenta",
    "Rôle du propriétaire du compte",
    "Perfil do proprietário da conta",
    "계정 소유자 역할",
    "账户所有者角色"
  ],
  "traceability": [
    "Traceability",
    "Trazabilidad",
    "Traçabilité",
    "Rastreabilidade",
    "추적 정보",
    "可追溯信息"
  ],
  "plan": [
    "Plan",
    "Plan",
    "Forfait",
    "Plano",
    "플랜",
    "方案"
  ],
  "historicalContract": [
    "Historical contract",
    "Contrato histórico",
    "Contrat historique",
    "Contrato histórico",
    "기존 계약",
    "历史合同"
  ],
  "currentCatalog": [
    "Current catalog",
    "Catálogo vigente",
    "Catalogue actuel",
    "Catálogo vigente",
    "현재 카탈로그",
    "当前目录"
  ],
  "noCommercialContract": [
    "No commercial contract",
    "Sin contrato comercial",
    "Aucun contrat commercial",
    "Sem contrato comercial",
    "상업 계약 없음",
    "无商业合同"
  ],
  "rate": [
    "Rate",
    "Tarifa",
    "Tarif",
    "Tarifa",
    "요금",
    "费率"
  ],
  "beforeTax": [
    "before tax",
    "antes de impuestos",
    "avant taxes",
    "antes de impostos",
    "세전",
    "税前"
  ],
  "noInterval": [
    "No billing interval",
    "Sin periodicidad",
    "Aucune périodicité",
    "Sem periodicidade",
    "청구 주기 없음",
    "无账单周期"
  ],
  "users": [
    "Users",
    "Usuarios",
    "Utilisateurs",
    "Usuários",
    "사용자",
    "用户"
  ],
  "usageOfCapacity": [
    "{used} of {capacity}",
    "{used} de {capacity}",
    "{used} sur {capacity}",
    "{used} de {capacity}",
    "{used}/{capacity}",
    "{used}/{capacity}"
  ],
  "availableSeats": [
    "Available seats: {count}",
    "Lugares disponibles: {count}",
    "Places disponibles : {count}",
    "Vagas disponíveis: {count}",
    "사용 가능한 자리: {count}",
    "可用名额：{count}"
  ],
  "nextBillingDate": [
    "Next billing date",
    "Próximo corte",
    "Prochaine date de facturation",
    "Próximo vencimento",
    "다음 청구일",
    "下次账单日期"
  ],
  "billingDateHelp": [
    "The charge and scheduled change are reconciled on this date",
    "El cargo y el cambio programado se concilian en esta fecha",
    "Le paiement et le changement prévu sont rapprochés à cette date",
    "A cobrança e a alteração agendada são conciliadas nesta data",
    "이 날짜에 청구와 예정된 변경 사항을 확인합니다",
    "费用与计划变更将在此日期核对"
  ],
  "noScheduledDate": [
    "No scheduled date",
    "Sin fecha programada",
    "Aucune date prévue",
    "Sem data agendada",
    "예정된 날짜 없음",
    "无计划日期"
  ],
  "paymentMethod": [
    "Payment method",
    "Método de pago",
    "Mode de paiement",
    "Forma de pagamento",
    "결제 수단",
    "付款方式"
  ],
  "cardsPrivate": [
    "The owner manages cards in Stripe; Root cannot access card details.",
    "El propietario administra las tarjetas en Stripe; Root no accede a sus datos.",
    "Le propriétaire gère les cartes dans Stripe; Root n’a pas accès à leurs données.",
    "O proprietário gerencia os cartões no Stripe; Root não acessa esses dados.",
    "소유자는 Stripe에서 카드를 관리하며 Root는 카드 정보에 접근할 수 없습니다.",
    "所有者在 Stripe 中管理银行卡；Root 无法访问卡片信息。"
  ],
  "publicCredentialDemo": [
    "Public demo with credentials",
    "Demo pública con credenciales",
    "Démo publique avec identifiants",
    "Demonstração pública com credenciais",
    "인증 정보로 접속하는 공개 데모",
    "使用凭据的公开演示"
  ],
  "publicDemoHelp": [
    "This company will appear on /demo. Existing credentials allow a 60-minute demo session without MFA; normal access is unchanged.",
    "Esta empresa aparecerá en /demo. Sus credenciales existentes permiten una sesión demo de 60 minutos sin MFA; el acceso normal no cambia.",
    "Cette entreprise apparaîtra sur /demo. Ses identifiants permettent une session de démo de 60 minutes sans MFA; l’accès normal reste inchangé.",
    "Esta empresa aparecerá em /demo. As credenciais existentes permitem uma sessão de demonstração de 60 minutos sem MFA; o acesso normal não muda.",
    "이 회사가 /demo에 표시됩니다. 기존 인증 정보로 MFA 없이 60분간 데모를 이용할 수 있으며 일반 접근은 유지됩니다.",
    "此公司将显示在 /demo。现有凭据可开启无需 MFA 的 60 分钟演示会话；正常访问不变。"
  ],
  "openDemoPage": [
    "Open demo page",
    "Abrir página de demos",
    "Ouvrir la page de démos",
    "Abrir página de demonstrações",
    "데모 페이지 열기",
    "打开演示页面"
  ],
  "disablePublicDemo": [
    "Disable public demo",
    "Deshabilitar demo pública",
    "Désactiver la démo publique",
    "Desativar demonstração pública",
    "공개 데모 비활성화",
    "禁用公开演示"
  ],
  "enablePublicDemo": [
    "Enable public demo",
    "Habilitar demo pública",
    "Activer la démo publique",
    "Ativar demonstração pública",
    "공개 데모 활성화",
    "启用公开演示"
  ],
  "enableDemoHelp": [
    "The company will appear on /demo and accept its credentials through the controlled public channel.",
    "La empresa aparecerá en /demo y aceptará sus credenciales por el canal público controlado.",
    "L’entreprise apparaîtra sur /demo et acceptera ses identifiants par le canal public contrôlé.",
    "A empresa aparecerá em /demo e aceitará suas credenciais pelo canal público controlado.",
    "회사가 /demo에 표시되며 통제된 공개 채널에서 인증 정보를 받습니다.",
    "公司将显示在 /demo，并通过受控公开渠道接受其凭据。"
  ],
  "disableDemoHelp": [
    "The company will stop accepting access from /demo; normal sessions will not change.",
    "La empresa dejará de aceptar accesos desde /demo; las sesiones normales no cambiarán.",
    "L’entreprise n’acceptera plus d’accès depuis /demo; les sessions normales resteront inchangées.",
    "A empresa deixará de aceitar acesso por /demo; as sessões normais não mudarão.",
    "회사가 /demo의 접근을 더 이상 허용하지 않으며 일반 세션은 유지됩니다.",
    "公司将停止接受 /demo 的访问；正常会话不变。"
  ],
  "enableDemo": [
    "Enable demo",
    "Habilitar demo",
    "Activer la démo",
    "Ativar demonstração",
    "데모 활성화",
    "启用演示"
  ],
  "disableDemo": [
    "Disable demo",
    "Deshabilitar demo",
    "Désactiver la démo",
    "Desativar demonstração",
    "데모 비활성화",
    "禁用演示"
  ],
  "demoSaveFailed": [
    "The change could not be saved. Review the notice and try again.",
    "No se pudo guardar el cambio. Revisa el aviso operativo y vuelve a intentarlo.",
    "Impossible d’enregistrer le changement. Consultez l’avis et réessayez.",
    "Não foi possível salvar a alteração. Confira o aviso e tente novamente.",
    "변경을 저장할 수 없습니다. 안내를 확인한 후 다시 시도하세요.",
    "无法保存变更。请查看提示并重试。"
  ],
  "demoReason": [
    "Explain why demo access is changing",
    "Explica por qué cambia el acceso demo",
    "Expliquez le changement d’accès à la démo",
    "Explique a alteração no acesso à demonstração",
    "데모 접근 변경 사유를 설명하세요",
    "请说明更改演示访问权限的原因"
  ],
  "accountType": [
    "Account type",
    "Tipo de cuenta",
    "Type de compte",
    "Tipo de conta",
    "계정 유형",
    "账户类型"
  ],
  "billing": [
    "Billing",
    "Facturación",
    "Facturation",
    "Faturamento",
    "청구",
    "账单"
  ],
  "nextEvent": [
    "Next event",
    "Próximo evento",
    "Prochain événement",
    "Próximo evento",
    "다음 일정",
    "下一事件"
  ],
  "actions": [
    "Actions",
    "Acciones",
    "Actions",
    "Ações",
    "작업",
    "操作"
  ],
  "columns": [
    "Columns",
    "Columnas",
    "Colonnes",
    "Colunas",
    "열",
    "列"
  ],
  "more": [
    "More",
    "Más",
    "Plus",
    "Mais",
    "더 보기",
    "更多"
  ],
  "manage": [
    "Manage",
    "Administrar",
    "Gérer",
    "Gerenciar",
    "관리",
    "管理"
  ],
  "editType": [
    "Edit user type",
    "Editar tipo de usuario",
    "Modifier le type d’utilisateur",
    "Editar tipo de usuário",
    "사용자 유형 수정",
    "编辑用户类型"
  ],
  "noAccounts": [
    "No accounts match these filters.",
    "No hay cuentas que coincidan con los filtros.",
    "Aucun compte ne correspond aux filtres.",
    "Nenhuma conta corresponde aos filtros.",
    "필터에 맞는 계정이 없습니다.",
    "没有符合筛选条件的账户。"
  ],
  "noContract": [
    "No contract",
    "Sin contrato",
    "Aucun contrat",
    "Sem contrato",
    "계약 없음",
    "无合同"
  ],
  "monthly": [
    "Monthly",
    "Mensual",
    "Mensuel",
    "Mensal",
    "월간",
    "每月"
  ],
  "annual": [
    "Annual",
    "Anual",
    "Annuel",
    "Anual",
    "연간",
    "每年"
  ],
  "currentCharge": [
    "Current charge",
    "Cobro actual",
    "Montant actuel",
    "Cobrança atual",
    "현재 청구액",
    "当前费用"
  ],
  "nextInvoiceCharge": [
    "Renewal amount",
    "Cargo de renovación",
    "Montant au renouvellement",
    "Valor da renovação",
    "갱신 금액",
    "续订金额"
  ],
  "afterTrial": [
    "After trial",
    "Al terminar la prueba",
    "À la fin de l’essai",
    "Após o teste",
    "체험 종료 후",
    "试用结束后"
  ],
  "estimatedCharge": [
    "Estimated charge",
    "Cargo estimado",
    "Montant estimé",
    "Cobrança estimada",
    "예상 청구액",
    "预计费用"
  ],
  "stripeScheduled": [
    "Scheduled in Stripe",
    "Programado en Stripe",
    "Planifié dans Stripe",
    "Agendado no Stripe",
    "Stripe에서 예정됨",
    "已在 Stripe 中计划"
  ],
  "pendingStripeActivation": [
    "No Stripe · estimate",
    "Sin Stripe · estimación",
    "Sans Stripe · estimation",
    "Sem Stripe · estimativa",
    "Stripe 없음 · 예상액",
    "未连接 Stripe · 估算"
  ],
  "pricePending": [
    "Price pending",
    "Precio pendiente",
    "Prix en attente",
    "Preço pendente",
    "가격 대기 중",
    "价格待定"
  ],
  "configureRate": [
    "Configure rate",
    "Configurar tarifa",
    "Configurer le tarif",
    "Configurar tarifa",
    "요금 설정",
    "配置费率"
  ],
  "activeUsers": [
    "active users",
    "usuarios activos",
    "utilisateurs actifs",
    "usuários ativos",
    "활성 사용자",
    "活跃用户"
  ],
  "manageUsers": [
    "Manage users",
    "Administrar usuarios",
    "Gérer les utilisateurs",
    "Gerenciar usuários",
    "사용자 관리",
    "管理用户"
  ],
  "noActivity": [
    "No activity",
    "Sin movimientos",
    "Aucune activité",
    "Sem movimentações",
    "활동 없음",
    "无活动"
  ],
  "trialEnd": [
    "Trial ends",
    "Fin de prueba",
    "Fin de l’essai",
    "Fim do teste",
    "체험 종료",
    "试用结束"
  ],
  "trialExpired": [
    "Trial expired",
    "Prueba vencida",
    "Essai expiré",
    "Teste expirado",
    "체험 만료",
    "试用已到期"
  ],
  "dayLeftOne": [
    "{count} day left",
    "Queda {count} día",
    "Il reste {count} jour",
    "Resta {count} dia",
    "{count}일 남음",
    "剩余 {count} 天"
  ],
  "dayLeftOther": [
    "{count} days left",
    "Quedan {count} días",
    "Il reste {count} jours",
    "Restam {count} dias",
    "{count}일 남음",
    "剩余 {count} 天"
  ],
  "extendTrial": [
    "Extend trial",
    "Extender prueba",
    "Prolonger l’essai",
    "Estender teste",
    "체험 연장",
    "延长试用"
  ],
  "permanentTrial": [
    "No expiration",
    "Sin vencimiento",
    "Sans expiration",
    "Sem vencimento",
    "만료 없음",
    "永久有效"
  ],
  "renewal": [
    "Renewal",
    "Renovación",
    "Renouvellement",
    "Renovação",
    "갱신",
    "续订"
  ],
  "sort": [
    "Sort",
    "Ordenar",
    "Trier",
    "Ordenar",
    "정렬",
    "排序"
  ],
  "directWithIndice": [
    "Direct with Indice",
    "Directo con Índice",
    "Direct avec Indice",
    "Direto com a Indice",
    "Indice 직접 고객",
    "Indice 直客"
  ],
  "distributorAccount": [
    "Distributor account",
    "Cuenta distribuidora",
    "Compte distributeur",
    "Conta de distribuidor",
    "유통업체 계정",
    "分销商账户"
  ],
  "assignedDistributor": [
    "Assigned distributor",
    "Distribuidor asignado",
    "Distributeur assigné",
    "Distribuidor atribuído",
    "배정된 유통업체",
    "已分配分销商"
  ],
  "assignDistributor": [
    "Assign distributor",
    "Asignar distribuidor",
    "Assigner un distributeur",
    "Atribuir distribuidor",
    "유통업체 배정",
    "分配分销商"
  ],
  "changeDistributor": [
    "Change distributor",
    "Cambiar distribuidor",
    "Changer de distributeur",
    "Alterar distribuidor",
    "유통업체 변경",
    "更改分销商"
  ],
  "deleteAccount": [
    "Delete account",
    "Eliminar cuenta",
    "Supprimer le compte",
    "Excluir conta",
    "계정 삭제",
    "删除账户"
  ],
  "createdByDistributor": [
    "Created by distributor",
    "Creado por distribuidor",
    "Créé par un distributeur",
    "Criado pelo distribuidor",
    "유통업체가 생성함",
    "由分销商创建"
  ],
  "createdByIndice": [
    "Created by Indice",
    "Creado por Índice",
    "Créé par Indice",
    "Criado pela Indice",
    "Indice가 생성함",
    "由 Indice 创建"
  ],
  "webRegistration": [
    "Web self-registration",
    "Registro directo en web",
    "Inscription libre sur le Web",
    "Cadastro direto na web",
    "웹 직접 등록",
    "网页自助注册"
  ],
  "historicalOrigin": [
    "Historical origin",
    "Origen histórico",
    "Origine historique",
    "Origem histórica",
    "기존 출처",
    "历史来源"
  ],
  "traceabilityUnavailable": [
    "Traceability unavailable",
    "Sin trazabilidad disponible",
    "Traçabilité indisponible",
    "Rastreabilidade indisponível",
    "추적 정보 없음",
    "无可用追溯信息"
  ],
  "currentDistributor": [
    "Current distributor",
    "Distribuidor actual",
    "Distributeur actuel",
    "Distribuidor atual",
    "현재 유통업체",
    "当前分销商"
  ],
  "noCurrentDistributor": [
    "No current distributor",
    "Sin distribuidor actual",
    "Aucun distributeur actuel",
    "Sem distribuidor atual",
    "현재 유통업체 없음",
    "无当前分销商"
  ],
  "currentPortfolio": [
    "Current portfolio",
    "Cartera vigente",
    "Portefeuille actuel",
    "Carteira atual",
    "현재 고객군",
    "当前客户组合"
  ],
  "createdBy": [
    "Created by {name}",
    "Creada por {name}",
    "Créé par {name}",
    "Criado por {name}",
    "{name}이(가) 생성함",
    "由 {name} 创建"
  ],
  "indiceNetwork": [
    "Indice commercial network",
    "Red comercial de Índice",
    "Réseau commercial d’Indice",
    "Rede comercial da Indice",
    "Indice 거래 네트워크",
    "Indice 商业网络"
  ],
  "distributorOrigin": [
    "Distributor origin",
    "Origen distribuidor",
    "Origine distributeur",
    "Origem do distribuidor",
    "유통업체 경유",
    "分销商来源"
  ],
  "webSignup": [
    "Web registration",
    "Registro web",
    "Inscription Web",
    "Cadastro web",
    "웹 등록",
    "网页注册"
  ],
  "directSignup": [
    "Direct customer registration",
    "Alta directa del cliente",
    "Inscription directe du client",
    "Cadastro direto do cliente",
    "고객 직접 등록",
    "客户直接注册"
  ],
  "adminSignup": [
    "Created in Administration",
    "Alta desde Administración",
    "Créé dans l’administration",
    "Criado na Administração",
    "관리 화면에서 생성됨",
    "在管理后台创建"
  ],
  "noSignupHistory": [
    "No registration history",
    "Sin trazabilidad de alta",
    "Aucun historique d’inscription",
    "Sem histórico de cadastro",
    "등록 이력 없음",
    "无注册历史"
  ],
  "resizeColumn": [
    "Resize {name} column",
    "Ajustar columna {name}",
    "Redimensionner la colonne {name}",
    "Ajustar coluna {name}",
    "{name} 열 크기 조정",
    "调整 {name} 列宽"
  ],
  "oneModule": [
    "One module",
    "Un módulo",
    "Un module",
    "Um módulo",
    "모듈 1개",
    "一个模块"
  ],
  "twoModules": [
    "Two modules",
    "Dos módulos",
    "Deux modules",
    "Dois módulos",
    "모듈 2개",
    "两个模块"
  ],
  "threeModules": [
    "Three modules",
    "Tres módulos",
    "Trois modules",
    "Três módulos",
    "모듈 3개",
    "三个模块"
  ],
  "fourModules": [
    "Four or more modules",
    "Cuatro o más módulos",
    "Quatre modules ou plus",
    "Quatro ou mais módulos",
    "모듈 4개 이상",
    "四个或更多模块"
  ],
  "distributor": [
    "Distributor",
    "Distribuidor",
    "Distributeur",
    "Distribuidor",
    "유통업체",
    "分销商"
  ],
  "deleted": [
    "Deleted",
    "Eliminado",
    "Supprimé",
    "Excluído",
    "삭제됨",
    "已删除"
  ],
  "saveType": [
    "Save type",
    "Guardar tipo",
    "Enregistrer le type",
    "Salvar tipo",
    "유형 저장",
    "保存类型"
  ],
  "customer": [
    "customer",
    "cliente",
    "client",
    "cliente",
    "고객",
    "客户"
  ],
  "typeReason": [
    "Explain why this account classification is changing",
    "Explica por qué cambia la clasificación de esta cuenta",
    "Expliquez le changement de classification du compte",
    "Explique a alteração da classificação desta conta",
    "계정 분류 변경 사유를 설명하세요",
    "请说明更改账户分类的原因"
  ],
  "rootAuditHelp": [
    "This reason will be stored in the Root audit trail.",
    "Este motivo quedará guardado en la auditoría Root.",
    "Ce motif sera enregistré dans la piste d’audit Root.",
    "Este motivo será salvo no registro de auditoria Root.",
    "이 사유는 Root 감사 기록에 저장됩니다.",
    "此原因将保存在 Root 审计记录中。"
  ],
  "rootRoleHelp": [
    "Root access is controlled separately by platform security and cannot be assigned here.",
    "El acceso Root se controla por separado desde la seguridad de plataforma y no puede asignarse aquí.",
    "L’accès Root est géré séparément par la sécurité de la plateforme et ne peut être attribué ici.",
    "O acesso Root é controlado separadamente pela segurança da plataforma e não pode ser atribuído aqui.",
    "Root 접근 권한은 플랫폼 보안에서 별도로 관리하며 여기서 배정할 수 없습니다.",
    "Root 访问权限由平台安全单独控制，无法在此分配。"
  ],
  "commercialRelationship": [
    "Commercial relationship",
    "Relación comercial",
    "Relation commerciale",
    "Relação comercial",
    "거래 관계",
    "商业关系"
  ],
  "removeDistributor": [
    "Remove relationship",
    "Desvincular distribuidor",
    "Retirer la relation",
    "Desvincular distribuidor",
    "연결 해제",
    "解除关联"
  ],
  "noDistributors": [
    "There are no distributor accounts available. Create one or change an eligible account to Distributor first.",
    "No hay cuentas distribuidoras disponibles. Primero crea una o cambia una cuenta elegible a Distribuidor.",
    "Aucun compte distributeur disponible. Créez-en un ou convertissez d’abord un compte admissible en distributeur.",
    "Não há contas de distribuidor disponíveis. Crie uma ou altere uma conta elegível para Distribuidor.",
    "사용 가능한 유통업체 계정이 없습니다. 먼저 만들거나 적격 계정 유형을 유통업체로 변경하세요.",
    "没有可用的分销商账户。请先创建一个，或将符合条件的账户改为分销商。"
  ],
  "currentDirectOrigin": [
    "Current origin: Direct with Indice",
    "Origen actual: Directo con Índice",
    "Origine actuelle : Direct avec Indice",
    "Origem atual: Direto com a Indice",
    "현재 출처: Indice 직접 고객",
    "当前来源：Indice 直客"
  ],
  "commercialOrigin": [
    "Commercial origin",
    "Origen comercial",
    "Origine commerciale",
    "Origem comercial",
    "거래 출처",
    "商业来源"
  ],
  "relationshipReason": [
    "Explain the commercial relationship change",
    "Explica el cambio de relación comercial",
    "Expliquez le changement de relation commerciale",
    "Explique a alteração da relação comercial",
    "거래 관계 변경을 설명하세요",
    "请说明商业关系变更"
  ],
  "relationshipHelp": [
    "This relationship identifies the distributor of origin for the client, enables distributor-preferred consulting, and is recorded in the Root audit trail.",
    "Esta relación identifica al distribuidor de origen del cliente, habilita la preferencia de consultoría con su distribuidor y queda registrada en la auditoría Root.",
    "Cette relation identifie le distributeur d’origine du client, active la préférence de conseil auprès de celui-ci et est enregistrée dans l’audit Root.",
    "Esta relação identifica o distribuidor de origem do cliente, habilita a preferência de consultoria com ele e fica registrada na auditoria Root.",
    "이 관계는 고객의 원래 유통업체를 식별하고 해당 업체 우선 상담을 활성화하며 Root 감사에 기록됩니다.",
    "此关系标识客户的来源分销商，启用优先分销商咨询，并记录在 Root 审计日志中。"
  ],
  "controlledTrial": [
    "Controlled trial",
    "Prueba controlada",
    "Essai encadré",
    "Teste controlado",
    "관리형 체험",
    "受控试用"
  ],
  "trialBalance": [
    "Current balance: {count} days",
    "Saldo actual: {count} días",
    "Solde actuel : {count} jours",
    "Saldo atual: {count} dias",
    "현재 잔여 일수: {count}일",
    "当前剩余：{count} 天"
  ],
  "addDays": [
    "Add {count} days",
    "Agregar {count} días",
    "Ajouter {count} jours",
    "Adicionar {count} dias",
    "{count}일 추가",
    "增加 {count} 天"
  ],
  "extending": [
    "Extending...",
    "Extendiendo...",
    "Prolongation…",
    "Estendendo…",
    "연장 중…",
    "正在延长…"
  ],
  "currentEnd": [
    "Current end",
    "Vencimiento actual",
    "Échéance actuelle",
    "Vencimento atual",
    "현재 만료일",
    "当前到期日"
  ],
  "noExpirationDate": [
    "No expiration date",
    "Sin fecha de vencimiento",
    "Aucune date d’expiration",
    "Sem data de vencimento",
    "만료일 없음",
    "无到期日期"
  ],
  "trialLimit": [
    "days, once only; maximum 30 total",
    "días, una sola vez; máximo 30 en total",
    "jours, une seule fois; maximum de 30 au total",
    "dias, uma única vez; máximo de 30 no total",
    "일, 한 번만 가능하며 총 30일이 최대입니다",
    "天，仅限一次；总计最多 30 天"
  ],
  "consultationConfirm": [
    "I confirm the consultation session was completed.",
    "Confirmo que la sesión de consultoría se realizó.",
    "Je confirme que la séance de consultation a eu lieu.",
    "Confirmo que a sessão de consultoria foi realizada.",
    "상담 세션이 완료되었음을 확인합니다.",
    "我确认咨询会话已完成。"
  ],
  "trialPreservation": [
    "Only the trial end date changes. Modules and users stay intact, and Stripe does not charge now.",
    "Sólo cambia la fecha de fin de prueba. Los módulos y usuarios se conservan, y Stripe no realiza un cargo ahora.",
    "Seule la fin de l’essai change. Les modules et utilisateurs sont conservés; Stripe ne facture rien maintenant.",
    "Só a data final do teste muda. Módulos e usuários são mantidos, e o Stripe não cobra agora.",
    "체험 종료일만 변경됩니다. 모듈과 사용자는 유지되며 Stripe는 지금 청구하지 않습니다.",
    "仅更改试用结束日期。模块和用户保持不变，Stripe 现在不会收费。"
  ],
  "previewFailed": [
    "The new total could not be calculated.",
    "No se pudo calcular el nuevo total.",
    "Impossible de calculer le nouveau total.",
    "Não foi possível calcular o novo total.",
    "새 합계를 계산할 수 없습니다.",
    "无法计算新的总额。"
  ],
  "available": [
    "Available",
    "Disponible",
    "Disponible",
    "Disponível",
    "사용 가능",
    "可用"
  ],
  "package": [
    "Package",
    "Paquete",
    "Ensemble",
    "Pacote",
    "패키지",
    "套餐"
  ],
  "individualModule": [
    "Individual module",
    "Módulo individual",
    "Module individuel",
    "Módulo individual",
    "개별 모듈",
    "单独模块"
  ],
  "basePackage": [
    "Base package",
    "Paquete base",
    "Forfait de base",
    "Pacote básico",
    "기본 패키지",
    "基础套餐"
  ],
  "addon": [
    "Add-on",
    "Complemento",
    "Module complémentaire",
    "Complemento",
    "추가 기능",
    "附加项"
  ],
  "courtesyAccess": [
    "Courtesy access",
    "Acceso de cortesía",
    "Accès de courtoisie",
    "Acesso de cortesia",
    "무료 제공 접근",
    "赠送访问"
  ],
  "perMonth": [
    "per month",
    "por mes",
    "par mois",
    "por mês",
    "월별",
    "每月"
  ],
  "keepProductHint": [
    "Keep this product in the next billing selection",
    "Conservar este producto en la selección del próximo corte",
    "Conserver ce produit pour la prochaine facturation",
    "Manter este produto na seleção do próximo vencimento",
    "다음 청구 선택에 이 제품 유지",
    "在下次账单选择中保留此产品"
  ],
  "keepProduct": [
    "Keep {name}",
    "Conservar {name}",
    "Conserver {name}",
    "Manter {name}",
    "{name} 유지",
    "保留 {name}"
  ],
  "keep": [
    "Keep",
    "Conservar",
    "Conserver",
    "Manter",
    "유지",
    "保留"
  ],
  "removePreviewHint": [
    "Review the new total before removing",
    "Revisar el nuevo total antes de quitar",
    "Vérifier le nouveau total avant de retirer",
    "Revisar o novo total antes de remover",
    "제거 전 새 합계 확인",
    "移除前查看新的总额"
  ],
  "retainSubscriptionProduct": [
    "The subscription must retain at least one product",
    "La suscripción debe conservar al menos un producto",
    "L’abonnement doit conserver au moins un produit",
    "A assinatura deve manter ao menos um produto",
    "구독에 최소 한 개의 제품을 유지해야 합니다",
    "订阅必须至少保留一个产品"
  ],
  "removeProduct": [
    "Remove {name}",
    "Quitar {name}",
    "Retirer {name}",
    "Remover {name}",
    "{name} 제거",
    "移除 {name}"
  ],
  "remove": [
    "Remove",
    "Quitar",
    "Retirer",
    "Remover",
    "제거",
    "移除"
  ],
  "removeAccess": [
    "Remove access",
    "Quitar acceso",
    "Retirer l’accès",
    "Remover acesso",
    "접근 권한 제거",
    "移除访问权限"
  ],
  "removeScheduledHint": [
    "Remove this product from the scheduled change",
    "Quitar este producto del cambio programado",
    "Retirer ce produit du changement prévu",
    "Remover este produto da alteração agendada",
    "예정된 변경에서 제품 제거",
    "从计划变更中移除此产品"
  ],
  "retainSelectionProduct": [
    "The selection must retain at least one product",
    "La selección debe conservar al menos un producto",
    "La sélection doit conserver au moins un produit",
    "A seleção deve manter ao menos um produto",
    "선택에 최소 한 개의 제품을 유지해야 합니다",
    "选择必须至少保留一个产品"
  ],
  "removeScheduledProduct": [
    "Remove {name} from the scheduled change",
    "Quitar {name} del cambio programado",
    "Retirer {name} du changement prévu",
    "Remover {name} da alteração agendada",
    "예정된 변경에서 {name} 제거",
    "从计划变更中移除 {name}"
  ],
  "removeFromChange": [
    "Remove from change",
    "Quitar del cambio",
    "Retirer du changement",
    "Remover da alteração",
    "변경에서 제거",
    "从变更中移除"
  ],
  "addPreviewHint": [
    "Review the new total before adding",
    "Revisar el nuevo total antes de agregar",
    "Vérifier le nouveau total avant d’ajouter",
    "Revisar o novo total antes de adicionar",
    "추가 전 새 합계 확인",
    "添加前查看新的总额"
  ],
  "addProduct": [
    "Add {name}",
    "Agregar {name}",
    "Ajouter {name}",
    "Adicionar {name}",
    "{name} 추가",
    "添加 {name}"
  ],
  "add": [
    "Add",
    "Agregar",
    "Ajouter",
    "Adicionar",
    "추가",
    "添加"
  ],
  "addAccess": [
    "Add access",
    "Agregar acceso",
    "Ajouter un accès",
    "Adicionar acesso",
    "접근 권한 추가",
    "添加访问权限"
  ],
  "planModules": [
    "Plan and modules",
    "Plan y módulos",
    "Forfait et modules",
    "Plano e módulos",
    "플랜 및 모듈",
    "方案和模块"
  ],
  "planModulesHelp": [
    "Review the current contract, courtesy access and available offer before changing Stripe.",
    "Distingue el contrato vigente, los accesos de cortesía y la oferta disponible antes de modificar Stripe.",
    "Vérifiez le contrat actuel, les accès de courtoisie et l’offre disponible avant de modifier Stripe.",
    "Revise o contrato vigente, os acessos de cortesia e a oferta disponível antes de alterar o Stripe.",
    "Stripe 변경 전에 현재 계약, 무료 접근 및 제공 상품을 확인하세요.",
    "更改 Stripe 前，请查看当前合同、赠送访问和可用方案。"
  ],
  "historicalMigration": [
    "This account retains catalog {current}. Any confirmed change moves its entire selection to {next} and applies the new total at the next renewal.",
    "Esta cuenta conserva el catálogo {current}. Cualquier cambio confirmado migrará toda su selección a {next} y aplicará el nuevo total en la siguiente renovación.",
    "Ce compte conserve le catalogue {current}. Tout changement confirmé migre toute sa sélection vers {next} et applique le nouveau total au prochain renouvellement.",
    "Esta conta mantém o catálogo {current}. Qualquer alteração confirmada migra toda a seleção para {next} e aplica o novo total na próxima renovação.",
    "이 계정은 카탈로그 {current}을(를) 유지합니다. 변경을 확정하면 전체 선택이 {next}(으)로 이동하고 다음 갱신 때 새 합계가 적용됩니다.",
    "此账户保留目录 {current}。确认任何变更后，全部选择将迁移到 {next}，并在下次续订时应用新的总额。"
  ],
  "historical": [
    "historical",
    "histórico",
    "historique",
    "histórico",
    "기존 버전",
    "历史版本"
  ],
  "activeVersion": [
    "the active version",
    "la versión activa",
    "la version active",
    "a versão ativa",
    "활성 버전",
    "当前有效版本"
  ],
  "stripeChangePending": [
    "Change awaiting Stripe confirmation",
    "Cambio pendiente de confirmar con Stripe",
    "Changement en attente de confirmation Stripe",
    "Alteração aguardando confirmação do Stripe",
    "Stripe 확인 대기 중인 변경",
    "变更正等待 Stripe 确认"
  ],
  "contractChangeScheduled": [
    "Contract change scheduled",
    "Cambio contractual programado",
    "Changement contractuel planifié",
    "Alteração contratual agendada",
    "계약 변경 예정됨",
    "合同变更已计划"
  ],
  "contractDraft": [
    "Inactive contract draft",
    "Borrador de contratación sin activar",
    "Brouillon de contrat non activé",
    "Rascunho de contrato não ativado",
    "미활성 계약 초안",
    "未启用的合同草稿"
  ],
  "retrySync": [
    "Retry pending synchronization",
    "Reintentar la sincronización pendiente",
    "Réessayer la synchronisation en attente",
    "Tentar novamente a sincronização pendente",
    "대기 중인 동기화 다시 시도",
    "重试待处理同步"
  ],
  "reviewing": [
    "Reviewing…",
    "Revisando…",
    "Vérification…",
    "Revisando…",
    "검토 중…",
    "正在检查…"
  ],
  "retry": [
    "Retry",
    "Reintentar",
    "Réessayer",
    "Tentar novamente",
    "다시 시도",
    "重试"
  ],
  "noProducts": [
    "No products",
    "Sin productos",
    "Aucun produit",
    "Sem produtos",
    "제품 없음",
    "无产品"
  ],
  "appliesAfterPayment": [
    "Applies after the payment on {date}.",
    "Se aplicará después del cobro del {date}.",
    "S’applique après le paiement du {date}.",
    "Será aplicado após o pagamento de {date}.",
    "{date} 결제 후 적용됩니다.",
    "将在 {date} 付款后应用。"
  ],
  "noAccessUntilStripe": [
    "No access or charges until Stripe setup is complete.",
    "No concede acceso ni genera cargos hasta completar Stripe.",
    "Aucun accès ni frais avant la finalisation dans Stripe.",
    "Não concede acesso nem gera cobranças até concluir o Stripe.",
    "Stripe 설정이 완료될 때까지 접근 권한이나 청구가 발생하지 않습니다.",
    "完成 Stripe 设置前，不会授予访问权限或产生费用。"
  ],
  "confirmCommercialChange": [
    "Confirm the commercial change",
    "Confirma el cambio comercial",
    "Confirmer le changement commercial",
    "Confirme a alteração comercial",
    "상업적 변경 확인",
    "确认商业变更"
  ],
  "noImmediateCharge": [
    "There is no proration or immediate charge; access changes apply after payment on the billing date.",
    "No habrá prorrateo ni cargo inmediato; el cambio de acceso se aplicará después del cobro en la fecha de corte.",
    "Aucun prorata ni frais immédiats; les accès changent après le paiement à la date de facturation.",
    "Não haverá cobrança proporcional nem imediata; o acesso muda após o pagamento no vencimento.",
    "일할 계산이나 즉시 청구 없이 청구일 결제 후 접근 권한이 변경됩니다.",
    "不会按比例计费或立即收费；访问变更将在账单日付款后应用。"
  ],
  "newVersion": [
    "New version",
    "Nueva versión",
    "Nouvelle version",
    "Nova versão",
    "새 버전",
    "新版本"
  ],
  "newTotal": [
    "New total",
    "Nuevo total",
    "Nouveau total",
    "Novo total",
    "새 합계",
    "新总额"
  ],
  "priceUnavailable": [
    "Price unavailable",
    "Precio no disponible",
    "Prix indisponible",
    "Preço indisponível",
    "가격 정보 없음",
    "价格不可用"
  ],
  "application": [
    "Application",
    "Aplicación",
    "Application",
    "Aplicação",
    "적용",
    "应用"
  ],
  "billingDate": [
    "Billing date",
    "Fecha de corte",
    "Date de facturation",
    "Data de vencimento",
    "청구일",
    "账单日期"
  ],
  "confirmChange": [
    "Confirm change",
    "Confirmar cambio",
    "Confirmer le changement",
    "Confirmar alteração",
    "변경 확인",
    "确认变更"
  ],
  "currentContractAccess": [
    "Current contract and access",
    "Contrato y accesos vigentes",
    "Contrat et accès actuels",
    "Contrato e acessos vigentes",
    "현재 계약 및 접근",
    "当前合同与访问"
  ],
  "originalPriceHelp": [
    "Shown with the version and price that originally granted access.",
    "Se muestran con la versión y el precio que realmente originaron el acceso.",
    "Affichés avec la version et le prix ayant accordé l’accès initial.",
    "Exibidos com a versão e o preço que originaram o acesso.",
    "원래 접근 권한을 부여한 버전과 가격으로 표시됩니다.",
    "显示最初授予访问权限时的版本和价格。"
  ],
  "noActiveProducts": [
    "The account has no active products yet.",
    "La cuenta todavía no tiene productos activos.",
    "Ce compte n’a pas encore de produits actifs.",
    "A conta ainda não tem produtos ativos.",
    "아직 활성 제품이 없는 계정입니다.",
    "此账户尚无已启用产品。"
  ],
  "availableOffer": [
    "Available offer",
    "Oferta disponible",
    "Offre disponible",
    "Oferta disponível",
    "제공 상품",
    "可用方案"
  ],
  "publishedProductsHelp": [
    "Published products in the active version that are not yet included in access.",
    "Productos publicados de la versión activa que aún no forman parte del acceso.",
    "Produits publiés de la version active qui ne sont pas encore inclus dans l’accès.",
    "Produtos publicados da versão ativa que ainda não fazem parte do acesso.",
    "활성 버전에 게시되었지만 아직 접근 권한에 포함되지 않은 제품입니다.",
    "当前有效版本中已发布但尚未包含在访问权限内的产品。"
  ],
  "allOfferIncluded": [
    "This account already includes the entire available offer.",
    "Esta cuenta ya tiene toda la oferta disponible.",
    "Ce compte inclut déjà toute l’offre disponible.",
    "Esta conta já tem toda a oferta disponível.",
    "이 계정은 이미 모든 제공 상품을 포함합니다.",
    "此账户已包含全部可用方案。"
  ],
  "stripeTrialChanges": [
    "Stripe does not charge during the trial. Confirmed changes define the total and access after payment when the trial ends.",
    "Stripe no cobra durante la prueba. Los cambios confirmados definen el total y el acceso que comenzarán después del cobro al vencer.",
    "Stripe ne facture rien pendant l’essai. Les changements confirmés définissent le total et l’accès après le paiement à la fin de l’essai.",
    "O Stripe não cobra durante o teste. Alterações confirmadas definem o total e o acesso após o pagamento no término.",
    "Stripe는 체험 중 청구하지 않습니다. 확정된 변경은 체험 종료 시 결제 후의 합계와 접근 권한을 결정합니다.",
    "Stripe 在试用期间不收费。确认的变更决定试用结束付款后的总额和访问权限。"
  ],
  "stripeRenewalChanges": [
    "Changes are scheduled in Stripe without proration or an immediate charge; new access applies after payment on the billing date.",
    "Los cambios se programan en Stripe sin prorrateo ni cobro inmediato; el nuevo acceso se aplica después del pago en la fecha de corte.",
    "Les changements sont planifiés dans Stripe sans prorata ni frais immédiats; le nouvel accès s’applique après le paiement à l’échéance.",
    "As alterações são agendadas no Stripe sem cobrança proporcional ou imediata; o novo acesso vale após o pagamento no vencimento.",
    "변경은 일할 계산이나 즉시 청구 없이 Stripe에 예약되며 청구일 결제 후 새 접근 권한이 적용됩니다.",
    "变更在 Stripe 中计划，不按比例或立即收费；新访问权限在账单日付款后生效。"
  ],
  "courtesyIndependent": [
    "Courtesy access is independent of the commercial draft and does not create automatic charges.",
    "Los accesos de cortesía son independientes del borrador comercial y no generan cargos automáticos.",
    "Les accès de courtoisie sont indépendants du brouillon commercial et ne génèrent aucun frais automatique.",
    "Os acessos de cortesia são independentes do rascunho comercial e não geram cobranças automáticas.",
    "무료 접근은 상업적 초안과 별개이며 자동 청구를 발생시키지 않습니다.",
    "赠送访问独立于商业草稿，不会产生自动费用。"
  ],
  "requestPayment": [
    "Request payment",
    "Solicitar pago",
    "Demander un paiement",
    "Solicitar pagamento",
    "결제 요청",
    "请求付款"
  ],
  "signalPayment": [
    "Past-due or failed payment",
    "Cobro vencido o fallido",
    "Paiement en retard ou échoué",
    "Pagamento vencido ou falhou",
    "연체 또는 실패한 결제",
    "逾期或失败的付款"
  ],
  "signalPaymentAction": [
    "Collect payment and confirm continuity",
    "Gestionar cobro y confirmar continuidad",
    "Recouvrer le paiement et confirmer la continuité",
    "Cobrar e confirmar continuidade",
    "결제를 처리하고 서비스 지속 여부 확인",
    "收取付款并确认服务持续"
  ],
  "signalAccess": [
    "Account without operational access",
    "Cuenta sin acceso operativo",
    "Compte sans accès opérationnel",
    "Conta sem acesso operacional",
    "업무 접근 권한이 없는 계정",
    "无业务访问权限的账户"
  ],
  "signalAccessAction": [
    "Review contract, access and commercial status",
    "Revisar contrato, acceso y estado comercial",
    "Vérifier le contrat, l’accès et l’état commercial",
    "Revisar contrato, acesso e status comercial",
    "계약, 접근 및 거래 상태 검토",
    "查看合同、访问权限和商业状态"
  ],
  "signalPricing": [
    "Rate or projection pending",
    "Tarifa o proyección pendiente",
    "Tarif ou projection en attente",
    "Tarifa ou projeção pendente",
    "요금 또는 예상액 대기 중",
    "费率或预测待定"
  ],
  "signalPricingAction": [
    "Set the rate and validate billing",
    "Definir tarifa y validar la facturación",
    "Définir le tarif et valider la facturation",
    "Definir tarifa e validar faturamento",
    "요금 설정 및 청구 확인",
    "设置费率并核对账单"
  ],
  "signalTrialExpiredAction": [
    "Close, extend or convert the trial",
    "Cerrar, extender o convertir la prueba",
    "Fermer, prolonger ou convertir l’essai",
    "Encerrar, estender ou converter o teste",
    "체험 종료, 연장 또는 전환",
    "结束、延长或转换试用"
  ],
  "trialEndingSoon": [
    "Trial ending soon",
    "Prueba por vencer",
    "Essai bientôt terminé",
    "Teste perto do fim",
    "곧 종료되는 체험",
    "试用即将到期"
  ],
  "signalTrialEndingAction": [
    "Contact the customer and define the next step",
    "Contactar y definir el siguiente paso",
    "Contacter le client et définir la prochaine étape",
    "Contatar o cliente e definir o próximo passo",
    "고객에게 연락하여 다음 단계 결정",
    "联系客户并确定下一步"
  ],
  "noOwnerContact": [
    "No owner contact",
    "Sin contacto propietario",
    "Aucun contact du propriétaire",
    "Sem contato do proprietário",
    "소유자 연락처 없음",
    "无所有者联系信息"
  ],
  "signalOwnerAction": [
    "Register the customer owner",
    "Registrar al responsable del cliente",
    "Inscrire le responsable du client",
    "Cadastrar o responsável pelo cliente",
    "고객 담당자 등록",
    "登记客户负责人"
  ],
  "noPlanModulesDefined": [
    "No plan or modules defined",
    "Sin plan o módulos definidos",
    "Aucun forfait ni module défini",
    "Sem plano ou módulos definidos",
    "정해진 플랜이나 모듈 없음",
    "未定义方案或模块"
  ],
  "signalOfferAction": [
    "Configure the contracted offer",
    "Configurar la oferta contratada",
    "Configurer l’offre souscrite",
    "Configurar a oferta contratada",
    "계약 상품 구성",
    "配置已签约方案"
  ],
  "noActiveUsersLabel": [
    "No active users",
    "Sin usuarios activos",
    "Aucun utilisateur actif",
    "Sem usuários ativos",
    "활성 사용자 없음",
    "无活跃用户"
  ],
  "signalAdoptionAction": [
    "Schedule activation and review adoption",
    "Agendar activación y revisar adopción",
    "Planifier l’activation et vérifier l’adoption",
    "Agendar ativação e revisar adoção",
    "활성화 예약 및 사용 현황 확인",
    "安排启用并查看使用情况"
  ],
  "criticalReview": [
    "Critical review",
    "Revisión crítica",
    "Vérification prioritaire",
    "Revisão crítica",
    "중요 검토",
    "重点审查"
  ],
  "billingOrAccess": [
    "Billing or access",
    "Cobro o acceso",
    "Facturation ou accès",
    "Cobrança ou acesso",
    "청구 또는 접근",
    "账单或访问权限"
  ],
  "trialsEnding": [
    "Trials ending",
    "Pruebas por vencer",
    "Essais bientôt terminés",
    "Testes perto do fim",
    "종료 예정 체험",
    "即将到期的试用"
  ],
  "nextSevenDays": [
    "Next 7 days",
    "Próximos 7 días",
    "Les 7 prochains jours",
    "Próximos 7 dias",
    "다음 7일",
    "未来 7 天"
  ],
  "offerPending": [
    "Offer pending",
    "Oferta pendiente",
    "Offre en attente",
    "Oferta pendente",
    "상품 대기 중",
    "方案待定"
  ],
  "noPlanModules": [
    "No plan or modules",
    "Sin plan o módulos",
    "Aucun forfait ni module",
    "Sem plano ou módulos",
    "플랜이나 모듈 없음",
    "无方案或模块"
  ],
  "noAdoption": [
    "No adoption",
    "Sin adopción",
    "Aucune adoption",
    "Sem adoção",
    "사용 이력 없음",
    "未开始使用"
  ],
  "portfolioCommand": [
    "Portfolio management",
    "Mando de cartera",
    "Gestion du portefeuille",
    "Gestão da carteira",
    "고객군 관리",
    "客户组合管理"
  ],
  "attentionToday": [
    "Decide what needs attention today",
    "Decide qué cliente necesita atención hoy",
    "Déterminez les clients à prioriser aujourd’hui",
    "Decida qual cliente precisa de atenção hoje",
    "오늘 살펴볼 고객을 결정하세요",
    "确定今天需要关注的客户"
  ],
  "priorityDataHelp": [
    "Priorities are calculated from real access, billing, trial and adoption data.",
    "Las prioridades se calculan con datos reales de acceso, cobro, prueba y adopción.",
    "Les priorités sont calculées à partir des données réelles d’accès, de facturation, d’essai et d’adoption.",
    "As prioridades são calculadas com dados reais de acesso, cobrança, teste e adoção.",
    "우선순위는 실제 접근, 청구, 체험 및 사용 데이터를 바탕으로 계산됩니다.",
    "优先级依据实际访问、账单、试用和使用数据计算。"
  ],
  "topPriorities": [
    "Top priorities: {count}",
    "Prioridades principales: {count}",
    "Priorités principales : {count}",
    "Prioridades principais: {count}",
    "주요 우선순위: {count}",
    "首要事项：{count}"
  ],
  "portfolioUnderControl": [
    "Portfolio under control",
    "Cartera bajo control",
    "Portefeuille sous contrôle",
    "Carteira sob controle",
    "고객군 관리 양호",
    "客户组合状况正常"
  ],
  "nextActions": [
    "Recommended next actions",
    "Siguientes acciones recomendadas",
    "Prochaines actions recommandées",
    "Próximas ações recomendadas",
    "권장 다음 작업",
    "建议的后续操作"
  ],
  "highestRiskFirst": [
    "Highest-risk customers appear first.",
    "Los clientes con mayor riesgo aparecen primero.",
    "Les clients les plus à risque apparaissent en premier.",
    "Os clientes com maior risco aparecem primeiro.",
    "위험도가 높은 고객부터 표시됩니다.",
    "风险最高的客户优先显示。"
  ],
  "indiceTeam": [
    "Indice team",
    "Equipo Índice",
    "Équipe Indice",
    "Equipe Indice",
    "Indice 팀",
    "Indice 团队"
  ],
  "responsible": [
    "Responsible",
    "Responsable",
    "Responsable",
    "Responsável",
    "담당자",
    "负责人"
  ],
  "review": [
    "Review",
    "Revisar",
    "Vérifier",
    "Revisar",
    "검토",
    "查看"
  ],
  "noImmediateRisks": [
    "No immediate operational risks.",
    "No hay riesgos operativos inmediatos.",
    "Aucun risque opérationnel immédiat.",
    "Nenhum risco operacional imediato.",
    "즉각적인 업무 위험이 없습니다.",
    "无紧迫的运营风险。"
  ],
  "monitorRenewals": [
    "Continue monitoring adoption and upcoming renewals.",
    "Continúa monitoreando adopción y próximas renovaciones.",
    "Continuez à surveiller l’adoption et les prochains renouvellements.",
    "Continue acompanhando a adoção e as próximas renovações.",
    "사용 현황과 예정된 갱신을 계속 확인하세요.",
    "请继续关注使用情况和即将到来的续订。"
  ],
  "userNameRequired": [
    "The user’s name is required.",
    "El nombre del usuario es obligatorio.",
    "Le nom de l’utilisateur est obligatoire.",
    "O nome do usuário é obrigatório.",
    "사용자 이름이 필요합니다.",
    "必须填写用户姓名。"
  ],
  "validEmailRequired": [
    "Enter a valid email address.",
    "Ingresa un correo electrónico válido.",
    "Saisissez une adresse courriel valide.",
    "Informe um endereço de e-mail válido.",
    "유효한 이메일 주소를 입력하세요.",
    "请输入有效的邮箱地址。"
  ],
  "noUserModules": [
    "This account has no active modules to assign to the user.",
    "La cuenta no tiene módulos activos para asignar al usuario.",
    "Ce compte n’a aucun module actif à attribuer à l’utilisateur.",
    "A conta não tem módulos ativos para atribuir ao usuário.",
    "계정에 사용자에게 배정할 활성 모듈이 없습니다.",
    "此账户没有可分配给用户的已启用模块。"
  ],
  "invitationNotPending": [
    "The invitation is no longer pending.",
    "La invitación ya no está pendiente.",
    "L’invitation n’est plus en attente.",
    "O convite não está mais pendente.",
    "초대가 더 이상 대기 중이 아닙니다.",
    "此邀请已不再处于待处理状态。"
  ],
  "protectedOwnerError": [
    "The account owner or Super Admin cannot be deactivated here.",
    "El propietario o Super Admin de la cuenta no puede desactivarse aquí.",
    "Le propriétaire ou le super administrateur ne peut pas être désactivé ici.",
    "O proprietário ou Super Admin da conta não pode ser desativado aqui.",
    "여기서 계정 소유자나 최고 관리자를 비활성화할 수 없습니다.",
    "无法在此停用账户所有者或超级管理员。"
  ],
  "deletedAccountError": [
    "Deleted accounts do not allow new users or access changes.",
    "La cuenta eliminada no admite altas ni cambios de acceso.",
    "Un compte supprimé ne permet ni ajout d’utilisateurs ni changement d’accès.",
    "Contas excluídas não permitem novos usuários nem mudanças de acesso.",
    "삭제된 계정에는 사용자 추가나 접근 변경이 허용되지 않습니다.",
    "已删除账户不允许添加用户或更改访问权限。"
  ],
  "emailAlreadyUsed": [
    "That email already belongs to the account or has a pending invitation.",
    "Ese correo ya pertenece a la cuenta o tiene una invitación pendiente.",
    "Ce courriel appartient déjà au compte ou fait l’objet d’une invitation en attente.",
    "Esse e-mail já pertence à conta ou tem um convite pendente.",
    "이 이메일은 이미 계정에 속하거나 대기 중인 초대가 있습니다.",
    "该邮箱已属于此账户，或有待处理邀请。"
  ],
  "seatCapacityExceeded": [
    "No seats are available. Adjust capacity and try again.",
    "No hay lugares disponibles. Ajusta la capacidad y vuelve a intentarlo.",
    "Aucune place disponible. Ajustez la capacité et réessayez.",
    "Não há vagas disponíveis. Ajuste a capacidade e tente novamente.",
    "사용 가능한 자리가 없습니다. 정원을 조정한 후 다시 시도하세요.",
    "没有可用名额。请调整容量后重试。"
  ],
  "moduleOwnPrice": [
    "Each module has its own price",
    "Cada módulo tiene su propio precio",
    "Chaque module a son propre prix",
    "Cada módulo tem seu próprio preço",
    "모듈마다 개별 가격이 있습니다",
    "每个模块都有各自的价格"
  ],
  "packageSpecialPrice": [
    "Combinations with special pricing",
    "Combinaciones con precio especial",
    "Combinaisons à prix spécial",
    "Combinações com preço especial",
    "특별 가격의 조합",
    "特价组合"
  ],
  "alreadyIncluded": [
    "Already included in another selection.",
    "Ya está incluido en otra selección.",
    "Déjà inclus dans une autre sélection.",
    "Já incluído em outra seleção.",
    "이미 다른 선택에 포함되어 있습니다.",
    "已包含在其他选择中。"
  ],
  "productsCount": [
    "Products: {count}",
    "Productos: {count}",
    "Produits : {count}",
    "Produtos: {count}",
    "제품: {count}",
    "产品：{count}"
  ]
} as const satisfies Record<string, readonly [string, string, string, string, string, string]>;
export type CustomerAccountMessage = keyof typeof messages;
export function customerAccountLocale(value?: string | boolean): CustomerAccountLocale {
  if (typeof value === 'boolean') return value ? 'en-CA' : 'es-MX';
  return customerAccountLocales.includes(value as CustomerAccountLocale) ? value as CustomerAccountLocale : 'en-CA';
}
export function getCustomerAccountCopy(value?: string | boolean) {
  const locale = customerAccountLocale(value);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const t = (key: CustomerAccountMessage, values: Record<string, string | number> = {}) => {
    const template: string = messages[key][localeIndex[locale]];
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = values[name];
      return value == null ? placeholder : typeof value === 'number' ? number(value) : value;
    });
  };
  return { locale, t, number };
}
