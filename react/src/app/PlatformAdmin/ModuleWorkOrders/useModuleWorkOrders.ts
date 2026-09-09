import { useModuleWorkOrderCopy } from "./translations";
import { useCallback, useEffect, useState } from "react";
import { platformAdminApi } from "../../api/platformAdmin";
import type { CreateModuleWorkOrderInput, ModuleWorkOrder } from "./types";

export function useModuleWorkOrders() {
  const copy = useModuleWorkOrderCopy();
  const [workOrders, setWorkOrders] = useState<ModuleWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<"loadError" | "">("");
  useEffect(() => {
    let active = true;
    platformAdminApi.getModuleWorkOrders()
      .then((result) => {
        if (active) setWorkOrders(result.work_orders);
      })
      .catch((reason: Error) => {
        if (active) setErrorKey("loadError");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const create = useCallback(async (input: CreateModuleWorkOrderInput) => {
    setErrorKey("");
    const workOrder = await platformAdminApi.createModuleWorkOrder(input);
    setWorkOrders((current) => [workOrder, ...current]);
    return workOrder;
  }, []);

  const remove = useCallback(async (id: number) => {
    setErrorKey("");
    await platformAdminApi.removeModuleWorkOrder(id);
    setWorkOrders((current) => current.filter((item) => item.id !== id));
  }, []);
  return { create, error: errorKey ? copy[errorKey] : "", loading, remove, workOrders };
}
