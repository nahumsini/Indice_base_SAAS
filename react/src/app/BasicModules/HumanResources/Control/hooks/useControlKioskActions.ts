import {
  type Dispatch,
  type SetStateAction,
  useMemo,
} from 'react';
import {
  type AttendanceKioskDevice,
  type AttendanceKioskDevicePayload,
  humanResourcesApi,
} from '../../../../api/humanResources';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import type { ControlTranslations } from '../translations';
import {
  CONTROL_SAVE_MINIMUM_LOADING_MS,
  normalizeKioskPayload,
  toErrorMessage,
  waitForNextPaint,
} from '../utils/control.utils';
import { useKioskQrCode } from './useKioskQrCode';

const buildKioskDeviceLink = (device: AttendanceKioskDevice | null | undefined) => {
  if (!device?.public_access_token || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/kiosk/${device.public_access_token}`;
};

interface UseControlKioskActionsParams {
  clearControlMessages: () => void;
  controlDate: string;
  copy: ControlTranslations;
  editingKiosk: AttendanceKioskDevice | null;
  isKioskQrDialogOpen: boolean;
  kioskDeviceToDelete: AttendanceKioskDevice | null;
  kioskForm: AttendanceKioskDevicePayload;
  selectedKioskDevice: AttendanceKioskDevice | null;
  loadControl: (date: string) => Promise<void>;
  setIsKioskDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsKioskQrDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setKioskDeviceToDelete: Dispatch<SetStateAction<AttendanceKioskDevice | null>>;
  setKioskDevices: Dispatch<SetStateAction<AttendanceKioskDevice[]>>;
  setSelectedKioskDeviceId: Dispatch<SetStateAction<number | null>>;
  showFailureToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
}

export function useControlKioskActions({
  clearControlMessages,
  controlDate,
  copy,
  editingKiosk,
  isKioskQrDialogOpen,
  kioskDeviceToDelete,
  kioskForm,
  selectedKioskDevice,
  loadControl,
  setIsKioskDialogOpen,
  setIsKioskQrDialogOpen,
  setIsSaving,
  setKioskDeviceToDelete,
  setKioskDevices,
  setSelectedKioskDeviceId,
  showFailureToast,
  showSuccessToast,
}: UseControlKioskActionsParams) {
  const selectedKioskDeviceLink = useMemo(
    () => buildKioskDeviceLink(selectedKioskDevice),
    [selectedKioskDevice?.public_access_token],
  );
  const kioskQrDataUrl = useKioskQrCode(isKioskQrDialogOpen, selectedKioskDeviceLink);

  const handleSaveKiosk = async () => {
    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        const kioskPayload: AttendanceKioskDevicePayload = normalizeKioskPayload(kioskForm);
        let savedKiosk: AttendanceKioskDevice;
        if (editingKiosk) {
          const response = await humanResourcesApi.updateAttendanceKioskDevice(editingKiosk.id, kioskPayload);
          savedKiosk = response.kiosk_device;
        } else {
          const response = await humanResourcesApi.createAttendanceKioskDevice(kioskPayload);
          savedKiosk = response.kiosk_device;
        }

        setKioskDevices((current) => {
          const exists = current.some((device) => device.id === savedKiosk.id);
          return exists
            ? current.map((device) => device.id === savedKiosk.id ? savedKiosk : device)
            : [savedKiosk, ...current];
        });
        setSelectedKioskDeviceId(savedKiosk.id);
        setIsKioskDialogOpen(false);
        showSuccessToast(copy.labels.kioskSaved);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowKioskQr = (device: AttendanceKioskDevice) => {
    setSelectedKioskDeviceId(device.id);
    setIsKioskQrDialogOpen(true);
  };

  const handleOpenKiosk = async (device?: AttendanceKioskDevice | null) => {
    const targetDevice = device ?? selectedKioskDevice;
    if (!targetDevice) {
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    const kioskWindow = window.open('about:blank', '_blank');
    if (!kioskWindow) {
      showFailureToast(copy.labels.kioskTabBlocked);
      return;
    }
    kioskWindow.opener = null;

    let kioskLink = buildKioskDeviceLink(targetDevice);
    if (!kioskLink) {
      try {
        const response = await humanResourcesApi.rotateAttendanceKioskDevicePublicToken(targetDevice.id);
        const deviceWithToken = response.kiosk_device;
        setKioskDevices((current) => current.map((item) => (
          item.id === deviceWithToken.id ? deviceWithToken : item
        )));
        setSelectedKioskDeviceId(deviceWithToken.id);
        kioskLink = buildKioskDeviceLink(deviceWithToken);
      } catch (error) {
        kioskWindow.close();
        showFailureToast(toErrorMessage(error, copy) || copy.kiosk.card.noAccessLink);
        return;
      }
    }

    if (!kioskLink) {
      kioskWindow.close();
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    kioskWindow.location.href = kioskLink;
  };

  const handleCopyKioskLink = async (device?: AttendanceKioskDevice | null) => {
    const kioskLink = buildKioskDeviceLink(device ?? selectedKioskDevice);
    if (!kioskLink) {
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    try {
      await navigator.clipboard.writeText(kioskLink);
      showSuccessToast(copy.labels.kioskLinkCopied);
    } catch {
      showFailureToast(copy.saveError);
    }
  };

  const handleRotateKioskLink = async (device?: AttendanceKioskDevice | null) => {
    const targetDevice = device ?? selectedKioskDevice;
    if (!targetDevice) {
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        const response = await humanResourcesApi.rotateAttendanceKioskDevicePublicToken(targetDevice.id);
        setKioskDevices((current) => current.map((device) => (
          device.id === response.kiosk_device.id ? response.kiosk_device : device
        )));
        setSelectedKioskDeviceId(response.kiosk_device.id);
        showSuccessToast(copy.labels.kioskLinkRotated);
        setIsKioskQrDialogOpen(false);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKiosk = async () => {
    if (!kioskDeviceToDelete) {
      return;
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.deleteAttendanceKioskDevice(kioskDeviceToDelete.id);
        setIsKioskQrDialogOpen(false);
        setKioskDeviceToDelete(null);
        showSuccessToast(copy.labels.kioskDeleted);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    selectedKioskDeviceLink,
    kioskQrDataUrl,
    handleSaveKiosk,
    handleShowKioskQr,
    handleOpenKiosk,
    handleCopyKioskLink,
    handleRotateKioskLink,
    handleDeleteKiosk,
  };
}
