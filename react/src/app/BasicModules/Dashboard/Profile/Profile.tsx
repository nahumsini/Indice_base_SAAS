import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { configCenterApi, type ConfigCenterCurrentUser } from '../../../api/configCenter';
import {
  LoadingBarOverlay,
  runWithMinimumDuration,
} from '../../../components/LoadingBarOverlay';
import { SaveChangesBar } from '../../../components/SaveChangesBar';
import { SuccessToast } from '../../../components/SuccessToast';
import { languages, useLanguage } from '../../../shared/context';
import {
  DEFAULT_PROFILE_COUNTRY,
  getProfileCountry,
  getProfileCountryLabel,
  isProfileCountry,
  PROFILE_COUNTRY_OPTIONS,
  splitProfilePhone,
} from '../../../shared/profileCountries';
import {
  normalizePhoneInputForCountry,
  validatePhoneForProfileCountry,
} from '../../../shared/validation/phone';

const inputClassName =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all';

const DEFAULT_PREFERRED_LANGUAGE = languages[0]?.code ?? 'es-MX';
const LEGACY_PREFERRED_LANGUAGE_ALIASES: Record<string, string> = {
  'es-419': 'es-MX',
  'es-ES': 'es-MX',
  'en-GB': 'en-US',
};
const SUPPORTED_PREFERRED_LANGUAGES = new Set(languages.map((language) => language.code));

const DEFAULT_PROFILE_FORM_VALUES = {
  firstName: '',
  lastName: '',
  country: DEFAULT_PROFILE_COUNTRY,
  phoneNumber: '',
  preferredLanguage: DEFAULT_PREFERRED_LANGUAGE,
  newPassword: '',
  confirmNewPassword: '',
} as const;

const PROFILE_SAVE_MINIMUM_LOADING_MS = 2500;

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  country: string;
  phoneNumber: string;
  preferredLanguage: string;
  newPassword: string;
  confirmNewPassword: string;
};

const normalizePreferredLanguage = (languageCode?: string) => {
  const normalizedLanguage = languageCode
    ? (LEGACY_PREFERRED_LANGUAGE_ALIASES[languageCode] ?? languageCode)
    : DEFAULT_PREFERRED_LANGUAGE;

  return SUPPORTED_PREFERRED_LANGUAGES.has(normalizedLanguage)
    ? normalizedLanguage
    : DEFAULT_PREFERRED_LANGUAGE;
};

const createProfileFormValues = (user?: ConfigCenterCurrentUser | null): ProfileFormValues => {
  if (!user) {
    return { ...DEFAULT_PROFILE_FORM_VALUES };
  }

  const phoneParts = splitProfilePhone(
    user.telefono,
    user.country,
  );

  return {
    firstName: user.primer_nombre ?? user.nombres ?? '',
    lastName: user.apellido_paterno ?? user.apellidos ?? '',
    country: phoneParts.country,
    phoneNumber: phoneParts.number,
    preferredLanguage: normalizePreferredLanguage(user.preferred_language),
    newPassword: '',
    confirmNewPassword: '',
  };
};

const areProfileFormValuesEqual = (
  currentValues: ProfileFormValues,
  baselineValues: ProfileFormValues,
) => (
  currentValues.firstName === baselineValues.firstName
  && currentValues.lastName === baselineValues.lastName
  && currentValues.country === baselineValues.country
  && currentValues.phoneNumber === baselineValues.phoneNumber
  && currentValues.preferredLanguage === baselineValues.preferredLanguage
  && currentValues.newPassword === baselineValues.newPassword
  && currentValues.confirmNewPassword === baselineValues.confirmNewPassword
);

