import { useMemo } from "react";
import { useLanguage } from "../../../../context/LanguageContext";
import { getBusinessStructureTranslations } from "../translations";

export function useBusinessStructureTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(
    () => getBusinessStructureTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
