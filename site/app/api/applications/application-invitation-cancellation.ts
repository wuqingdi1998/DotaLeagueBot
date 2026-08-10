import type { PoolClient } from "pg";

export async function cancelApplicationInvitations(
  client: PoolClient,
  applicationId: number,
) {
  await client.query(
    `UPDATE tournament_team_members
     SET invitation_status = 'declined',
       responded_at = COALESCE(responded_at, NOW())
     WHERE application_id = $1
       AND invitation_status = 'invited'`,
    [applicationId],
  );
  await client.query(
    `UPDATE notification_outbox
     SET status = CASE
       WHEN status = 'pending' THEN 'cancelled'
       WHEN status = 'sent' THEN 'delete_pending'
       ELSE status
     END,
       available_at = NOW()
     WHERE application_id = $1
       AND event_type = 'team_invitation'
       AND status IN ('pending', 'sent')`,
    [applicationId],
  );
}
