import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";

// Fixed synthetic fixtures only. This experiment has no file intake or ERP access.
export const sampleIdSchema = z.enum(["synthetic-png", "synthetic-jpeg"]);
export type SampleId = z.infer<typeof sampleIdSchema>;
export const maximumPreviewBytes = 2 * 1024 * 1024;
const fixtureHashes: Record<SampleId, string> = {
  "synthetic-png": "0b7d889b119d7f6fc92ed3dfac3d2d99bf5984bba4e15c6b6612093868d838a6",
  "synthetic-jpeg": "ba06e501f1f4fa85b6f9dc8ff8ab7624d65486f4c3d4750066e69fae9a9755c3"
};
export const sampleMetadataSchema = z.object({
  sampleId: sampleIdSchema,
  fileName: z.string(),
  mimeType: z.enum(["image/png", "image/jpeg"]),
  sizeBytes: z.number().int().positive().max(maximumPreviewBytes),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  synthetic: z.literal(true)
}).strict();
export type SampleMetadata = z.infer<typeof sampleMetadataSchema>;

export function sample(id: SampleId): { metadata: SampleMetadata; bytes: Buffer } {
  const png = id === "synthetic-png";
  const fileName = png ? "sample.png" : "sample.jpg";
  const bytes = readFileSync(new URL(`../../../fixtures/visual-probe/${fileName}`, import.meta.url));
  const signature = png
    ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  if (!signature) throw Error("Synthetic fixture signature mismatch.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== fixtureHashes[id]) throw Error("Synthetic fixture integrity mismatch; do not replace it with business files.");
  const metadata = sampleMetadataSchema.parse({ sampleId: id, fileName,
    mimeType: png ? "image/png" : "image/jpeg", sizeBytes: bytes.length,
    sha256, synthetic: true });
  return { metadata, bytes };
}
