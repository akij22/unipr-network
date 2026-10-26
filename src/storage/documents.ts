import type { AppDatabase } from "./database";
import { decodeDocument } from "./decode";
import type { NetworkDocument } from "../app/types";
import { fail, issue, ok, type Result } from "../domain/types";
export type SavedNetworkSummary = {
  id: string;
  name: string;
  updatedAt: number;
};
export interface DocumentRepository {
  list(): Promise<SavedNetworkSummary[]>;
  load(id: string): Promise<Result<NetworkDocument>>;
  save(
    document: NetworkDocument,
    overwriteId?: string,
  ): Promise<Result<string>>;
}
export class SavedNetworkMetadataError extends Error {
  constructor() {
    super("Saved network metadata is invalid");
    this.name = "SavedNetworkMetadataError";
  }
}
export function createDocumentRepository(db: AppDatabase): DocumentRepository {
  return {
    async list() {
      const rows = await db.getAll("documents");
      for (const row of rows)
        if (
          typeof row.id !== "string" ||
          !row.id.trim() ||
          typeof row.name !== "string" ||
          !row.name.trim() ||
          typeof row.updatedAt !== "number" ||
          !Number.isFinite(row.updatedAt) ||
          !Number.isFinite(new Date(row.updatedAt).getTime())
        )
          throw new SavedNetworkMetadataError();
      return rows
        .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async load(id) {
      try {
        const row = await db.get("documents", id);
        if (!row) return fail(issue("SAVE_NOT_FOUND", [], {}, "input"));
        if (row.schema !== 1)
          return fail(issue("SAVE_VERSION_UNSUPPORTED", [], {}, "input"));
        const decoded = decodeDocument(row.document);
        if (decoded.ok && decoded.value.id !== id)
          return fail(issue("SAVE_DATA_INVALID", [], {}, "input"));
        return decoded;
      } catch (cause) {
        console.error("Read saved network failed", cause);
        return fail(
          issue("SAVE_STORAGE_FAILED", [], { action: "open" }, "resource"),
        );
      }
    },
    async save(document, overwriteId) {
      const name = document.name.trim();
      if (!name) return fail(issue("SAVE_NAME_REQUIRED", [], {}, "input"));
      const id = overwriteId ?? document.id,
        doc = { ...document, id, name },
        decoded = decodeDocument(doc);
      if (!decoded.ok) return decoded;
      try {
        const tx = db.transaction("documents", "readwrite");
        try {
          const normalName = name.normalize("NFC").toLocaleLowerCase("en"),
            sameName = await tx.store.index("normalName").get(normalName),
            existing = await tx.store.get(id);
          if (sameName && sameName.id !== id) {
            await tx.done;
            return fail(
              issue(
                "SAVE_NAME_EXISTS",
                [],
                { id: sameName.id, name: sameName.name },
                "input",
              ),
            );
          }
          if (existing && !overwriteId) {
            await tx.done;
            return fail(issue("SAVE_OVERWRITE_REQUIRED", [], { id }, "input"));
          }
          if (overwriteId && !existing) {
            await tx.done;
            return fail(issue("SAVE_NOT_FOUND", [], {}, "input"));
          }
          await tx.store.put({
            id,
            name,
            normalName,
            updatedAt: Date.now(),
            schema: 1,
            document: doc,
          });
          await tx.done;
          return ok(id);
        } catch (cause) {
          try {
            tx.abort();
          } catch {
            /* The transaction may already have aborted. */
          }
          await tx.done.catch(() => undefined);
          throw cause;
        }
      } catch (cause) {
        console.error("Save network failed", cause);
        return fail(
          issue(
            "SAVE_STORAGE_FAILED",
            [],
            {
              action: "save",
              reason:
                cause instanceof DOMException &&
                cause.name === "QuotaExceededError"
                  ? "quota"
                  : "unavailable",
            },
            "resource",
          ),
        );
      }
    },
  };
}
