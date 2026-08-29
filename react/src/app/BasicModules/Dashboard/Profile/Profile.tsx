import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, CircleAlert, Eye, EyeOff, Loader2, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { configCenterApi, type ConfigCenterCurrentUser, type ConfigCenterPhoneNumber } from '../../../api/configCenter';
import { languages, useLanguage } from '../../../shared/context';
import { DashboardTitleBar } from '../components/DashboardTitleBar';
import {
  DEFAULT_PROFILE_COUNTRY,
  getProfileCountryLabel,
  isProfileCountry,
  PROFILE_COUNTRY_OPTIONS,
} from '../../../shared/profileCountries';
import {
  getPhoneExampleForCountry,
  isPhoneInputDialCodeOnly,
  normalizePhoneInputForCountry,
  validatePhoneForProfileCountry,
} from '../../../shared/validation/phone';
import {
  areProfilePhonesEqual,
  createProfilePhoneValue,
  createProfilePhoneValues,
  updatePhoneCountry,
  type ProfilePhoneFormValue,
} from './profilePhones';
import { useProfileTranslations } from './hooks/useProfileTranslations';

const inputClassName =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

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
  phoneNumbers: [] as ProfilePhoneFormValue[],
  preferredLanguage: DEFAULT_PREFERRED_LANGUAGE,
  avatarObjectKey: '',
  avatarContentType: '',
  newPassword: '',
  confirmNewPassword: '',
} as const;

const PROFILE_AVATAR_MAX_SOURCE_SIZE_BYTES = 25 * 1024 * 1024;
const PROFILE_AVATAR_MAX_UPLOAD_SIZE_BYTES = 1024 * 1024;
const PROFILE_AVATAR_MAX_DIMENSION_PIXELS = 768;
const PROFILE_AVATAR_COMPRESSION_QUALITIES = [0.82, 0.72, 0.62] as const;
const PROFILE_AVATAR_COMPRESSION_DIMENSIONS = [768, 512, 384] as const;
const PROFILE_AVATAR_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PROFILE_AVATAR_SOURCE_CONTENT_TYPES = new Set([
  ...PROFILE_AVATAR_CONTENT_TYPES,
  'image/heic',
  'image/heif',
  'image/avif',
]);
const USER_PROFILE_UPDATED_EVENT = 'indice:user-profile-updated';

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  country: string;
  phoneNumbers: ProfilePhoneFormValue[];
  preferredLanguage: string;
  avatarObjectKey: string;
  avatarContentType: string;
  newPassword: string;
  confirmNewPassword: string;
};

type CompressedProfileAvatar = {
  blob: Blob;
  contentType: string;
  fileName: string;
};

const normalizeAvatarSourceContentType = (file: File) => {
  const browserType = file.type.trim().toLowerCase();
  if (browserType === 'image/jpg' || browserType === 'image/pjpeg') {
    return 'image/jpeg';
  }

  if (PROFILE_AVATAR_SOURCE_CONTENT_TYPES.has(browserType)) {
    return browserType;
  }

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.jfif')) {
    return 'image/jpeg';
  }
  if (fileName.endsWith('.png')) {
    return 'image/png';
  }
  if (fileName.endsWith('.webp')) {
    return 'image/webp';
  }
  if (fileName.endsWith('.heic')) {
    return 'image/heic';
  }
  if (fileName.endsWith('.heif')) {
    return 'image/heif';
  }
  if (fileName.endsWith('.avif')) {
    return 'image/avif';
  }

  return '';
};

const extensionForAvatarContentType = (contentType: string) => {
  if (contentType === 'image/webp') {
    return 'webp';
  }
  if (contentType === 'image/png') {
    return 'png';
  }
  return 'jpg';
};

const avatarFileNameForContentType = (fileName: string, contentType: string) => {
  const baseName = fileName.trim().replace(/\.[^/.]+$/, '') || 'profile-photo';
  return `${baseName}.${extensionForAvatarContentType(contentType)}`;
};

const loadImageFile = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(imageUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error('Unable to read that image. Try a JPG, PNG, WebP, or HEIC photo.'));
  };

  image.src = imageUrl;
});

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  contentType: string,
  quality: number,
) => new Promise<Blob | null>((resolve) => {
  canvas.toBlob((blob) => resolve(blob), contentType, quality);
});

