from sqlalchemy import select
from database.models import Player

class ProfileService:
    def __init__(self, session):
        self.session = session

    async def get_player(self, discord_id: int) -> Player | None:
        query = select(Player).where(Player.discord_id == discord_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()