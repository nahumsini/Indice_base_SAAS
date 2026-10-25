const es = {
  embeddedHelp: "Se guardan junto con el colaborador al finalizar. Si aún no cuentas con los datos fiscales, puedes completar esta sección después; la nómina fiscal requerirá revisarlos antes de aprobar.",
  embeddedUnavailable: "No se pudieron consultar los datos fiscales con tu acceso actual. Puedes reintentar o guardar los demás datos del colaborador sin modificar su perfil fiscal.",
  embeddedIncomplete: "Completa los datos fiscales que empezaste a capturar antes de continuar.",

  riskSource: 'Cómo se determina la prima', registeredRisk: 'Prima vigente de mi registro patronal', classRisk: 'Prima media por clase IMSS', riskClass: 'Clase registrada ante el IMSS',
  riskHelp: 'Elige la prima que consta en tu registro. La clase aplica cuando corresponde usar la prima media; no sustituye tu determinación anual. Prima registrada: de 0.5 % a 15 %.',
  taxTitle: 'Impuesto estatal sobre nómina', taxSource: 'Tasa y fundamento del ISN', generalTax: 'Tasa general documentada', customTax: 'Otra tasa o fundamento documentado',
  taxHelp: 'La opción general completa la tasa y su fundamento. Los estímulos, exenciones y bases especiales requieren revisión y un fundamento propio.',
  noTaxChoice: 'Para este estado o vigencia, captura la tasa y el fundamento de tu documento.', sourceLink: 'Consultar fuente oficial', referenceHelp: 'Indica ley o resolución, artículo y ejercicio de aplicación.',
  creditStatus: 'Retención de INFONAVIT', yesCredit: 'Sí, tengo un aviso vigente', noCredit: 'Sin aviso de retención vigente',
  endRule: 'Término indicado en el aviso', openEnd: 'Sin fecha de término indicada', datedEnd: 'Con fecha de término indicada',
  insuranceRule: 'Seguro de vivienda en el aviso', noInsurance: 'Sin seguro indicado · $0', noticeInsurance: 'Capturar el importe del aviso', insuranceHelp: 'Captura solo el seguro bimestral, no la mensualidad del crédito. De $0.01 a $1,000 MXN.',
  monthlyAmount: 'Cuota mensual del aviso (MXN)', percentAmount: 'Porcentaje del aviso (%)', factorAmount: 'Factor UMI del aviso', amountHelp: 'Al cambiar de modalidad, vuelve a capturar el valor para no confundir pesos, porcentaje y factor.',
  creditAge: 'Fecha de otorgamiento del crédito', modernCredit: 'Desde febrero de 1998', legacyCredit: 'Antes de febrero de 1998',
  registrationHelp: '11 caracteres, como aparecen en el registro patronal.', creditNumberHelp: '10 dígitos, incluidos los ceros iniciales.', salaryHelp: 'Copia el importe diario exacto en pesos, con hasta 2 decimales.',
};
type GuidanceCopy = typeof es;
const en: GuidanceCopy = {
  embeddedHelp: "These details are saved with the employee at the end. If the fiscal details are not available yet, complete this section later; fiscal payroll will require review before approval.",
  embeddedUnavailable: "Fiscal details could not be loaded with your current access. Retry or save the other employee details without changing the fiscal profile.",
  embeddedIncomplete: "Complete the fiscal details you started entering before continuing.",

  riskSource: 'Risk premium source', registeredRisk: 'Current employer registration premium', classRisk: 'IMSS class average premium', riskClass: 'Registered IMSS class',
  riskHelp: 'Use the premium on your registration. Class averages apply only when eligible; they do not replace your annual determination. Registered premium: 0.5% to 15%.',
  taxTitle: 'State payroll tax', taxSource: 'State tax rate and legal basis', generalTax: 'Documented general rate', customTax: 'Other documented rate or legal basis',
  taxHelp: 'The general option fills the rate and legal basis. Incentives, exemptions and special bases require review and their own legal basis.',
  noTaxChoice: 'For this state or effective date, enter the rate and legal basis from your document.', sourceLink: 'View official source', referenceHelp: 'Enter the law or ruling, article and applicable year.',
  creditStatus: 'INFONAVIT withholding', yesCredit: 'Yes, I have an active notice', noCredit: 'No active withholding notice',
  endRule: 'End specified in the notice', openEnd: 'No end date specified', datedEnd: 'An end date is specified',
  insuranceRule: 'Housing insurance in the notice', noInsurance: 'No insurance specified · $0', noticeInsurance: 'Enter the notice amount', insuranceHelp: 'Enter bimonthly insurance only, not the loan instalment. $0.01 to $1,000 MXN.',
  monthlyAmount: 'Notice monthly amount (MXN)', percentAmount: 'Notice percentage (%)', factorAmount: 'Notice UMI factor', amountHelp: 'Changing the method clears the value to avoid mixing pesos, percentages and factors.',
  creditAge: 'Credit origination date', modernCredit: 'February 1998 or later', legacyCredit: 'Before February 1998',
  registrationHelp: '11 characters, exactly as registered.', creditNumberHelp: '10 digits, including leading zeros.', salaryHelp: 'Enter the exact daily amount in pesos, with up to 2 decimals.',
};
const fr: GuidanceCopy = {
  embeddedHelp: "Ces données sont enregistrées avec le collaborateur à la fin. Vous pouvez compléter cette section plus tard ; la paie fiscale exigera leur vérification avant approbation.",
  embeddedUnavailable: "Impossible de consulter les données fiscales avec votre accès actuel. Réessayez ou enregistrez les autres données sans modifier le profil fiscal.",
  embeddedIncomplete: "Complétez les données fiscales commencées avant de continuer.",

  riskSource: 'Origine de la prime', registeredRisk: 'Prime actuelle du registre patronal', classRisk: 'Prime moyenne par classe IMSS', riskClass: 'Classe déclarée à l’IMSS',
  riskHelp: 'Utilisez la prime de votre registre. La moyenne de classe ne remplace pas la détermination annuelle et exige un cas admissible. Prime déclarée : de 0,5 % à 15 %.',
  taxTitle: 'Taxe de l’État sur les salaires', taxSource: 'Taux et fondement de la taxe', generalTax: 'Taux général documenté', customTax: 'Autre taux ou fondement documenté',
  taxHelp: 'L’option générale renseigne le taux et son fondement. Les avantages, exonérations et bases spéciales exigent une vérification et un fondement propre.',
  noTaxChoice: 'Pour cet État ou cette date, recopiez le taux et le fondement du document.', sourceLink: 'Consulter la source officielle', referenceHelp: 'Indiquez la loi ou décision, l’article et l’année applicable.',
  creditStatus: 'Retenue INFONAVIT', yesCredit: 'Oui, avis en vigueur', noCredit: 'Aucun avis de retenue en vigueur',
  endRule: 'Fin prévue dans l’avis', openEnd: 'Aucune date de fin indiquée', datedEnd: 'Date de fin indiquée',
  insuranceRule: 'Assurance logement dans l’avis', noInsurance: 'Aucune assurance indiquée · 0 $', noticeInsurance: 'Saisir le montant de l’avis', insuranceHelp: 'Assurance bimestrielle uniquement, pas la mensualité du crédit. De 0,01 à 1 000 MXN.',
  monthlyAmount: 'Montant mensuel de l’avis (MXN)', percentAmount: 'Pourcentage de l’avis (%)', factorAmount: 'Facteur UMI de l’avis', amountHelp: 'Après un changement de méthode, ressaisissez la valeur pour ne pas confondre pesos, pourcentage et facteur.',
  creditAge: 'Date d’octroi du crédit', modernCredit: 'Depuis février 1998', legacyCredit: 'Avant février 1998',
  registrationHelp: '11 caractères, conformément au registre.', creditNumberHelp: '10 chiffres, y compris les zéros initiaux.', salaryHelp: 'Montant journalier exact en pesos, avec 2 décimales au maximum.',
};
const pt: GuidanceCopy = {
  embeddedHelp: "Estes dados são salvos com o colaborador ao finalizar. Você pode completar esta seção depois; a folha fiscal exigirá revisão antes da aprovação.",
  embeddedUnavailable: "Não foi possível consultar os dados fiscais com seu acesso atual. Tente novamente ou salve os outros dados sem alterar o perfil fiscal.",
  embeddedIncomplete: "Complete os dados fiscais que começou a preencher antes de continuar.",

  riskSource: 'Origem do prêmio', registeredRisk: 'Prêmio vigente do registro patronal', classRisk: 'Prêmio médio por classe IMSS', riskClass: 'Classe registrada no IMSS',
  riskHelp: 'Use o prêmio do registro. A média por classe aplica-se somente nos casos elegíveis; não substitui a apuração anual. Prêmio registrado: de 0,5% a 15%.',
  taxTitle: 'Imposto estadual sobre folha', taxSource: 'Alíquota e fundamento do imposto', generalTax: 'Alíquota geral documentada', customTax: 'Outra alíquota ou fundamento documentado',
  taxHelp: 'A opção geral preenche alíquota e fundamento. Incentivos, isenções e bases especiais exigem revisão e fundamento próprio.',
  noTaxChoice: 'Para este estado ou vigência, copie a alíquota e o fundamento do documento.', sourceLink: 'Consultar fonte oficial', referenceHelp: 'Indique lei ou resolução, artigo e exercício aplicável.',
  creditStatus: 'Retenção INFONAVIT', yesCredit: 'Sim, tenho um aviso vigente', noCredit: 'Sem aviso de retenção vigente',
  endRule: 'Término indicado no aviso', openEnd: 'Sem data de término indicada', datedEnd: 'Com data de término indicada',
  insuranceRule: 'Seguro habitacional no aviso', noInsurance: 'Sem seguro indicado · $0', noticeInsurance: 'Informar o valor do aviso', insuranceHelp: 'Somente o seguro bimestral, não a prestação do crédito. De $0,01 a $1.000 MXN.',
  monthlyAmount: 'Valor mensal do aviso (MXN)', percentAmount: 'Percentual do aviso (%)', factorAmount: 'Fator UMI do aviso', amountHelp: 'Ao mudar a modalidade, informe novamente o valor para não confundir pesos, percentual e fator.',
  creditAge: 'Data de concessão do crédito', modernCredit: 'A partir de fevereiro de 1998', legacyCredit: 'Antes de fevereiro de 1998',
  registrationHelp: '11 caracteres, conforme o registro patronal.', creditNumberHelp: '10 dígitos, incluindo zeros iniciais.', salaryHelp: 'Valor diário exato em pesos, com até 2 casas decimais.',
};
const zh: GuidanceCopy = {
  embeddedHelp: "这些资料将在完成时与员工资料一同保存。若暂时没有税务资料，可稍后填写；税务工资获批前仍需审核。",
  embeddedUnavailable: "当前访问权限下无法加载税务资料。请重试，或保存其他员工资料而不修改税务档案。",
  embeddedIncomplete: "继续前请补全已开始填写的税务资料。",

  riskSource: '风险费率来源', registeredRisk: '雇主登记的当前费率', classRisk: 'IMSS 类别平均费率', riskClass: '已登记的 IMSS 类别',
  riskHelp: '使用登记费率。类别平均费率仅适用于符合条件的情况，不能替代年度核定。登记费率范围：0.5% 至 15%。',
  taxTitle: '州工资税', taxSource: '州税率及法律依据', generalTax: '有依据的一般税率', customTax: '其他有依据的税率或法律依据',
  taxHelp: '一般选项会填写税率和法律依据。优惠、免税和特殊计税基础需另行审核并提供依据。',
  noTaxChoice: '此州或生效日期需按文件填写税率及法律依据。', sourceLink: '查看官方来源', referenceHelp: '填写法律或裁定、条款及适用年份。',
  creditStatus: 'INFONAVIT 扣款', yesCredit: '有有效扣款通知', noCredit: '无有效扣款通知',
  endRule: '通知中的终止安排', openEnd: '未注明终止日期', datedEnd: '已注明终止日期',
  insuranceRule: '通知中的住房保险', noInsurance: '未注明保险 · $0', noticeInsurance: '填写通知金额', insuranceHelp: '仅填双月保险费，不是贷款月供。范围为 0.01 至 1,000 MXN。',
  monthlyAmount: '通知月供金额（MXN）', percentAmount: '通知百分比（%）', factorAmount: '通知 UMI 系数', amountHelp: '切换计算方式后请重新填写，避免混淆比索、百分比与系数。',
  creditAge: '贷款发放日期', modernCredit: '1998 年 2 月及以后', legacyCredit: '1998 年 2 月之前',
  registrationHelp: '按雇主登记填写 11 个字符。', creditNumberHelp: '10 位数字，保留开头的零。', salaryHelp: '填写准确的每日比索金额，最多两位小数。',
};
const ko: GuidanceCopy = {
  embeddedHelp: "완료 시 직원 정보와 함께 저장됩니다. 세무 자료가 아직 없다면 나중에 작성할 수 있으며, 세무 급여 승인 전에 검토해야 합니다.",
  embeddedUnavailable: "현재 접근 권한으로 세무 정보를 조회하지 못했습니다. 다시 시도하거나 세무 프로필 변경 없이 다른 직원 정보를 저장하세요.",
  embeddedIncomplete: "계속하기 전에 입력을 시작한 세무 정보를 완성하세요.",

  riskSource: '위험 보험료율 기준', registeredRisk: '사업주 등록의 현재 보험료율', classRisk: 'IMSS 등급별 평균 보험료율', riskClass: '등록된 IMSS 등급',
  riskHelp: '등록된 보험료율을 사용하세요. 등급 평균은 해당되는 경우에만 적용되며 연간 산정을 대체하지 않습니다. 등록 보험료율: 0.5%~15%.',
  taxTitle: '주 급여세', taxSource: '급여세율 및 법적 근거', generalTax: '근거가 확인된 일반 세율', customTax: '기타 문서화된 세율 또는 근거',
  taxHelp: '일반 옵션은 세율과 근거를 입력합니다. 혜택, 면제 및 특별 과세 기준은 검토와 별도 근거가 필요합니다.',
  noTaxChoice: '해당 주 또는 적용일은 문서의 세율과 법적 근거를 입력하세요.', sourceLink: '공식 출처 보기', referenceHelp: '법령 또는 결정, 조항 및 적용 연도를 입력하세요.',
  creditStatus: 'INFONAVIT 원천 공제', yesCredit: '유효한 통지가 있음', noCredit: '유효한 공제 통지가 없음',
  endRule: '통지에 명시된 종료 조건', openEnd: '종료일이 명시되지 않음', datedEnd: '종료일이 명시됨',
  insuranceRule: '통지의 주택 보험', noInsurance: '명시된 보험 없음 · $0', noticeInsurance: '통지 금액 입력', insuranceHelp: '대출 월 납부금이 아닌 격월 보험료만 입력하세요. $0.01~$1,000 MXN.',
  monthlyAmount: '통지의 월 금액 (MXN)', percentAmount: '통지 비율 (%)', factorAmount: '통지 UMI 계수', amountHelp: '방식을 바꾸면 페소, 비율 및 계수를 혼동하지 않도록 값을 다시 입력하세요.',
  creditAge: '대출 실행일', modernCredit: '1998년 2월 이후', legacyCredit: '1998년 2월 이전',
  registrationHelp: '사업주 등록에 기재된 11자입니다.', creditNumberHelp: '앞자리 0을 포함한 10자리 숫자입니다.', salaryHelp: '정확한 일일 페소 금액을 소수점 둘째 자리까지 입력하세요.',
};
export const mexicoPayrollProfileGuidanceCopy = (locale: string): GuidanceCopy =>
  ({ es, en, fr, pt, zh, ko }[locale.split('-')[0]] ?? en);
