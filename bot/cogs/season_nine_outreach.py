from __future__ import annotations

import os
from datetime import datetime

import discord
from discord.ext import commands
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.season_nine_outreach import (
    deliver_due_outreach_batch,
    prepare_due_outreach_campaign,
    send_completed_outreach_report,
)


class SeasonNineOutreach(commands.Cog):
    name = "season_nine_outreach"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        guild_id = os.getenv("GUILD_ID")
        if not guild_id:
            return
        try:
            async with async_session() as session:
                await prepare_due_outreach_campaign(
                    self.bot,
                    session,
                    int(guild_id),
                )
                await deliver_due_outreach_batch(self.bot, session)
                await send_completed_outreach_report(self.bot, session)
        except (
            SQLAlchemyError,
            discord.HTTPException,
            OSError,
            TypeError,
            ValueError,
        ) as error:
            print(f"[SEASON OUTREACH] Campaign processing failed: {error}")
            raise

    async def next_due_at(self) -> datetime | None:
        if not os.getenv("GUILD_ID"):
            return None
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    WITH campaign_due_times AS (
                        SELECT CASE
                            WHEN campaign.status = 'scheduled' THEN GREATEST(
                                campaign.scheduled_at,
                                campaign.next_attempt_at
                            )
                            WHEN campaign.status = 'preparing' THEN GREATEST(
                                campaign.scheduled_at,
                                campaign.next_attempt_at,
                                campaign.updated_at + INTERVAL '5 minutes'
                            )
                            WHEN campaign.status = 'sending' THEN GREATEST(
                                campaign.next_batch_at,
                                COALESCE((
                                    SELECT MIN(recipient.available_at)
                                    FROM direct_message_campaign_recipients recipient
                                    WHERE recipient.campaign_id = campaign.id
                                      AND recipient.status = 'pending'
                                ), campaign.next_batch_at)
                            )
                            WHEN campaign.status = 'completed'
                              AND campaign.report_status = 'pending'
                                THEN campaign.report_available_at
                            ELSE NULL
                        END AS due_at
                        FROM direct_message_campaigns campaign
                        WHERE campaign.campaign_key = :campaign_key
                    )
                    SELECT MIN(due_at) FROM campaign_due_times
                    """
                ),
                {"campaign_key": "season-nine-round-one-outreach"},
            )
            return result.scalar_one_or_none()


async def setup(bot: commands.Bot) -> None:
    cog = SeasonNineOutreach(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
