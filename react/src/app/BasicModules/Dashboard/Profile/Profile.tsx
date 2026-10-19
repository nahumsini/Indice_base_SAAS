import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, CircleAlert, Eye, EyeOff, Loader2, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { configCenterApi, currentProfileActor, type ConfigCenterCurrentUser, type ConfigCenterPhoneNumber } from '../../../api/configCenter';
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
import { getProfileFeedback } from './profileFeedback';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { ApiClientError } from '../../../lib/apiClient';

const inputClassName =
  'w-full min-h-11 md:min-h-0 px-3 py-2 text-base md:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

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

  const profileCountry = user.country && isProfileCountry(user.country) ? user.country : DEFAULT_PROFILE_COUNTRY;

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
  useAuthorizationRevision();
  const actor = currentProfileActor();
  return <ProfileEditor key={actor} actor={actor} />;
}

function ProfileEditor({ actor }: { actor: string | null }) {
  const { currentLanguage } = useLanguage();
  const profileCopy = useProfileTranslations();
  const feedback = getProfileFeedback(currentLanguage.code);
  const alive = useRef(true);
  const savingRef = useRef(false);
  const uploadingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isCurrent = () => alive.current && actor !== null && currentProfileActor() === actor;
  const readableError = (error: unknown, fallback: string) => {
    if (error instanceof ApiClientError) {
      if (error.code === 'profile_actor_changed') return feedback.sessionChanged;
      if (error.status === 401 || error.status === 403) return feedback.permission;
      const messages: Record<string, string> = {
        STORAGE_QUOTA_EXCEEDED: feedback.photoQuota,
        profile_name_required: feedback.nameRequired, profile_name_too_long: feedback.nameTooLong,
        profile_invalid_phone: profileCopy.messages.invalidPhone, profile_duplicate_phone: feedback.duplicatePhone,
        profile_phone_limit: feedback.phoneLimit, profile_password_mismatch: profileCopy.messages.passwordMismatch,
        profile_password_short: profileCopy.messages.passwordMinLength, profile_password_long: feedback.passwordTooLong,
      };
      if (error.code && messages[error.code]) return messages[error.code];
    }
    return fallback;
  };
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
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setIsLoading(true); setErrorMessage('');
    if (!actor) { setIsLoading(false); return; }
    configCenterApi.getCurrentUser().then(response => {
      if (!active || !isCurrent()) return;
      if (String(response.id) !== actor.split(':')[1]) throw new Error('Unexpected profile identity.');
      const nextValues = createProfileFormValues(response);
      setUser(response); setBaselineValues(nextValues); setFormValues(nextValues);
    }).catch(error => { if (active && isCurrent()) setErrorMessage(readableError(error, profileCopy.messages.loadError)); })
      .finally(() => { if (active && isCurrent()) setIsLoading(false); });
    return () => { active = false; };
  }, [actor, loadAttempt]);
  useEffect(() => {
    if (errorMessage && Object.keys(fieldErrors).length === 0) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [errorMessage, fieldErrors]);

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
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [avatarDisplayUrl]);
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
  const trimmedNewPassword = formValues.newPassword;
  const trimmedPasswordConfirmation = formValues.confirmNewPassword;
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
  const isSaveDisabled = isUploadingAvatar || !user || !baselineValues;
  const fieldsDisabled = isLoading || isSaving || isUploadingAvatar || !user;
  useEffect(() => {
    if (!hasUnsavedChanges && !isUploadingAvatar && !isSaving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges, isUploadingAvatar, isSaving]);

  const updateFormValue = <Key extends keyof ProfileFormValues>(
    field: Key,
    value: ProfileFormValues[Key],
  ) => {
    setFieldErrors(current => {
      const next = { ...current }; delete next[field];
      if (field === 'firstName' || field === 'lastName') delete next.firstName;
      if (field === 'newPassword' || field === 'confirmNewPassword') { delete next.newPassword; delete next.confirmNewPassword; }
      return next;
    });
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
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const updatePhoneNumbers = (updater: (phones: ProfilePhoneFormValue[]) => ProfilePhoneFormValue[]) => {
    setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith('phone-'))));
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
    if (formValues.phoneNumbers.length >= 10) return;
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

    if (!file || savingRef.current || uploadingRef.current || !isCurrent() || !user) {
      return;
    }

    const sourceContentType = normalizeAvatarSourceContentType(file);
    if (!sourceContentType) {
      setErrorMessage(feedback.photoType);
      setSaveMessage('');
      return;
    }

    if (file.size > PROFILE_AVATAR_MAX_SOURCE_SIZE_BYTES) {
      setErrorMessage(profileCopy.hints.photoFormat);
      setSaveMessage('');
      return;
    }

    uploadingRef.current = true;
    setIsUploadingAvatar(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      const compressedAvatar = await compressProfileAvatar(file);
      if (!isCurrent()) return;
      const presign = await configCenterApi.presignCurrentUserAvatarUpload({
        file_name: compressedAvatar.fileName,
        content_type: compressedAvatar.contentType,
        size_bytes: compressedAvatar.blob.size,
      });

      if (!isCurrent()) return;
      await configCenterApi.uploadCurrentUserAvatar(
        presign.upload_url,
        compressedAvatar.blob,
        presign.content_type || compressedAvatar.contentType,
        presign.upload_headers ?? {},
      );

      if (!isCurrent()) return;
      replaceAvatarPreview(URL.createObjectURL(compressedAvatar.blob));
      setSaveMessage(feedback.photoReady);
      setFormValues((currentValues) => ({
        ...currentValues,
        avatarObjectKey: presign.object_key,
        avatarContentType: presign.content_type || compressedAvatar.contentType,
      }));
    } catch (error) {
      if (isCurrent()) setErrorMessage(readableError(error, feedback.photoError));
    } finally {
      uploadingRef.current = false;
      if (isCurrent()) setIsUploadingAvatar(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!baselineValues || savingRef.current || uploadingRef.current) {
      return;
    }

    setFormValues({ ...baselineValues });
    setFieldErrors({});
    setShowNewPassword(false); setShowConfirmPassword(false);
    replaceAvatarPreview('');
    setErrorMessage('');
    setSaveMessage('');
  };

  const handleSaveProfile = async (
    valuesToSave = formValues,
    baselineToSave = baselineValues,
  ) => {
    if (
      !isCurrent() || savingRef.current || uploadingRef.current || !user
      || !baselineToSave
      || isUploadingAvatar
      || areProfileFormValuesEqual(valuesToSave, baselineToSave)
    ) {
      return;
    }

    const nextPassword = valuesToSave.newPassword;
    const nextPasswordConfirmation = valuesToSave.confirmNewPassword;
    const hasPasswordChange = nextPassword.length > 0 || nextPasswordConfirmation.length > 0;

    const errors: Record<string, string> = {};
    const fullName = [valuesToSave.firstName.trim(), valuesToSave.lastName.trim()].filter(Boolean).join(' ');
    if (!fullName) errors.firstName = feedback.nameRequired;
    else if ([...fullName].length > 100) errors.firstName = feedback.nameTooLong;
    if (hasPasswordChange) {
      if (!nextPassword.trim() || nextPassword.length < 8) errors.newPassword = profileCopy.messages.passwordMinLength;
      else if (new TextEncoder().encode(nextPassword).length > 72) errors.newPassword = feedback.passwordTooLong;
      if (nextPassword !== nextPasswordConfirmation) errors.confirmNewPassword = profileCopy.messages.passwordMismatch;
    }
    const formattedPhones: ConfigCenterPhoneNumber[] = [];
    const seen = new Set<string>();
    valuesToSave.phoneNumbers.forEach((phone, index) => {
      const number = phone.number.trim();
      if (!number || isPhoneInputDialCodeOnly(number, phone.country)) return;
      const validation = validatePhoneForProfileCountry(number, phone.country);
      if (!validation.ok) { errors[`phone-${index}`] = profileCopy.messages.invalidPhone; return; }
      if (seen.has(validation.e164)) { errors[`phone-${index}`] = feedback.duplicatePhone; return; }
      seen.add(validation.e164);
      formattedPhones.push({ id: phone.id, label: phone.label.trim() || `Phone ${index + 1}`,
        phone: validation.e164, country: phone.country, is_primary: formattedPhones.length === 0 });
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setErrorMessage(Object.values(errors)[0]); setSaveMessage('');
      const firstKey = Object.keys(errors)[0];
      const target = firstKey === 'firstName' ? 'profile-first-name' : firstKey.startsWith('phone-')
        ? `profile-${firstKey}` : firstKey === 'newPassword' ? 'profile-new-password' : 'profile-confirm-password';
      const control = document.getElementById(target);
      const security = control?.closest('details'); if (security) security.open = true;
      control?.focus();
      return;
    }
    savingRef.current = true;
    setIsSaving(true); setErrorMessage(''); setSaveMessage('');
    try {
      const response = await configCenterApi.saveCurrentUser({
        primer_nombre: valuesToSave.firstName.trim(),
        apellido_paterno: valuesToSave.lastName.trim(),
        telefono: formattedPhones[0]?.phone ?? '',
        phone_numbers: formattedPhones,
        country: valuesToSave.country,
        preferred_language: currentLanguage.code,
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

      if (!isCurrent()) return;
      if (String(response.id) !== actor?.split(':')[1]) throw new Error('Unexpected profile identity.');
      const nextValues = createProfileFormValues(response);

      setUser(response);
      setBaselineValues(nextValues);
      if (areProfileFormValuesEqual(formValuesRef.current, valuesToSave)) {
        setFormValues(nextValues);
        replaceAvatarPreview('');
      }
      setShowNewPassword(false); setShowConfirmPassword(false);
      setSaveMessage(profileCopy.messages.saveSuccess);
      window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail: { user: response, actor } }));
    } catch (error) {
      if (isCurrent()) setErrorMessage(readableError(error, profileCopy.messages.saveError));
    } finally {
      savingRef.current = false;
      if (isCurrent()) setIsSaving(false);
    }
  };

  const renderActions = () => (
              <div className="flex min-w-0 items-center gap-2 sm:justify-end">
                {hasUnsavedChanges ? (
                  <button type="button" onClick={handleDiscardChanges} disabled={isSaving || isUploadingAvatar} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                    {profileCopy.actions.discard}
                  </button>
                ) : null}
                <button type="button" onClick={() => void handleSaveProfile()} disabled={isLoading || isSaving || isSaveDisabled || !hasUnsavedChanges} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900 sm:flex-none">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? profileCopy.actions.saving : profileCopy.actions.save}
                </button>
              </div>
  );

  return (
    <>
      <div className="min-w-0" data-profile-editor aria-busy={isSaving || isUploadingAvatar}>
        <div className="mb-6">
          <DashboardTitleBar
            actions={<div className="hidden sm:block">{renderActions()}</div>}
            emoji="👤"
            subtitle={profileCopy.subtitle}
            title={profileCopy.title}
          />
        </div>

        {isLoading ? (
          <div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
            {profileCopy.messages.loading}
          </div>
        ) : null}

        {errorMessage ? (
          <div ref={errorRef} role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
            {!user && !isLoading ? <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="ml-2 min-h-11 px-3 font-medium underline">{feedback.retry}</button> : null}
          </div>
        ) : null}

        {saveMessage ? (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
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

        <fieldset disabled={fieldsDisabled} className="min-w-0">
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
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
              {avatarDisplayUrl && !avatarFailed ? (
                <img
                  src={avatarDisplayUrl}
                  onError={() => setAvatarFailed(true)}
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
                  className="inline-flex min-h-11 md:min-h-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-600/60"
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
            {fieldErrors.firstName ? <p id="profile-name-error" className="mb-2 text-sm text-red-600 dark:text-red-300">{fieldErrors.firstName}</p> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-first-name" className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {profileCopy.fields.firstNames}
                </label>
                <input
                  type="text"
                  id="profile-first-name"
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={fieldErrors.firstName ? 'profile-name-error' : undefined}
                  autoComplete="given-name"
                  value={formValues.firstName}
                  onChange={(event) => updateFormValue('firstName', event.target.value)}
                  className={inputClassName}
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {profileCopy.hints.firstNames}
                </p>
              </div>
              <div>
                <label htmlFor="profile-last-name" className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {profileCopy.fields.lastNames}
                </label>
                <input
                  type="text"
                  id="profile-last-name"
                  maxLength={100}
                  autoComplete="family-name"
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
                <label htmlFor="profile-country" className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {profileCopy.fields.country}
                </label>
                <select
                  id="profile-country"
                  autoComplete="country"
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
            <p className="break-all text-sm text-slate-700 dark:text-slate-200">{user?.email ?? '—'}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{feedback.emailReadOnly}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {profileCopy.fields.phone} <span className="text-[11px] text-gray-400">{profileCopy.messages.optional}</span>
              </label>
              <button
                type="button"
                onClick={handleAddPhoneNumber}
                disabled={formValues.phoneNumbers.length >= 10}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700/40 dark:text-blue-200 dark:hover:bg-blue-900/20"
              >
                <Plus className="h-3.5 w-3.5" />
                {phoneCopy.add}
              </button>
            </div>

            {formValues.phoneNumbers.length >= 10 ? <p className="text-xs text-gray-500 dark:text-gray-400">{feedback.phoneLimit}</p> : null}
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
                        className="inline-flex min-h-11 md:min-h-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {phoneCopy.remove}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
                    <select
                      aria-label={`${profileCopy.fields.country} · ${index + 1}`}
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
                      id={`profile-phone-${index}`}
                      maxLength={40}
                      aria-invalid={Boolean(fieldErrors[`phone-${index}`])}
                      aria-describedby={fieldErrors[`phone-${index}`] ? `profile-phone-error-${index}` : undefined}
                      aria-label={`${phoneCopy.number} · ${index + 1}`}
                      value={phone.number}
                      onChange={(event) => handlePhoneNumberChange(phone.key, event.target.value)}
                      className={inputClassName}
                      inputMode="tel"
                      autoComplete={index === 0 ? 'tel' : 'off'}
                      placeholder={phoneCopy.number}
                    />
                  </div>
                  {fieldErrors[`phone-${index}`] ? <p id={`profile-phone-error-${index}`} className="mt-2 text-sm text-red-600 dark:text-red-300">{fieldErrors[`phone-${index}`]}</p> : null}
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
                <label htmlFor="profile-new-password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {profileCopy.fields.newPassword}
                </label>
                <div className="relative">
                  <input
                    id="profile-new-password"
                    aria-describedby="profile-password-error"
                    type={showNewPassword ? 'text' : 'password'}
                    value={formValues.newPassword}
                    onChange={(event) => updateFormValue('newPassword', event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={hasPasswordMinLengthError || Boolean(fieldErrors.newPassword)}
                    className={`${inputClassName} min-h-11 pr-12 ${hasPasswordMinLengthError ? 'border-red-300 focus:ring-red-500' : isPasswordReady ? 'border-emerald-300' : ''}`}
                  />
                  <button type="button" onClick={() => setShowNewPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-11 w-11 md:h-9 md:w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={showNewPassword ? profileCopy.accessibility.hidePassword : profileCopy.accessibility.showPassword}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="profile-confirm-password" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {profileCopy.fields.confirmNewPassword}
                  {isPasswordReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                </label>
                <div className="relative">
                  <input
                    id="profile-confirm-password"
                    aria-describedby="profile-password-error"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formValues.confirmNewPassword}
                    onChange={(event) => updateFormValue('confirmNewPassword', event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={hasPasswordMismatch || Boolean(fieldErrors.confirmNewPassword)}
                    className={`${inputClassName} min-h-11 pr-12 ${hasPasswordMismatch ? 'border-red-300 focus:ring-red-500' : isPasswordReady ? 'border-emerald-300' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-11 w-11 md:h-9 md:w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={showConfirmPassword ? profileCopy.accessibility.hidePassword : profileCopy.accessibility.showPassword}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {hasPasswordMismatch || hasPasswordMinLengthError || fieldErrors.newPassword || fieldErrors.confirmNewPassword ? (
              <div id="profile-password-error" className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-300">
                <CircleAlert className="h-4 w-4 flex-shrink-0" />
                {fieldErrors.newPassword || fieldErrors.confirmNewPassword || (hasPasswordMinLengthError ? profileCopy.messages.passwordMinLength : profileCopy.messages.passwordMismatch)}
              </div>
            ) : null}
          </div>
        </details>
        </fieldset>
        <div className="sticky bottom-0 z-20 -mx-1 rounded-xl border border-blue-100 bg-white/95 p-3 shadow-sm backdrop-blur sm:hidden dark:border-slate-700 dark:bg-slate-900/95" data-profile-mobile-actions>
          {saveMessage ? <p aria-live="polite" className="mb-2 text-xs text-emerald-700 dark:text-emerald-300">{saveMessage}</p> : hasUnsavedChanges ? <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">{profileCopy.messages.unsavedChanges}</p> : null}
          {renderActions()}
        </div>
      </div>

    </>
  );
}
