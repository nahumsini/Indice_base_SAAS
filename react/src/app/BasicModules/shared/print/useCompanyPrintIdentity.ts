import { useEffect, useState } from 'react';
import { configCenterApi, type ConfigCenterEmpresa } from '../../../api/configCenter';

export interface CompanyPrintIdentity {
  address: string;
  email: string;
  logoUrl: string;
  name: string;
  phone: string;
}

export const emptyCompanyPrintIdentity: CompanyPrintIdentity = {
  address: '',
  email: '',
  logoUrl: '',
  name: '',
  phone: '',
};

export const resolveCompanyPrintIdentity = (
  company: ConfigCenterEmpresa | null | undefined,
): CompanyPrintIdentity => {
  const corporateOffice = company?.map?.find((unit) => unit.is_corporate_office || unit.isCorporateOffice)
    ?? company?.map?.[0];
  const corporateBusiness = corporateOffice?.businesses?.[0];
  const companyAddress = typeof company?.address === 'string'
    ? company.address.trim()
    : [company?.address?.street, company?.address?.city, company?.address?.state, company?.address?.zip, company?.address?.country]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ');
  const officeAddress = [
    corporateOffice?.direccion || corporateBusiness?.direccion,
    corporateOffice?.ciudad || corporateBusiness?.ciudad,
    corporateOffice?.estado || corporateBusiness?.estado,
    corporateOffice?.cp || corporateBusiness?.cp,
    corporateOffice?.pais || corporateBusiness?.pais,
  ].map((part) => part?.trim()).filter(Boolean).join(', ');

  return {
    address: companyAddress || officeAddress,
    email: corporateOffice?.email?.trim() || corporateBusiness?.email?.trim() || '',
    logoUrl: company?.logo_url?.trim()
      || corporateOffice?.logo?.trim()
      || corporateBusiness?.logo?.trim()
      || '',
    name: company?.nombre_empresa?.trim()
      || corporateOffice?.name?.trim()
      || corporateBusiness?.name?.trim()
      || '',
    phone: corporateOffice?.telefono?.trim() || corporateBusiness?.telefono?.trim() || '',
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
