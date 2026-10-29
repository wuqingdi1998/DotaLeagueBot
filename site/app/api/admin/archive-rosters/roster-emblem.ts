import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  allowedTeamImageTypes,
  hasExpectedImageSignature,
} from "@/app/api/applications/application-support";

export async function storeRosterEmblem(emblem: FormDataEntryValue | null) {
  if (emblem === null) return null;
  if (!(emblem instanceof File) || emblem.size === 0) {
    throw new Error("EMBLEM:Выберите файл логотипа");
  }
  if (emblem.size > 2 * 1024 * 1024) {
    throw new Error("EMBLEM:Размер логотипа не должен превышать 2 МБ");
  }
  const extension = allowedTeamImageTypes.get(emblem.type);
  if (!extension) {
    throw new Error("EMBLEM:Логотип должен быть в формате PNG, JPG или WebP");
  }
  const bytes = new Uint8Array(await emblem.arrayBuffer());
  if (!hasExpectedImageSignature(bytes, extension)) {
    throw new Error("EMBLEM:Файл логотипа повреждён или имеет неверный формат");
  }
  const key = `${crypto.randomUUID()}.${extension}`;
  const directory = path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "team-emblems",
  );
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, key);
  await writeFile(filePath, bytes, { flag: "wx" });
  return { key, remove: () => unlink(filePath).catch(() => undefined) };
}