export default function Profile() {
  const { currentLanguage, t } = useLanguage();
  const profileCopy = t.panelInicial.profile;
  const [user, setUser] = useState<ConfigCenterCurrentUser | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>({ ...DEFAULT_PROFILE_FORM_VALUES });
  const [baselineValues, setBaselineValues] = useState<ProfileFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    configCenterApi.getCurrentUser()
      .then((response) => {
        if (!active) {
          return;
        }

        const nextValues = createProfileFormValues(response);

        setUser(response);
        setBaselineValues(nextValues);
        setFormValues(nextValues);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : profileCopy.messages.loadError);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const firstNames = useMemo(
    () => formValues.firstName.trim(),
    [formValues.firstName],
  );

  const lastNames = useMemo(
    () => formValues.lastName.trim(),
    [formValues.lastName],
  );
  const selectedCountry = useMemo(
    () => getProfileCountry(formValues.country),
    [formValues.country],
  );
  const countryOptions = useMemo(
    () => PROFILE_COUNTRY_OPTIONS.map((country) => ({
      code: country.code,
      label: getProfileCountryLabel(country, currentLanguage.code),
    })),
    [currentLanguage.code],
  );

  const initials = ((firstNames[0] ?? '') + (lastNames[0] ?? '')).trim().toUpperCase() || 'U';
  const hasUnsavedChanges = baselineValues !== null && !areProfileFormValuesEqual(formValues, baselineValues);
  const trimmedNewPassword = formValues.newPassword.trim();
  const trimmedPasswordConfirmation = formValues.confirmNewPassword.trim();
  const hasPasswordChangeInProgress = trimmedNewPassword.length > 0 || trimmedPasswordConfirmation.length > 0;
  const hasPasswordMismatch = useMemo(() => {
    return (
      trimmedPasswordConfirmation.length > 0
      && trimmedNewPassword !== trimmedPasswordConfirmation
    );
  }, [trimmedNewPassword, trimmedPasswordConfirmation]);
  const isSaveDisabled = hasPasswordChangeInProgress
    && (
      trimmedNewPassword.length === 0
      || trimmedPasswordConfirmation.length === 0
      || trimmedNewPassword !== trimmedPasswordConfirmation
    );

  const updateFormValue = <Key extends keyof ProfileFormValues>(
    field: Key,
    value: ProfileFormValues[Key],
  ) => {
    setFormValues((currentValues) => {
      if (currentValues[field] === value) {
        return currentValues;
      }

      return {
        ...currentValues,
        [field]: value,
      };
    });

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const handleCountryChange = (value: string) => {
    if (!isProfileCountry(value)) {
      return;
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      country: value,
      phoneNumber: normalizePhoneInputForCountry(currentValues.phoneNumber, value),
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    updateFormValue('phoneNumber', normalizePhoneInputForCountry(value, formValues.country));
  };

  const handleDiscardChanges = () => {
    if (!baselineValues || isSaving) {
      return;
    }

    setFormValues({ ...baselineValues });
    setErrorMessage('');
    setSaveMessage('');
  };

  const handleSaveProfile = async () => {
    if (!user || !hasUnsavedChanges) {
      return;
    }

    const hasPasswordChange = trimmedNewPassword.length > 0 || trimmedPasswordConfirmation.length > 0;

    if (hasPasswordChange && trimmedNewPassword !== trimmedPasswordConfirmation) {
      setErrorMessage(profileCopy.messages.passwordMismatch);
      setSaveMessage('');
      return;
    }

    if (trimmedNewPassword.length > 0 && trimmedNewPassword.length < 8) {
      setErrorMessage(profileCopy.messages.passwordMinLength);
      setSaveMessage('');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      const trimmedPhoneNumber = formValues.phoneNumber.trim();
      let formattedPhone = '';
      const isPhoneSelectionUnchanged = baselineValues !== null
        && formValues.phoneNumber === baselineValues.phoneNumber
        && formValues.country === baselineValues.country;

      if (trimmedPhoneNumber) {
        if (isPhoneSelectionUnchanged && user.telefono?.trim()) {
          formattedPhone = user.telefono.trim();
        } else {
          const validation = validatePhoneForProfileCountry(trimmedPhoneNumber, formValues.country);

          if (!validation.ok) {
            setErrorMessage(profileCopy.messages.invalidPhone);
            setSaveMessage('');
            return;
          }

          formattedPhone = validation.international;
        }
      }

      const response = await runWithMinimumDuration(
        configCenterApi.saveCurrentUser({
          primer_nombre: formValues.firstName,
          apellido_paterno: formValues.lastName,
          telefono: formattedPhone,
          country: formValues.country,
          preferred_language: formValues.preferredLanguage,
          ...(trimmedNewPassword
            ? {
                new_password: trimmedNewPassword,
                confirm_new_password: trimmedPasswordConfirmation,
              }
            : {}),
        }),
        PROFILE_SAVE_MINIMUM_LOADING_MS,
      );

      const nextValues = createProfileFormValues(response);

      setUser(response);
      setBaselineValues(nextValues);
      setFormValues(nextValues);
      setSaveMessage(profileCopy.messages.saveSuccess);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : profileCopy.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={hasUnsavedChanges ? 'pb-24 sm:pb-20' : ''}>
        <div className="bg-purple-50 dark:bg-purple-900/10 mb-6 rounded-lg border border-purple-200 p-4 dark:border-purple-700/30 sm:p-6">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">👤</span>
              {t.panelInicial.profile.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.panelInicial.profile.subtitle}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 dark:border-purple-700/30 dark:bg-purple-900/20 dark:text-purple-300">
            {profileCopy.messages.loading}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="bg-white dark:bg-gray-800 mb-4 rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700 sm:p-6">
          <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {profileCopy.sections.identityTitle}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profileCopy.sections.identitySubtitle}
            </p>
          </div>

          <div className="mb-5">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.panelInicial.profile.fields.profilePhoto}
            </label>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-xl font-semibold text-white shadow-md">
                {initials}
              </div>
              <div>
                <button disabled className="cursor-not-allowed rounded-lg bg-purple-600/70 px-4 py-2 text-sm font-medium text-white">
                  📷 {t.panelInicial.profile.fields.uploadPhoto}
                </button>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {profileCopy.hints.photoFormat}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {profileCopy.sections.nameGroup}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {profileCopy.fields.firstNames}
                </label>
                <input
                  type="text"
                  value={formValues.firstName}
                  onChange={(event) => updateFormValue('firstName', event.target.value)}
                  className={inputClassName}
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {profileCopy.hints.firstNames}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {profileCopy.fields.lastNames}
                </label>
                <input
                  type="text"
                  value={formValues.lastName}
                  onChange={(event) => updateFormValue('lastName', event.target.value)}
                  className={inputClassName}
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {profileCopy.hints.lastNames}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {profileCopy.fields.country}
                </label>
                <select
                  value={formValues.country}
                  onChange={(event) => handleCountryChange(event.target.value)}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                >
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 mb-4 rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700 sm:p-6">
          <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {profileCopy.sections.contactTitle}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profileCopy.sections.contactSubtitle}
            </p>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.panelInicial.profile.fields.email}
            </label>
            <input type="email" value={user?.email ?? ''} readOnly className={inputClassName} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.panelInicial.profile.fields.phone} <span className="text-[11px] text-gray-400">{profileCopy.messages.optional}</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-h-[42px] items-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 sm:min-w-[112px]">
                <span className="truncate font-medium">
                  {selectedCountry.flag} {selectedCountry.dialCode}
                </span>
              </div>
              <input
                type="tel"
                value={formValues.phoneNumber}
                onChange={(event) => handlePhoneNumberChange(event.target.value)}
                className={`${inputClassName} flex-1`}
                inputMode="numeric"
                autoComplete="tel-national"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {profileCopy.hints.phone}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 mb-4 rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700 sm:p-6">
          <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {profileCopy.sections.securityTitle}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profileCopy.sections.securitySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {profileCopy.fields.newPassword}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={formValues.newPassword}
                  onChange={(event) => updateFormValue('newPassword', event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={hasPasswordMismatch}
                  className={`${inputClassName} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                  aria-label={showNewPassword ? t.loginPage.hidePassword : t.loginPage.showPassword}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {profileCopy.fields.confirmNewPassword}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formValues.confirmNewPassword}
                  onChange={(event) => updateFormValue('confirmNewPassword', event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={hasPasswordMismatch}
                  className={`${inputClassName} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                  aria-label={showConfirmPassword ? t.loginPage.hidePassword : t.loginPage.showPassword}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {hasPasswordMismatch ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {profileCopy.messages.passwordMismatch}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            {profileCopy.hints.password}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700 sm:p-6">
          <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {profileCopy.sections.preferencesTitle}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profileCopy.sections.preferencesSubtitle}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {profileCopy.fields.preferredLanguage}
            </label>
            <select
              value={formValues.preferredLanguage}
              onChange={(event) => updateFormValue('preferredLanguage', event.target.value)}
              className={`${inputClassName} appearance-none cursor-pointer`}
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.flag} {language.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {profileCopy.hints.preferredLanguage}
            </p>
          </div>
        </div>
      </div>

      <SaveChangesBar
        isVisible={hasUnsavedChanges}
        isSaving={isSaving}
        isSaveDisabled={isSaveDisabled}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveProfile}
        saveLabel={profileCopy.actions.save}
        savingLabel={profileCopy.actions.saving}
        discardLabel={profileCopy.actions.discard}
        message={profileCopy.messages.unsavedChanges}
      />

      <LoadingBarOverlay
        isVisible={isSaving}
        title={profileCopy.messages.savingOverlay}
      />

      <SuccessToast
        isVisible={Boolean(saveMessage)}
        message={saveMessage}
        onClose={() => setSaveMessage('')}
      />
    </>
  );
}