const drawAvatarToCanvas = (
  image: HTMLImageElement,
  maxDimension: number,
  backgroundColor?: string,
) => {
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, 1),
    maxDimension / Math.max(image.naturalHeight, 1),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare profile photo for upload.');
  }

  canvas.width = width;
  canvas.height = height;

  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas;
};

const encodeAvatarCandidate = async (
  canvas: HTMLCanvasElement,
  contentType: string,
) => {
  for (const quality of PROFILE_AVATAR_COMPRESSION_QUALITIES) {
    const blob = await canvasToBlob(canvas, contentType, quality);
    if (blob?.type === contentType && blob.size <= PROFILE_AVATAR_MAX_UPLOAD_SIZE_BYTES) {
      return blob;
    }
  }

  return null;
};

const compressProfileAvatar = async (file: File): Promise<CompressedProfileAvatar> => {
  const image = await loadImageFile(file);

  for (const maxDimension of PROFILE_AVATAR_COMPRESSION_DIMENSIONS) {
    const transparentCanvas = drawAvatarToCanvas(image, maxDimension);
    const webpBlob = await encodeAvatarCandidate(transparentCanvas, 'image/webp');
    if (webpBlob) {
      return {
        blob: webpBlob,
        contentType: 'image/webp',
        fileName: avatarFileNameForContentType(file.name, 'image/webp'),
      };
    }

    const jpegCanvas = drawAvatarToCanvas(image, maxDimension, '#ffffff');
    const jpegBlob = await encodeAvatarCandidate(jpegCanvas, 'image/jpeg');
    if (jpegBlob) {
      return {
        blob: jpegBlob,
        contentType: 'image/jpeg',
        fileName: avatarFileNameForContentType(file.name, 'image/jpeg'),
      };
    }
  }

  throw new Error('Unable to compress the profile photo under 1MB. Try a smaller image.');
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
    return {
      ...DEFAULT_PROFILE_FORM_VALUES,
      phoneNumbers: [createProfilePhoneValue()],
    };
  }

  const profileCountry = user.country ?? DEFAULT_PROFILE_COUNTRY;

  return {
    firstName: user.primer_nombre ?? user.nombres ?? '',
    lastName: user.apellido_paterno ?? user.apellidos ?? '',
    country: profileCountry,
    phoneNumbers: createProfilePhoneValues(user, profileCountry),
    preferredLanguage: normalizePreferredLanguage(user.preferred_language),
    avatarObjectKey: user.avatar_object_key ?? '',
    avatarContentType: user.avatar_content_type ?? '',
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
  && areProfilePhonesEqual(currentValues.phoneNumbers, baselineValues.phoneNumbers)
  && currentValues.preferredLanguage === baselineValues.preferredLanguage
  && currentValues.avatarObjectKey === baselineValues.avatarObjectKey
  && currentValues.avatarContentType === baselineValues.avatarContentType
  && currentValues.newPassword === baselineValues.newPassword
  && currentValues.confirmNewPassword === baselineValues.confirmNewPassword
);

