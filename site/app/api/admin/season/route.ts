import { confirmOrganizerPassword, requireAdmin } from "@/lib/auth";
import {
  createSeasonGame,
  createSeasonMatch,
  deleteSeasonGame,
  deleteSeasonMatch,
  updateSeasonGame,
  updateSeasonMatch,
} from "./season-match-actions";
import {
  createSeasonLobby,
  deleteSeasonLobby,
  resizeSeason,
  updateSeasonLobby,
  updateSeasonRound,
} from "./season-round-actions";
import {
  createSeasonAdjustment,
  deleteSeasonAdjustment,
  deleteSeasonPenalty,
  saveSeasonPenalty,
  updateSeasonAdjustment,
  updateSeasonParticipant,
} from "./season-player-actions";
import {
  createSeasonSubstitution,
  deleteSeasonSubstitution,
  updateSeasonSubstitution,
} from "./season-substitution-actions";
import {
  deleteSeasonFinalist,
  saveSeasonFinalist,
} from "./season-finalist-actions";
import { updateSeasonLobbyConfiguration } from "./season-lobby-configuration-actions";
import {
  addSeasonRoundRegistration,
  deleteSeasonRoundRegistration,
} from "./season-registration-actions";
import { savePublishedLobbyMatchIds } from "./season-published-lobby-actions";
import { setSeasonLobbyHost } from "./season-lobby-host-actions";

export const dynamic = "force-dynamic";

type SeasonRequest = Record<string, unknown> & {
  entity?:
    | "season"
    | "round"
    | "lobby"
    | "match"
    | "game"
    | "participant"
    | "adjustment"
    | "penalty"
    | "substitution"
    | "finalist"
    | "lobbyConfiguration"
    | "registration"
    | "publishedLobby"
    | "lobbyHost";
  password?: string;
};

async function seasonErrorResponse(error: unknown) {
  if (error instanceof Response) {
    const responseText = await error.text();
    return Response.json(
      { error: responseText || "Не удалось сохранить изменения" },
      { status: error.status || 500 },
    );
  }
  const code =
    error instanceof Error && "code" in error
      ? String((error as Error & { code?: string }).code)
      : "";
  if (code === "23505") {
    return Response.json(
      { error: "Такая запись уже существует" },
      { status: 409 },
    );
  }
  if (["22003", "23503", "23514"].includes(code)) {
    return Response.json(
      { error: "Проверьте связанные записи и введённые значения" },
      { status: 400 },
    );
  }
  if (["40P01", "40001", "55P03"].includes(code)) {
    return Response.json(
      {
        error:
          "Другое сохранение выполнялось одновременно. Повторите действие",
      },
      { status: 409 },
    );
  }
  console.error("Season admin mutation failed", error);
  return Response.json(
    { error: "Сервер не смог сохранить изменения. Попробуйте ещё раз" },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as SeasonRequest;
    if (body.entity === "lobby") return Response.json(await createSeasonLobby(body), { status: 201 });
    if (body.entity === "lobbyConfiguration") {
      return Response.json(
        await updateSeasonLobbyConfiguration(body, admin.discordId),
      );
    }
    if (body.entity === "match") {
      return Response.json(
        await createSeasonMatch(body, admin.discordId),
        { status: 201 },
      );
    }
    if (body.entity === "game") return Response.json(await createSeasonGame(body), { status: 201 });
    if (body.entity === "adjustment") {
      return Response.json(await createSeasonAdjustment(body), { status: 201 });
    }
    if (body.entity === "penalty") {
      return Response.json(await saveSeasonPenalty(body), { status: 201 });
    }
    if (body.entity === "substitution") {
      return Response.json(await createSeasonSubstitution(body), { status: 201 });
    }
    if (body.entity === "finalist") {
      return Response.json(await saveSeasonFinalist(body), { status: 201 });
    }
    if (body.entity === "registration") {
      return Response.json(
        await addSeasonRoundRegistration(body, admin.discordId),
        { status: 201 },
      );
    }
    return Response.json({ error: "Некорректный тип записи" }, { status: 400 });
  } catch (error) {
    return seasonErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as SeasonRequest;
    if (body.entity === "season") {
      return Response.json(await resizeSeason(body, admin.discordId));
    }
    if (body.entity === "round") {
      return Response.json(await updateSeasonRound(body, admin.discordId));
    }
    if (body.entity === "lobby") return Response.json(await updateSeasonLobby(body));
    if (body.entity === "match") {
      return Response.json(await updateSeasonMatch(body, admin.discordId));
    }
    if (body.entity === "game") return Response.json(await updateSeasonGame(body));
    if (body.entity === "participant") {
      return Response.json(await updateSeasonParticipant(body));
    }
    if (body.entity === "adjustment") {
      return Response.json(await updateSeasonAdjustment(body));
    }
    if (body.entity === "penalty") {
      return Response.json(await saveSeasonPenalty(body));
    }
    if (body.entity === "substitution") {
      return Response.json(await updateSeasonSubstitution(body));
    }
    if (body.entity === "finalist") {
      return Response.json(await saveSeasonFinalist(body));
    }
    if (body.entity === "publishedLobby") {
      return Response.json(
        await savePublishedLobbyMatchIds(body, admin.discordId),
      );
    }
    if (body.entity === "lobbyHost") {
      return Response.json(await setSeasonLobbyHost(body, admin.discordId));
    }
    return Response.json({ error: "Некорректный тип записи" }, { status: 400 });
  } catch (error) {
    return seasonErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as SeasonRequest;
    const admin =
      body.entity === "registration"
        ? await confirmOrganizerPassword(body.password ?? "")
        : await requireAdmin();
    if (body.entity === "lobby") return Response.json(await deleteSeasonLobby(body));
    if (body.entity === "match") {
      return Response.json(await deleteSeasonMatch(body, admin.discordId));
    }
    if (body.entity === "game") return Response.json(await deleteSeasonGame(body));
    if (body.entity === "adjustment") {
      return Response.json(await deleteSeasonAdjustment(body));
    }
    if (body.entity === "penalty") {
      return Response.json(await deleteSeasonPenalty(body));
    }
    if (body.entity === "substitution") {
      return Response.json(await deleteSeasonSubstitution(body));
    }
    if (body.entity === "finalist") {
      return Response.json(await deleteSeasonFinalist(body));
    }
    if (body.entity === "registration") {
      return Response.json(
        await deleteSeasonRoundRegistration(body, admin.discordId),
      );
    }
    return Response.json({ error: "Некорректный тип записи" }, { status: 400 });
  } catch (error) {
    return seasonErrorResponse(error);
  }
}
