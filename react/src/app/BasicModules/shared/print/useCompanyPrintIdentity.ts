import { useEffect, useState } from 'react';
import { configCenterApi, type ConfigCenterEmpresa } from '../../../api/configCenter';

export interface CompanyPrintIdentity {
  logoUrl: string;
  name: string;
}

export const emptyCompanyPrintIdentity: CompanyPrintIdentity = {
  logoUrl: '',
  name: '',
};

export const resolveCompanyPrintIdentity = (
  company: ConfigCenterEmpresa | null | undefined,
): CompanyPrintIdentity => {
  const corporateOffice = company?.map?.find((unit) => unit.is_corporate_office || unit.isCorporateOffice)
    ?? company?.map?.[0];
  const corporateBusiness = corporateOffice?.businesses?.[0];

  return {
    logoUrl: company?.logo_url?.trim()
      || corporateOffice?.logo?.trim()
      || corporateBusiness?.logo?.trim()
      || '',
    name: company?.nombre_empresa?.trim()
      || corporateOffice?.name?.trim()
      || corporateBusiness?.name?.trim()
      || '',
  };
};

export const useCompanyPrintIdentity = () => {
  const [identity, setIdentity] = useState<CompanyPrintIdentity>(emptyCompanyPrintIdentity);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    configCenterApi.getEmpresa()
      .then((company) => {
        if (active) {
          setIdentity(resolveCompanyPrintIdentity(company));
        }
      })
      .catch(() => {
        if (active) {
          setIdentity(emptyCompanyPrintIdentity);
        }
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { identity, isReady };
};