export default function Profile() {
  const { currentLanguage } = useLanguage();
  const profileCopy = useProfileTranslations();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarPreviewRef = useRef('');
  const [user, setUser] = useState<ConfigCenterCurrentUser | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>(createProfileFormValues());
  const [baselineValues, setBaselineValues] = useState<ProfileFormValues | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formValuesRef = useRef(formValues);

  const replaceAvatarPreview = (nextPreviewUrl: string) => {
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }

    avatarPreviewRef.current = nextPreviewUrl;
    setAvatarPreviewUrl(nextPreviewUrl);
  };

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

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
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
  const countryOptions = useMemo(
    () => PROFILE_COUNTRY_OPTIONS.map((country) => ({
      code: country.code,
      label: getProfileCountryLabel(country, currentLanguage.code),
    })),
    [currentLanguage.code],
  );
  const phoneCopy = profileCopy.phone;

  const initials = ((firstNames[0] ?? '') + (lastNames[0] ?? '')).trim().toUpperCase() || 'U';
  const avatarDisplayUrl = avatarPreviewUrl || user?.avatar_url || '';
  const uploadPhotoLabel = profileCopy.actions.uploadingPhoto;
  const hasUnsavedChanges = baselineValues !== null && !areProfileFormValuesEqual(formValues, baselineValues);
  const completedEssentialFields = [
    formValues.firstName.trim(),
    formValues.lastName.trim(),
    formValues.country.trim(),
    formValues.phoneNumbers.find((phone) => (
      phone.number.trim() && !isPhoneInputDialCodeOnly(phone.number, phone.country)
    ))?.number ?? '',
  ].filter(Boolean).length;
  const profileCompletion = Math.round((completedEssentialFields / 4) * 100);
  const expressCopy = profileCopy.progress;
  const trimmedNewPassword = formValues.newPassword.trim();
  const trimmedPasswordConfirmation = formValues.confirmNewPassword.trim();
  const hasPasswordChangeInProgress = trimmedNewPassword.length > 0 || trimmedPasswordConfirmation.length > 0;
  const hasPasswordMinLengthError = trimmedNewPassword.length > 0 && trimmedNewPassword.length < 8;
  const hasPasswordMismatch = useMemo(() => {
    return (
      trimmedPasswordConfirmation.length > 0
      && trimmedNewPassword !== trimmedPasswordConfirmation
    );
  }, [trimmedNewPassword, trimmedPasswordConfirmation]);
  const isPasswordReady = (
    trimmedNewPassword.length >= 8
    && trimmedPasswordConfirmation.length > 0
    && trimmedNewPassword === trimmedPasswordConfirmation
  );
  const isSaveDisabled = isUploadingAvatar
    || hasPasswordMinLengthError
    || (
      hasPasswordChangeInProgress
      && (
        trimmedNewPassword.length === 0
        || trimmedPasswordConfirmation.length === 0
        || trimmedNewPassword !== trimmedPasswordConfirmation
      )
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
      phoneNumbers: currentValues.phoneNumbers.map((phone) => (
        updatePhoneCountry(phone, value)
      )),
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const updatePhoneNumbers = (updater: (phones: ProfilePhoneFormValue[]) => ProfilePhoneFormValue[]) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      phoneNumbers: updater(currentValues.phoneNumbers),
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const handlePhoneCountryChange = (phoneKey: string, value: string) => {
    if (!isProfileCountry(value)) {
      return;
    }

    updatePhoneNumbers((phoneNumbers) => phoneNumbers.map((phone) => (
      phone.key === phoneKey ? updatePhoneCountry(phone, value) : phone
    )));
  };

  const handlePhoneNumberChange = (phoneKey: string, value: string) => {
    updatePhoneNumbers((phoneNumbers) => phoneNumbers.map((phone) => (
      phone.key === phoneKey
        ? { ...phone, number: normalizePhoneInputForCountry(value, phone.country) }
        : phone
    )));
  };

  const handleAddPhoneNumber = () => {
    updatePhoneNumbers((phoneNumbers) => [
      ...phoneNumbers,
      createProfilePhoneValue(phoneNumbers.length, { country: formValues.country }),
    ]);
  };

  const handleRemovePhoneNumber = (phoneKey: string) => {
    updatePhoneNumbers((phoneNumbers) => {
      const nextPhoneNumbers = phoneNumbers.filter((phone) => phone.key !== phoneKey);
      return nextPhoneNumbers.length
        ? nextPhoneNumbers
        : [createProfilePhoneValue(0, { country: formValues.country })];
    });
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || isSaving || isUploadingAvatar) {
      return;
    }

    const sourceContentType = normalizeAvatarSourceContentType(file);
    if (!sourceContentType) {
      setErrorMessage('Profile photos must be JPG, PNG, WebP, HEIC, or AVIF images.');
      setSaveMessage('');
      return;
    }

    if (file.size > PROFILE_AVATAR_MAX_SOURCE_SIZE_BYTES) {
      setErrorMessage(profileCopy.hints.photoFormat);
      setSaveMessage('');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      const compressedAvatar = await compressProfileAvatar(file);
      const previewUrl = URL.createObjectURL(compressedAvatar.blob);
      replaceAvatarPreview(previewUrl);

      const presign = await configCenterApi.presignCurrentUserAvatarUpload({
        file_name: compressedAvatar.fileName,
        content_type: compressedAvatar.contentType,
        size_bytes: compressedAvatar.blob.size,
      });

      await configCenterApi.uploadCurrentUserAvatar(
        presign.upload_url,
        compressedAvatar.blob,
        presign.content_type || compressedAvatar.contentType,
        presign.upload_headers ?? {},
      );

      setFormValues((currentValues) => ({
        ...currentValues,
        avatarObjectKey: presign.object_key,
        avatarContentType: presign.content_type || compressedAvatar.contentType,
      }));
    } catch (error) {
      replaceAvatarPreview('');
      setErrorMessage(error instanceof Error ? error.message : profileCopy.messages.saveError);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!baselineValues || isSaving) {
      return;
    }

    setFormValues({ ...baselineValues });
    replaceAvatarPreview('');
    setErrorMessage('');
    setSaveMessage('');
  };

  const handleSaveProfile = async (
    valuesToSave = formValues,
    baselineToSave = baselineValues,
  ) => {
    if (
      !user
      || !baselineToSave
      || isUploadingAvatar
      || areProfileFormValuesEqual(valuesToSave, baselineToSave)
    ) {
      return;
    }

    const nextPassword = valuesToSave.newPassword.trim();
    const nextPasswordConfirmation = valuesToSave.confirmNewPassword.trim();
    const hasPasswordChange = nextPassword.length > 0 || nextPasswordConfirmation.length > 0;

    if (hasPasswordChange && nextPassword !== nextPasswordConfirmation) {
      setErrorMessage(profileCopy.messages.passwordMismatch);
      setSaveMessage('');
      return;
    }

    if (nextPassword.length > 0 && nextPassword.length < 8) {
      setErrorMessage(profileCopy.messages.passwordMinLength);
      setSaveMessage('');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      const formattedPhones: ConfigCenterPhoneNumber[] = [];
      for (const phone of valuesToSave.phoneNumbers) {
        const trimmedPhoneNumber = phone.number.trim();
        if (!trimmedPhoneNumber || isPhoneInputDialCodeOnly(trimmedPhoneNumber, phone.country)) {
          continue;
        }

        const validation = validatePhoneForProfileCountry(trimmedPhoneNumber, phone.country);

        if (!validation.ok) {
          setErrorMessage(profileCopy.messages.invalidPhone);
          setSaveMessage('');
          return;
        }

        formattedPhones.push({
          id: phone.id,
          label: phone.label.trim() || `Phone ${formattedPhones.length + 1}`,
          phone: validation.e164,
          country: phone.country,
          is_primary: formattedPhones.length === 0,
        });
      }

      const response = await configCenterApi.saveCurrentUser({
        primer_nombre: valuesToSave.firstName,
        apellido_paterno: valuesToSave.lastName,
        telefono: formattedPhones[0]?.phone ?? '',
        phone_numbers: formattedPhones,
        country: valuesToSave.country,
        preferred_language: valuesToSave.preferredLanguage,
        ...(valuesToSave.avatarObjectKey !== baselineToSave.avatarObjectKey
          ? {
              avatar_object_key: valuesToSave.avatarObjectKey,
              avatar_content_type: valuesToSave.avatarContentType,
            }
          : {}),
        ...(nextPassword
          ? {
              new_password: nextPassword,
              confirm_new_password: nextPasswordConfirmation,
            }
          : {}),
      });

      const nextValues = createProfileFormValues(response);

      setUser(response);
      setBaselineValues(nextValues);
      if (areProfileFormValuesEqual(formValuesRef.current, valuesToSave)) {
        setFormValues(nextValues);
        replaceAvatarPreview('');
      }
      setSaveMessage(profileCopy.messages.saveSuccess);
      window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail: { user: response } }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : profileCopy.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div>
        <div className="mb-6">
          <DashboardTitleBar
            actions={(
              <div className="flex items-center gap-2 sm:justify-end">
                {hasUnsavedChanges ? (
                  <button type="button" onClick={handleDiscardChanges} disabled={isSaving} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                    {profileCopy.actions.discard}
                  </button>
                ) : null}
                <button type="button" onClick={() => void handleSaveProfile()} disabled={isLoading || isSaving || isSaveDisabled || !hasUnsavedChanges} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900 sm:flex-none">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? profileCopy.actions.saving : profileCopy.actions.save}
                </button>
              </div>
            )}
            emoji="👤"
            subtitle={profileCopy.subtitle}
            title={profileCopy.title}
          />
        </div>

        {isLoading ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
            {profileCopy.messages.loading}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {saveMessage}
          </div>
        ) : null}

        <section className="mb-4 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-sky-500 p-4 text-white shadow-sm sm:p-5">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-blue-50">{expressCopy.essentials}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-medium">{profileCompletion}%</p>
              <p className="text-xs text-blue-50">{expressCopy.completion}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
          <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {profileCopy.sections.identityTitle}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profileCopy.sections.identitySubtitle}
            </p>
          </div>

          <div className="mb-5">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {profileCopy.fields.profilePhoto}
            </label>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {avatarDisplayUrl ? (
                <img
                  src={avatarDisplayUrl}
                  alt={profileCopy.fields.profilePhoto}
                  className="h-16 w-16 rounded-full border-2 border-blue-200 object-cover shadow-md dark:border-blue-700/50"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-xl font-medium text-white shadow-md">
                  {initials}
                </div>
              )}
              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.jfif,.png,.webp,.heic,.heif,.avif"
                  className="sr-only"
                  onChange={handleAvatarFileChange}
                  disabled={isLoading || isSaving || isUploadingAvatar}
                />
                <button
                  type="button"
                  disabled={isLoading || isSaving || isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-600/60"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {isUploadingAvatar ? uploadPhotoLabel : profileCopy.fields.uploadPhoto}
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

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
          <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {profileCopy.sections.contactTitle}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profileCopy.sections.contactSubtitle}
            </p>
          </div>

          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900/60">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {profileCopy.fields.email}
            </label>
            <p className="truncate text-sm text-slate-700 dark:text-slate-200">{user?.email ?? '—'}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {profileCopy.fields.phone} <span className="text-[11px] text-gray-400">{profileCopy.messages.optional}</span>
              </label>
              <button
                type="button"
                onClick={handleAddPhoneNumber}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700/40 dark:text-blue-200 dark:hover:bg-blue-900/20"
              >
                <Plus className="h-3.5 w-3.5" />
                {phoneCopy.add}
              </button>
            </div>

            {formValues.phoneNumbers.map((phone, index) => (
                <div key={phone.key} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {index === 0 ? phoneCopy.primary : `${profileCopy.fields.phone} ${index + 1}`}
                    </span>
                    {formValues.phoneNumbers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoneNumber(phone.key)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {phoneCopy.remove}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
                    <select
                      value={phone.country}
                      onChange={(event) => handlePhoneCountryChange(phone.key, event.target.value)}
                      className={`${inputClassName} appearance-none cursor-pointer`}
                    >
                      {countryOptions.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone.number}
                      onChange={(event) => handlePhoneNumberChange(phone.key, event.target.value)}
                      className={inputClassName}
                      inputMode="tel"
                      autoComplete={index === 0 ? 'tel' : 'off'}
                      placeholder={phoneCopy.number}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {phoneCopy.formatHint(getPhoneExampleForCountry(phone.country))}
                  </p>
                </div>
            ))}
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {profileCopy.hints.phone}
            </p>
          </div>
        </div>

        </div>

        <details className="group mb-4 mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">{profileCopy.sections.securityTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{expressCopy.securityAction}</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-gray-200 bg-slate-50/70 p-4 dark:border-gray-700 dark:bg-slate-900/30 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300">{profileCopy.hints.password}</p>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {profileCopy.messages.passwordMinLength}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {profileCopy.fields.newPassword}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formValues.newPassword}
                    onChange={(event) => updateFormValue('newPassword', event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={hasPasswordMinLengthError}
                    className={`${inputClassName} min-h-11 pr-12 ${hasPasswordMinLengthError ? 'border-red-300 focus:ring-red-500' : isPasswordReady ? 'border-emerald-300' : ''}`}
                  />
                  <button type="button" onClick={() => setShowNewPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={showNewPassword ? profileCopy.accessibility.hidePassword : profileCopy.accessibility.showPassword}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {profileCopy.fields.confirmNewPassword}
                  {isPasswordReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formValues.confirmNewPassword}
                    onChange={(event) => updateFormValue('confirmNewPassword', event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={hasPasswordMismatch}
                    className={`${inputClassName} min-h-11 pr-12 ${hasPasswordMismatch ? 'border-red-300 focus:ring-red-500' : isPasswordReady ? 'border-emerald-300' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={showConfirmPassword ? profileCopy.accessibility.hidePassword : profileCopy.accessibility.showPassword}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {hasPasswordMismatch || hasPasswordMinLengthError ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-300">
                <CircleAlert className="h-4 w-4 flex-shrink-0" />
                {hasPasswordMinLengthError ? profileCopy.messages.passwordMinLength : profileCopy.messages.passwordMismatch}
              </div>
            ) : null}
          </div>
        </details>

      </div>

    </>
  );
}
