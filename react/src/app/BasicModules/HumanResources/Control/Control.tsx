import { useEffect, useState } from 'react';
import { authApi } from '../../../api/auth';
import { isHrManagementRole } from '../../../access/accessRules';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { ControlDialogHost } from './components/ControlDialogHost';
import { ControlFeedback } from './components/ControlFeedback';
import { ControlOperationsWorkspace } from './components/ControlOperationsWorkspace';
import { SelfShiftCalendar } from './components/SelfShiftCalendar';
import { useControlController } from './hooks/useControlController';
import { useControlTranslations } from './hooks/useControlTranslations';

export default function Control() {
  const copy = useControlTranslations();
  const [role, setRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    authApi.getSessionOrNull()
      .then((session) => {
        if (active) {
          setRole(session?.user.role ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setRole(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (role === undefined) {
    return (
      <LoadingBarOverlay
        isVisible
        title={copy.loading}
        description={copy.subtitle}
      />
    );
  }

  if (!isHrManagementRole(role)) {
    return <SelfShiftCalendar />;
  }

  return <ManagementControl />;
}

function ManagementControl() {
  const {
    dialogHostProps,
    feedbackProps,
    workspaceProps,
  } = useControlController();

  return (
    <>
      <ControlFeedback {...feedbackProps} />
      <ControlOperationsWorkspace {...workspaceProps} />
      <ControlDialogHost {...dialogHostProps} />
    </>
  );
}
