import discord


class TeamService:
    def __init__(self, guild: discord.Guild):
        self.guild = guild

    async def create_team_environment(self, team_name: str, captain: discord.Member = None):
        role = await self._create_role(team_name)

        channel = await self._create_text_channel(team_name, role)

        if captain:
            await self._assign_role(captain, role)

        return {"role": role, "channel": channel}

    async def delete_team_environment(self, role_id: int, channel_id: int):
        if role_id:
            role = self.guild.get_role(role_id)
            if role:
                try:
                    await role.delete()
                except:
                    pass

        if channel_id:
            channel = self.guild.get_channel(channel_id)
            if channel:
                try:
                    await channel.delete()
                except:
                    pass


    async def _create_role(self, team_name: str) -> discord.Role:
        return await self.guild.create_role(
            name=team_name,
            mentionable=True,
            reason="Регистрация новой команды"
        )

    async def _create_text_channel(self, team_name: str, team_role: discord.Role) -> discord.TextChannel:
        category_name = "DOTA LEAGUE TEAMS"
        category = discord.utils.get(self.guild.categories, name=category_name)

        if not category:
            category = await self.guild.create_category(name=category_name)

        overwrites = {
            self.guild.default_role: discord.PermissionOverwrite(read_messages=False),
            team_role: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            self.guild.me: discord.PermissionOverwrite(read_messages=True),
        }

        clean_name = team_name.strip().replace(" ", "-").lower()

        return await self.guild.create_text_channel(
            name=clean_name,
            category=category,
            overwrites=overwrites
        )

    async def _assign_role(self, member: discord.Member, role: discord.Role):
        await member.add_roles(role)