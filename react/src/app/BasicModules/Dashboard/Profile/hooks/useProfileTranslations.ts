import { useMemo } from "react";
import { useLanguage } from "../../../../context/LanguageContext";
import { getProfileTranslations } from "../translations";

export function useProfileTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(
    () => getProfileTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
