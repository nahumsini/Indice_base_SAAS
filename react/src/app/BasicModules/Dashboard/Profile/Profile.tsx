import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, CircleAlert, CreditCard, Eye, EyeOff, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { configCenterApi, type ConfigCenterCurrentUser, type ConfigCenterPhoneNumber } from '../../../api/configCenter';
import { runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { languages, useLanguage } from '../../../shared/context';
import { LearningModeTitleBarBridge } from '../../../learningMode';
import {
  DEFAULT_PROFILE_COUNTRY,
  getProfileCountryLabel,
  isProfileCountry,
  PROFILE_COUNTRY_OPTIONS,
} from '../../../shared/profileCountries';
import {
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

const PROFILE_AUTO_SAVE_DEBOUNCE_MS = 800;
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

const isBlankProfilePhoneNumber = (phone: ProfilePhoneFormValue) => (
  !phone.number.trim() || isPhoneInputDialCodeOnly(phone.number, phone.country)
);

export default function Profile() {
  const { currentLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { pageId } = useParams();
  const profileCopy = t.panelInicial.profile;
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
  const failedAutoSaveKeyRef = useRef('');

  const replaceAvatarPreview = (nextPreviewUrl: string) => {
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }

    avatarPreviewRef.current = nextPreviewUrl;
    setAvatarPreviewUrl(nextPreviewUrl);
  };

  useEffect(() => {
    let active = true;

    runWithMinimumDuration(configCenterApi.getCurrentUser())
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
  const phoneCopy = currentLanguage.code.startsWith('es')
    ? { add: 'Agregar teléfono', number: 'Número', primary: 'Principal', remove: 'Quitar' }
    : { add: 'Add phone', number: 'Number', primary: 'Primary', remove: 'Remove' };

  const initials = ((firstNames[0] ?? '') + (lastNames[0] ?? '')).trim().toUpperCase() || 'U';
  const avatarDisplayUrl = avatarPreviewUrl || user?.avatar_url || '';
  const uploadPhotoLabel = currentLanguage.code.startsWith('es') ? 'Subiendo foto...' : 'Uploading photo...';
  const hasUnsavedChanges = baselineValues !== null && !areProfileFormValuesEqual(formValues, baselineValues);
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

  const handleViewPlans = () => {
    navigate(`/${pageId ?? 'home-panel'}/plan`);
  };

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
          phone: validation.international,
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
      failedAutoSaveKeyRef.current = '';
      window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail: { user: response } }));
    } catch (error) {
      failedAutoSaveKeyRef.current = JSON.stringify(valuesToSave);
      setErrorMessage(error instanceof Error ? error.message : profileCopy.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (
      isLoading
      || isSaving
      || isUploadingAvatar
      || isSaveDisabled
      || !baselineValues
      || !hasUnsavedChanges
    ) {
      return undefined;
    }

    const autoSaveKey = JSON.stringify(formValues);
    if (failedAutoSaveKeyRef.current === autoSaveKey) {
      return undefined;
    }

    const hasBlankExtraPhone = formValues.phoneNumbers.length > 1
      && formValues.phoneNumbers.some((phone) => isBlankProfilePhoneNumber(phone));
    const hasInvalidPhoneNumber = formValues.phoneNumbers.some((phone) => (
      !isBlankProfilePhoneNumber(phone)
      && !validatePhoneForProfileCountry(phone.number, phone.country).ok
    ));

    if (hasBlankExtraPhone || hasInvalidPhoneNumber) {
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      void handleSaveProfile(formValues, baselineValues);
    }, PROFILE_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [
    baselineValues,
    formValues,
    hasUnsavedChanges,
    isLoading,
    isSaveDisabled,
    isSaving,
    isUploadingAvatar,
    user,
  ]);

  const titleBarActions = (
    <button
      type="button"
      onClick={handleViewPlans}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-700/40 dark:bg-gray-800 dark:text-blue-200 dark:hover:bg-blue-900/20 sm:w-auto"
    >
      <CreditCard className="h-4 w-4" />
      {t.panelInicial.tabs.plan}
    </button>
  );

  return (
    <>
      <div>
        <LearningModeTitleBarBridge actions={titleBarActions}>
        <div className="bg-blue-50 dark:bg-blue-900/10 mb-6 rounded-lg border border-blue-200 p-4 dark:border-blue-700/30 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
                <span className="text-2xl">👤</span>
                {t.panelInicial.profile.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.panelInicial.profile.subtitle}
              </p>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                {profileCopy.helper}
              </p>
            </div>
            {titleBarActions}
          </div>
        </div>
        </LearningModeTitleBarBridge>

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
              {avatarDisplayUrl ? (
                <img
                  src={avatarDisplayUrl}
                  alt={t.panelInicial.profile.fields.profilePhoto}
                  className="h-16 w-16 rounded-full border-2 border-blue-200 object-cover shadow-md dark:border-blue-700/50"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-xl font-semibold text-white shadow-md">
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
                  {isUploadingAvatar ? uploadPhotoLabel : t.panelInicial.profile.fields.uploadPhoto}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.panelInicial.profile.fields.phone} <span className="text-[11px] text-gray-400">{profileCopy.messages.optional}</span>
              </label>
              <button
                type="button"
                onClick={handleAddPhoneNumber}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700/40 dark:text-blue-200 dark:hover:bg-blue-900/20"
              >
                <Plus className="h-3.5 w-3.5" />
                {phoneCopy.add}
              </button>
            </div>

            {formValues.phoneNumbers.map((phone, index) => (
                <div key={phone.key} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {index === 0 ? phoneCopy.primary : `${t.panelInicial.profile.fields.phone} ${index + 1}`}
                    </span>
                    {formValues.phoneNumbers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoneNumber(phone.key)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
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
                </div>
            ))}
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

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/70 p-4 dark:border-blue-700/30 dark:from-blue-900/10 dark:via-gray-800 dark:to-blue-900/10 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row">
              <div className="xl:w-[280px] xl:flex-shrink-0">
                <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm dark:border-blue-700/30 dark:bg-gray-800/90">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {profileCopy.sections.securitySubtitle}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 dark:border-blue-700/30 dark:bg-blue-900/10">
                      <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-300" />
                      <p className="text-xs leading-5 text-gray-600 dark:text-gray-300">
                        {profileCopy.messages.passwordMinLength}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800/80">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                      <p className="text-xs leading-5 text-gray-600 dark:text-gray-300">
                        {profileCopy.hints.password}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                  isPasswordReady
                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-700/40 dark:bg-emerald-900/10'
                    : hasPasswordMinLengthError
                    ? 'border-amber-300 bg-amber-50/80 dark:border-amber-700/40 dark:bg-amber-900/10'
                    : trimmedNewPassword.length > 0
                      ? 'border-blue-200 bg-white dark:border-blue-700/40 dark:bg-gray-800'
                      : 'border-gray-200 bg-white/90 dark:border-gray-700 dark:bg-gray-800/90'
                }`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                        1
                      </span>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {profileCopy.fields.newPassword}
                        </label>
                        <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                          {profileCopy.messages.passwordMinLength}
                        </p>
                      </div>
                    </div>
                    {isPasswordReady ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                    ) : null}
                  </div>

                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formValues.newPassword}
                      onChange={(event) => updateFormValue('newPassword', event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={hasPasswordMismatch || hasPasswordMinLengthError}
                      className={`${inputClassName} pr-12 ${
                        isPasswordReady
                          ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10'
                          : hasPasswordMinLengthError
                          ? 'border-amber-300 focus:ring-amber-500'
                          : trimmedNewPassword.length > 0
                            ? 'border-blue-300 bg-blue-50/40 dark:bg-blue-900/10'
                            : ''
                      }`}
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

                <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                  isPasswordReady
                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-700/40 dark:bg-emerald-900/10'
                    : hasPasswordMismatch
                    ? 'border-red-300 bg-red-50/80 dark:border-red-700/40 dark:bg-red-900/10'
                    : trimmedPasswordConfirmation.length > 0
                      ? 'border-blue-200 bg-white dark:border-blue-700/40 dark:bg-gray-800'
                      : 'border-gray-200 bg-white/90 dark:border-gray-700 dark:bg-gray-800/90'
                }`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                        2
                      </span>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {profileCopy.fields.confirmNewPassword}
                        </label>
                        <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                          {hasPasswordMismatch ? profileCopy.messages.passwordMismatch : profileCopy.hints.password}
                        </p>
                      </div>
                    </div>
                    {isPasswordReady ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                    ) : null}
                  </div>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formValues.confirmNewPassword}
                      onChange={(event) => updateFormValue('confirmNewPassword', event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={hasPasswordMismatch}
                      className={`${inputClassName} pr-12 ${
                        isPasswordReady
                          ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10'
                          : hasPasswordMismatch
                          ? 'border-red-300 focus:ring-red-500'
                          : trimmedPasswordConfirmation.length > 0
                            ? 'border-blue-300 bg-blue-50/40 dark:bg-blue-900/10'
                            : ''
                      }`}
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
            </div>

            {hasPasswordMismatch || hasPasswordMinLengthError ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-700/40 dark:bg-red-900/15 dark:text-red-200">
                <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="space-y-1 text-sm leading-5">
                  {hasPasswordMinLengthError ? (
                    <p>{profileCopy.messages.passwordMinLength}</p>
                  ) : null}
                  {hasPasswordMismatch ? (
                    <p>{profileCopy.messages.passwordMismatch}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
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

    </>
  );
}
