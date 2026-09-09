import type {
  PlatformCatalog,
  PlatformCatalogPublication,
  PlatformCatalogPublicationRequest,
} from '../../api/platformAdmin';

type PublicationApi = {
  synchronizeAndPublishCatalogDraft: (
    versionId: number,
    payload: PlatformCatalogPublicationRequest,
  ) => Promise<PlatformCatalogPublication>;
  getCatalog: () => Promise<PlatformCatalog>;
};

/** Refresh after an uncertain response before offering a retry of a financial operation. */
export async function publishCatalogOffer(
  api: PublicationApi,
  versionId: number,
  payload: PlatformCatalogPublicationRequest,
) {
  let publication: PlatformCatalogPublication | null = null;
  let error: unknown;
  try {
    publication = await api.synchronizeAndPublishCatalogDraft(versionId, payload);
  } catch (publicationError) {
    error = publicationError;
  }

  let catalog: PlatformCatalog | null = null;
  try {
    catalog = await api.getCatalog();
  } catch {
    // A refresh failure does not undo a confirmed publication.
  }
  const active = catalog?.versions.find(
    (version) => version.id === versionId && version.status === 'ACTIVE',
  );
  return {
    published: publication?.published === true || Boolean(active),
    versionCode: publication?.version_code ?? active?.version_code,
    catalog,
    error: error instanceof Error ? error.message : null,
  };
}
