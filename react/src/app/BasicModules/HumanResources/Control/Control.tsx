import { ControlDialogHost } from './components/ControlDialogHost';
import { ControlFeedback } from './components/ControlFeedback';
import { ControlOperationsWorkspace } from './components/ControlOperationsWorkspace';
import { useControlController } from './hooks/useControlController';

export default function Control() {
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
