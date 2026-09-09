import { getCatalogCopy } from "./translations";
import type { PlatformCatalogProduct } from "../../api/platformAdmin";

type AnnualDiscountProduct = Pick<PlatformCatalogProduct, "commercial_kind" | "product_type" | "product_code">;

export function defaultAnnualDiscountPercent(product: AnnualDiscountProduct | null, creatingPackage = false): number {
  if (creatingPackage || product?.commercial_kind === "PACKAGE") return 20;
  if (product?.product_code === "module_additional_unit") return 20;
  if (product?.commercial_kind === "MODULE" && product.product_type === "BASIC") return 20;
  return 0;
}

export function stripeEnvironmentLabel(mode: "TEST" | "LIVE" | null | undefined, languageCode: string | boolean = "en-CA"): string {
  if (mode === "LIVE") return getCatalogCopy(languageCode).liveMode;
  if (mode === "TEST") return getCatalogCopy(languageCode).testMode;
  return getCatalogCopy(languageCode).stripeModeUnavailable;
}
