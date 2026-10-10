import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { ClipboardList, PackageCheck } from "lucide-react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import {
  maintenanceApi,
  type RequestDetail,
  type Asset,
  type Context,
  type Plan,
  type Attachment,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Feedback,
  ReasonEditor,
  Status,
  formatDate,
  useMaintenanceQuery,
  label,
} from "./MaintenancePrimitives";
import { AssetEditor, RequestEditor } from "./MaintenanceEditors";
import { Evidence, History } from "./MaintenanceEvidence";

type Common = {
  c: MaintenanceCopy;
  context: Context;
  locale: string;
  onClose: () => void;
  onChanged: () => void;
};
export function RequestDossier({
  id,
  c,
  context,
  locale,
  onClose,
  onChanged,
  onOrder,
}: Common & { id: number; onOrder?: (id: number) => void }) {
  const result = useMaintenanceQuery(
    useCallback(
      (signal) => maintenanceApi.get<RequestDetail>(`/requests/${id}`, signal),
      [id],
    ),
  );
  const [review, setReview] = useState<boolean>();
  const detail = result.data;
  if (review !== undefined && detail)
    return (
      <ReasonEditor
        c={c}
        title={review ? c.accept : c.reject}
        onClose={() => setReview(undefined)}
        onSaved={() => {
          setReview(undefined);
          result.reload();
          onChanged();
        }}
        onSave={(reason) =>
          maintenanceApi.save(`/requests/${id}/triage`, {
            accept: review,
            reason,
            expectedVersion: detail.request.version,
          })
        }
      />
    );
  return (
    <IndiceModalFrame
      open
      tone="gray"
      modalType="operational-workspace"
      icon={<ClipboardList />}
      title={detail ? `#${id} · ${detail.request.title}` : c.requests}
      description={c.requestsHint}
      closeLabel={c.close}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={<Action onClick={onClose}>{c.close}</Action>}
    >
      {result.loading ? (
        <Feedback>{c.loading}</Feedback>
      ) : result.error ? (
        <Feedback error>{c.error}</Feedback>
      ) : (
        detail && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <Status value={detail.request.status} c={c} />
              <Status value={detail.request.priority} c={c} />
            </div>
            <p>
              {detail.request.assetName ?? detail.request.location} ·{" "}
              {formatDate(detail.request.createdAt, locale)}
            </p>
            <p className="whitespace-pre-wrap">{detail.request.description}</p>
            {context.manager && detail.request.status === "NEW" && (
              <div className="flex flex-wrap gap-3">
                {onOrder && (
                  <Action primary onClick={() => setReview(true)}>
                    {c.accept}
                  </Action>
                )}
                <Action onClick={() => setReview(false)}>{c.reject}</Action>
              </div>
            )}
            {detail.request.orderId && onOrder && (
              <Action onClick={() => onOrder(detail.request.orderId!)}>
                {c.orders} #{detail.request.orderId}
              </Action>
            )}
            <Evidence
              type="REQUEST"
              id={id}
              items={detail.attachments}
              c={c}
              canUpload={detail.request.status === "NEW"}
              onChanged={result.reload}
            />
            <History items={detail.history} c={c} locale={locale} />
          </div>
        )
      )}
    </IndiceModalFrame>
  );
}
export function AssetDossier({
  id,
  c,
  context,
  locale,
  onClose,
  onChanged,
  onOrders,
  canReport,
}: Common & { id: number; onOrders?: () => void; canReport: boolean }) {
  const result = useMaintenanceQuery(
    useCallback(
      (signal) => maintenanceApi.get<Asset>(`/assets/${id}`, signal),
      [id],
    ),
  );
  const [operation, setOperation] = useState(""),
    [qr, setQr] = useState("");
  const asset = result.data;
  useEffect(() => {
    if (operation === "qr") {
      let active = true;
      QRCode.toDataURL(
        `${window.location.origin}/maintenance/assets?asset=${id}`,
        { width: 320, margin: 2 },
      ).then((value) => {
        if (active) setQr(value);
      });
      return () => {
        active = false;
      };
    }
  }, [operation, id]);
  const saved = () => {
    setOperation("");
    result.reload();
    onChanged();
  };
  if (asset && operation === "edit")
    return (
      <AssetEditor
        c={c}
        context={context}
        asset={asset}
        onClose={() => setOperation("")}
        onSaved={saved}
      />
    );
  if (asset && operation === "report")
    return (
      <RequestEditor
        c={c}
        context={context}
        asset={asset}
        onClose={() => setOperation("")}
        onSaved={saved}
      />
    );
  if (asset && operation === "restore")
    return (
      <ReasonEditor
        c={c}
        title={c.restore}
        onClose={() => setOperation("")}
        onSaved={saved}
        onSave={(reason) =>
          maintenanceApi.save(`/assets/${id}/restore`, {
            expectedVersion: asset.version,
            reason,
          })
        }
      />
    );
  return (
    <IndiceModalFrame
      open
      tone="gray"
      modalType="operational-workspace"
      icon={<PackageCheck />}
      title={asset?.name ?? c.asset}
      description={c.assetsHint}
      closeLabel={c.close}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={<Action onClick={onClose}>{c.close}</Action>}
    >
      {result.loading ? (
        <Feedback>{c.loading}</Feedback>
      ) : result.error ? (
        <Feedback error>{c.error}</Feedback>
      ) : (
        asset && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Status value={asset.criticality} c={c} />
              <span>{label(c, asset.assetType)}</span>
              <span>
                {asset.active ? c.active : c.paused} ·{" "}
                {asset.unavailable ? c.unavailable : c.available}
              </span>
            </div>
            <p>{asset.location}</p>
            <p className="whitespace-pre-wrap">{asset.notes}</p>
            {asset.hrAssetId && (
              <Feedback>
                {c.hrAsset} #{asset.hrAssetId} · {c.hrHint}
              </Feedback>
            )}
            <div className="flex flex-wrap gap-3">
              {context.manager && (
                <Action onClick={() => setOperation("edit")}>{c.edit}</Action>
              )}
              {canReport && asset.active && (
                <Action primary onClick={() => setOperation("report")}>
                  {c.newRequest}
                </Action>
              )}
              {onOrders && <Action onClick={onOrders}>{c.assetHistory}</Action>}
              <Action
                onClick={() => setOperation(operation === "qr" ? "" : "qr")}
              >
                {c.qr}
              </Action>
              {context.manager && asset.unavailable && (
                <Action onClick={() => setOperation("restore")}>
                  {c.restore}
                </Action>
              )}
            </div>
            {operation === "qr" && (
              <div className="rounded-xl border p-5">
                <p>{c.qrHint}</p>
                {qr && (
                  <img
                    src={qr}
                    width={260}
                    height={260}
                    alt={c.qr}
                    className="my-4 max-w-full"
                  />
                )}
                <a
                  href={`${window.location.origin}/maintenance/assets?asset=${id}`}
                  className="break-all text-sm underline"
                >
                  {window.location.origin}/maintenance/assets?asset={id}
                </a>
              </div>
            )}
            {asset.unavailable && <Feedback>{c.restoreHint}</Feedback>}
            <AssetEvidence asset={asset} c={c} manager={context.manager} />
          </div>
        )
      )}
    </IndiceModalFrame>
  );
}
function AssetEvidence({
  asset,
  c,
  manager,
}: {
  asset: Asset;
  c: MaintenanceCopy;
  manager: boolean;
}) {
  const result = useMaintenanceQuery(
    useCallback(
      (signal) =>
        maintenanceApi.get<Attachment[]>(`/evidence/ASSET/${asset.id}`, signal),
      [asset.id],
    ),
  );
  return result.error ? (
    <Feedback error>{c.error}</Feedback>
  ) : result.data ? (
    <Evidence
      type="ASSET"
      id={asset.id}
      items={result.data}
      canUpload={manager && asset.active}
      c={c}
      onChanged={result.reload}
    />
  ) : null;
}
export function PlanDossier({
  plan,
  c,
  onClose,
  onChanged,
}: {
  plan: Plan;
  c: MaintenanceCopy;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [toggle, setToggle] = useState(false);
  if (toggle)
    return (
      <ReasonEditor
        c={c}
        title={plan.active ? c.pause : c.resumePlan}
        onClose={() => setToggle(false)}
        onSaved={() => {
          onChanged();
          onClose();
        }}
        onSave={(reason) =>
          maintenanceApi.save(`/plans/${plan.id}/status`, {
            expectedVersion: plan.version,
            active: !plan.active,
            reason,
          })
        }
      />
    );
  return (
    <IndiceModalFrame
      open
      tone="gray"
      modalType="operational-workspace"
      icon={<ClipboardList />}
      title={plan.title}
      description={c.preventiveHint}
      closeLabel={c.close}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <Action onClick={onClose}>{c.close}</Action>
          <Action onClick={() => setToggle(true)}>
            {plan.active ? c.pause : c.resumePlan}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        <p>
          {plan.assetName} · {plan.active ? c.active : c.paused}
        </p>
        <p>
          {c.nextDate}: {plan.nextDate} · {c.interval} {plan.intervalCount} ·{" "}
          {label(c, plan.frequency)}
        </p>
        <p>
          {c.timezone}: {plan.timezone} · {c.leadDays}: {plan.leadDays}
        </p>
        <p className="whitespace-pre-wrap">{plan.description}</p>
        <ol className="list-decimal space-y-3 pl-6">
          {plan.checklist.map((s, i) => (
            <li key={i}>
              {s.label}
              {s.required ? ` · ${c.required}` : ""}
            </li>
          ))}
        </ol>
        <Feedback>{c.recurrenceHint}</Feedback>
      </div>
    </IndiceModalFrame>
  );
}
