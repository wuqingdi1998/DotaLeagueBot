import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { one, query } from "@/lib/db";
import {
  customizableSubscriptionRoleNames,
  normalizeDotaAccountId,
} from "@/lib/player-profile";
import { isSafeUploadKey } from "@/lib/validation";

export const dynamic = "force-dynamic";

const maximumBackgroundSize = 25 * 1024 * 1024;

function uploadsDirectory() {
  return path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "profile-backgrounds",
  );
}

async function removeBackgroundFile(key: string | null) {
  if (!key || !isSafeUploadKey(key)) return;
  try {
    await unlink(path.join(uploadsDirectory(), key));
  } catch {
    // The database remains the source of truth if an old file is already gone.
  }
}

async function requireProfileOwner(requestedDotaId: string) {
  const user = await getSession();
  if (!user) {
    throw Response.json(
      { error: "Требуется вход через Discord" },
      { status: 401 },
    );
  }
  const dotaId = normalizeDotaAccountId(requestedDotaId);
  if (!dotaId || user.dotaId !== dotaId) {
    throw Response.json(
      { error: "Можно менять оформление только своего профиля" },
      { status: 403 },
    );
  }
  return user;
}

async function hasCustomBackgroundAccess(discordId: string) {
  return one<{ role_name: string }>(
    `SELECT role_name
     FROM player_discord_roles
     WHERE player_id = $1
       AND role_name = ANY($2::text[])
     LIMIT 1`,
    [discordId, customizableSubscriptionRoleNames],
  );
}

function isJpeg(data: Uint8Array) {
  return (
    data.length >= 3 &&
    data[0] === 255 &&
    data[1] === 216 &&
    data[2] === 255
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ dotaId: string }> },
) {
  const storedFiles: string[] = [];
  try {
    const { dotaId } = await context.params;
    const user = await requireProfileOwner(dotaId);
    if (!(await hasCustomBackgroundAccess(user.discordId))) {
      return Response.json(
        { error: "Свой фон доступен владельцам цветных рун" },
        { status: 403 },
      );
    }

    const body = await request.formData();
    const desktopBackground = body.get("desktopBackground");
    const mobileBackground = body.get("mobileBackground");
    if (
      !(desktopBackground instanceof File) ||
      desktopBackground.size === 0 ||
      !(mobileBackground instanceof File) ||
      mobileBackground.size === 0
    ) {
      return Response.json(
        { error: "Подготовьте оба варианта фона: для компьютера и телефона" },
        { status: 400 },
      );
    }

    const files = [desktopBackground, mobileBackground];
    const fileData: Uint8Array[] = [];
    for (const background of files) {
      if (
        background.type !== "image/jpeg" ||
        background.size > maximumBackgroundSize
      ) {
        return Response.json(
          {
            error: "Каждый подготовленный фон не должен превышать 25 МБ",
          },
          { status: 400 },
        );
      }
      const data = new Uint8Array(await background.arrayBuffer());
      if (!isJpeg(data)) {
        return Response.json(
          { error: "Файл фона повреждён или имеет неверный формат" },
          { status: 400 },
        );
      }
      fileData.push(data);
    }

    const currentPreference = await one<{
      custom_background_key: string | null;
      custom_background_mobile_key: string | null;
    }>(
      `SELECT custom_background_key, custom_background_mobile_key
       FROM player_profile_preferences
       WHERE player_id = $1`,
      [user.discordId],
    );
    const desktopBackgroundKey = `${crypto.randomUUID()}.jpg`;
    const mobileBackgroundKey = `${crypto.randomUUID()}.jpg`;
    const directory = uploadsDirectory();
    await mkdir(directory, { recursive: true });
    const desktopPath = path.join(directory, desktopBackgroundKey);
    const mobilePath = path.join(directory, mobileBackgroundKey);
    await writeFile(desktopPath, fileData[0], { flag: "wx" });
    storedFiles.push(desktopPath);
    await writeFile(mobilePath, fileData[1], { flag: "wx" });
    storedFiles.push(mobilePath);

    await query(
      `INSERT INTO player_profile_preferences (
         player_id, background_key, custom_background_key,
         custom_background_mobile_key, updated_at
       )
       VALUES ($1, 'default', $2, $3, NOW())
       ON CONFLICT (player_id) DO UPDATE
       SET custom_background_key = EXCLUDED.custom_background_key,
           custom_background_mobile_key =
             EXCLUDED.custom_background_mobile_key,
           updated_at = NOW()`,
      [user.discordId, desktopBackgroundKey, mobileBackgroundKey],
    );
    await removeBackgroundFile(
      currentPreference?.custom_background_key ?? null,
    );
    await removeBackgroundFile(
      currentPreference?.custom_background_mobile_key ?? null,
    );
    storedFiles.length = 0;
    return Response.json({ ok: true });
  } catch (error) {
    for (const storedFile of storedFiles) {
      try {
        await unlink(storedFile);
      } catch {
        // Nothing else to clean up.
      }
    }
    if (error instanceof Response) return error;
    console.error("Failed to save profile background", error);
    return Response.json(
      { error: "Не удалось сохранить фон. Попробуйте ещё раз" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ dotaId: string }> },
) {
  try {
    const { dotaId } = await context.params;
    const user = await requireProfileOwner(dotaId);
    const currentPreference = await one<{
      custom_background_key: string | null;
      custom_background_mobile_key: string | null;
    }>(
      `SELECT custom_background_key, custom_background_mobile_key
       FROM player_profile_preferences
       WHERE player_id = $1`,
      [user.discordId],
    );
    await query(
      `UPDATE player_profile_preferences
       SET custom_background_key = NULL,
           custom_background_mobile_key = NULL,
           updated_at = NOW()
       WHERE player_id = $1`,
      [user.discordId],
    );
    await removeBackgroundFile(
      currentPreference?.custom_background_key ?? null,
    );
    await removeBackgroundFile(
      currentPreference?.custom_background_mobile_key ?? null,
    );
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to reset profile background", error);
    return Response.json(
      { error: "Не удалось вернуть стандартный фон" },
      { status: 500 },
    );
  }
}
