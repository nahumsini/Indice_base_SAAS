import { useMemo } from "react";
import { useLanguage } from "../../../../context/LanguageContext";
import { getBusinessProfileTranslations } from "../translations";

export function useBusinessProfileTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(
    () => getBusinessProfileTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
