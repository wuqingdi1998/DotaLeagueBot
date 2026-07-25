import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";

type RuleInput = { text?: string };
type PrizeInput = {
  placement?: number;
  applicationId?: number | null;
  teamName?: string | null;
  prizeText?: string | null;
};

type ContentBody = {
  tournamentId?: number;
  rules?: Array<string | RuleInput>;
  prizes?: PrizeInput[];
};

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as ContentBody;
    const tournamentId = Number(body.tournamentId);
    if (!tournamentId) {
      return Response.json({ error: "Не указан турнир" }, { status: 400 });
    }

    const rules = (body.rules ?? [])
      .map((rule) => (typeof rule === "string" ? rule : rule.text ?? "").trim())
      .filter(Boolean);
    if (rules.some((rule) => rule.length > 3000)) {
      return Response.json(
        { error: "Один пункт регламента не должен превышать 3000 символов" },
        { status: 400 },
      );
    }

    const prizes = (body.prizes ?? []).map((prize) => ({
      placement: Number(prize.placement),
      applicationId: prize.applicationId ? Number(prize.applicationId) : null,
      teamName: prize.teamName?.trim() || null,
      prizeText: prize.prizeText?.trim() || null,
    }));
    if (
      prizes.some(
        (prize) =>
          !Number.isInteger(prize.placement) ||
          prize.placement < 1 ||
          prize.placement > 64 ||
          (!prize.applicationId && !prize.teamName),
      )
    ) {
      return Response.json(
        { error: "Для каждого приза укажите место и команду" },
        { status: 400 },
      );
    }
    if (new Set(prizes.map((prize) => prize.placement)).size !== prizes.length) {
      return Response.json(
        { error: "Одно место нельзя указать дважды" },
        { status: 400 },
      );
    }

    await transaction(async (client) => {
      const tournament = await client.query(
        "SELECT id FROM tournaments WHERE id = $1 FOR UPDATE",
        [tournamentId],
      );
      if (!tournament.rowCount) throw new Error("TOURNAMENT_NOT_FOUND");

      await client.query("DELETE FROM tournament_rules WHERE tournament_id = $1", [
        tournamentId,
      ]);
      for (const [index, rule] of rules.entries()) {
        await client.query(
          `INSERT INTO tournament_rules (tournament_id, sort_order, rule_text)
           VALUES ($1, $2, $3)`,
          [tournamentId, index + 1, rule],
        );
      }

      await client.query("DELETE FROM tournament_prizes WHERE tournament_id = $1", [
        tournamentId,
      ]);
      for (const prize of prizes) {
        await client.query(
          `INSERT INTO tournament_prizes (
             tournament_id, placement, application_id,
             team_name_snapshot, prize_text
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            tournamentId,
            prize.placement,
            prize.applicationId,
            prize.teamName,
            prize.prizeText,
          ],
        );
      }

      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, details)
         VALUES ($1, $2, 'content_update', 'tournament', $3::jsonb)`,
        [
          tournamentId,
          admin.discordId,
          JSON.stringify({ ruleCount: rules.length, prizeCount: prizes.length }),
        ],
      );
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    return responseFromAuthError(error);
  }
}

