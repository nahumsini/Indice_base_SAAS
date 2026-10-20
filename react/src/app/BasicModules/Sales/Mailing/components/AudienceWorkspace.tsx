import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { SalesModalFrame } from "../../components/SalesModalFrame";
import { RecipientPicker } from "./RecipientPicker";
import type { MailingContact } from "../mailingApi";
import { useDeliveryCopy } from "../deliveryCopy";
import { useMailingCopy } from "../translations";
import { useMailingWorkspaceCopy } from "../workspaceCopy";
export function AudienceWorkspace({
  canManage,
  onClose,
}: {
  canManage: boolean;
  onClose: () => void;
}) {
  const { copy } = useMailingCopy(),
    text = useMailingWorkspaceCopy();
  const deliveryCopy = useDeliveryCopy();
  const [selected, setSelected] = useState<MailingContact[]>([]);
  const [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false);
  const close = () => {
    if (!busy) {
      if (selected.length) setDiscard(true);
      else onClose();
    }
  };
  return (
    <SalesModalFrame
      open
      modalType={discard ? "confirmation" : "operational-workspace"}
      busy={busy}
      title={discard ? text.discardSelection : text.lists}
      description={discard ? text.discardHint : text.listsHint}
      icon={<Users className="h-5 w-5" />}
      closeLabel={deliveryCopy.close}
      onOpenChange={(open) => {
        if (!open) {
          if (discard) setDiscard(false);
          else close();
        }
      }}
      footerLeading={
        discard ? (
          <Button variant="outline" onClick={() => setDiscard(false)}>
            {copy.keepEditing}
          </Button>
        ) : undefined
      }
      footer={
        <Button disabled={busy} onClick={discard ? onClose : close}>
          {deliveryCopy.close}
        </Button>
      }
    >
      <div hidden={discard}>
        <RecipientPicker
          copy={copy}
          selected={selected}
          onChange={setSelected}
          disabled={busy}
          onBusyChange={setBusy}
          listMode
          canManageLists={canManage}
        />
      </div>
    </SalesModalFrame>
  );
}
