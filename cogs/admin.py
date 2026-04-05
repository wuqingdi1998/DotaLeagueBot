import discord
from discord import app_commands
from discord.ext import commands
import io
import re
import asyncio
from datetime import timedelta


WEBHOOK_NAME = "LS Bot"


# --- HELPER: Get or create persistent webhook ---
async def get_or_create_webhook(channel: discord.TextChannel) -> discord.Webhook:
    """Find an existing persistent webhook or create one."""
    webhooks = await channel.webhooks()
    for wh in webhooks:
        if wh.name == WEBHOOK_NAME:
            return wh
    return await channel.create_webhook(name=WEBHOOK_NAME)


# --- 1. CONFIRMATION VIEW CLASS ---
class ConfirmSendView(discord.ui.View):
    def __init__(self, channel, username, avatar_url, content, embed, files_data):
        super().__init__(timeout=300)  # Button active for 5 minutes
        self.channel = channel
        self.username = username
        self.avatar_url = avatar_url
        self.content = content
        self.embed = embed
        self.files_data = files_data  # List of tuples [(filename, bytes)]

    @discord.ui.button(label="Отправить в канал", style=discord.ButtonStyle.green, emoji="🚀")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        # Defer immediately to avoid interaction timeout
        await interaction.response.defer(ephemeral=True)

        try:
            # 1. Get or create persistent webhook
            webhook = await get_or_create_webhook(self.channel)

            # 2. Re-construct files from memory bytes
            final_files = []
            for f_name, f_bytes in self.files_data:
                final_files.append(discord.File(io.BytesIO(f_bytes), filename=f_name))

                # If using Embed, bind the image to it to avoid duplication in chat
                if self.embed:
                    self.embed.set_image(url=f"attachment://{f_name}")

            # 3. Send the actual message via Webhook
            sent_msg = await webhook.send(
                content=self.content,
                embed=self.embed,
                files=final_files,
                username=self.username,
                avatar_url=self.avatar_url,
                allowed_mentions=discord.AllowedMentions.all(),
                wait=True  # Returns the Message object
            )

            self.stop()

            await interaction.followup.send(
                f"✅ Успешно опубликовано в {self.channel.mention}\n"
                f"🔗 ID сообщения: `{sent_msg.id}`",
                ephemeral=True
            )

        except Exception as e:
            await interaction.followup.send(f"❌ Error sending webhook: {e}", ephemeral=True)


# --- 2. MAIN ADMIN COG ---
class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="say", description="[Admin] Создать пост (Текст вводится следующим сообщением)")
    @app_commands.checks.has_permissions(administrator=True)
    async def say(self, interaction: discord.Interaction,
                  channel: discord.TextChannel,
                  title: str = None,
                  image: discord.Attachment = None,
                  ping_role: discord.Role = None,
                  ping_everyone: bool = False,
                  username: str = "Linken's Sphere Esports",
                  avatar_url: str = None):

        # 1. Prompt the user to send the text message
        await interaction.response.send_message(
            f"✍️ **Ожидание ввода текста...**\n"
            f"Напишите текст объявления следующим сообщением в этот чат.\n"
            f"Вы можете использовать переносы строк (Enter), пинги и смайлики.\n"
            f"*(У вас есть 5 минут)*",
            ephemeral=True
        )

        # 2. Define check: wait for message from THIS user in THIS channel
        def check(m):
            return m.author == interaction.user and m.channel == interaction.channel

        try:
            # Wait for user input
            user_msg = await self.bot.wait_for('message', check=check, timeout=300)

            # Capture content and attempt to delete user's message for cleanliness
            raw_text = user_msg.content
            try:
                await user_msg.delete()
            except:
                pass  # Ignore if bot lacks permission to delete messages

        except asyncio.TimeoutError:
            return await interaction.followup.send("⏰ Время вышло! Попробуйте снова.", ephemeral=True)

        # --- 3. PROCESSING CONTENT ---
        try:
            # --- EMOJI REPLACEMENT LOGIC (REGEX) ---
            def replace_emoji(match):
                # Extract name (e.g. "pepe")
                name = match.group(1)
                # Find emoji in cache
                emoji = discord.utils.get(self.bot.emojis, name=name)
                if emoji: return str(emoji)
                return match.group(0)

            # Regex: Match :name: ONLY if not preceded by < (to avoid breaking existing custom emojis)
            pattern = r"(?<!<):([a-zA-Z0-9_]+):"

            proc_text = raw_text
            proc_title = title or ""

            if proc_text: proc_text = re.sub(pattern, replace_emoji, proc_text)
            if proc_title: proc_title = re.sub(pattern, replace_emoji, proc_title)

            # --- MENTIONS SETUP ---
            mentions = ""
            if ping_everyone: mentions += "@everyone "
            if ping_role: mentions += f"{ping_role.mention} "

            # --- CONTENT ASSEMBLY ---
            final_embed = None
            final_content = mentions
            files_to_save = []
            preview_files = []

            # Handle Image
            if image:
                img_data = await image.read()
                files_to_save.append((image.filename, img_data))
                preview_files.append(discord.File(io.BytesIO(img_data), filename=image.filename))

            # Handle Embed vs Plain Text
            if title:
                # If title exists -> Use Embed
                final_embed = discord.Embed(title=proc_title, description=proc_text, color=discord.Color.gold())
                if image:
                    final_embed.set_image(url=f"attachment://{image.filename}")
            else:
                # No title -> Use Plain Text
                final_content += f"\n{proc_text}"

            # Validation: Ensure we are not sending an empty message
            if not final_content.strip() and not final_embed and not files_to_save:
                if not raw_text:
                    return await interaction.followup.send("❌ Вы прислали пустое сообщение!", ephemeral=True)

            # --- PREVIEW GENERATION ---
            current_avatar = avatar_url or self.bot.user.display_avatar.url

            confirm_view = ConfirmSendView(
                channel=channel,
                username=username,
                avatar_url=current_avatar,
                content=final_content,
                embed=final_embed,
                files_data=files_to_save
            )

            preview_msg = f"**ПРЕВЬЮ ДЛЯ КАНАЛА {channel.mention}:**\n"

            # Send private preview
            await interaction.followup.send(
                content=preview_msg + final_content,
                embed=final_embed,
                view=confirm_view,
                files=preview_files,
                ephemeral=True
            )

        except Exception as e:
            await interaction.followup.send(f"❌ System Error: {e}", ephemeral=True)

    @app_commands.command(name="debug_me", description="[Admin] Проверка прав доступа")
    async def debug_me(self, interaction: discord.Interaction):
        user = interaction.user
        # Проверяем права именно в этом канале
        perms = interaction.channel.permissions_for(user)

        await interaction.response.send_message(
            f"👮 **Диагностика прав:**\n"
            f"👤 Пользователь: {user.mention}\n"
            f"🆔 ID: `{user.id}`\n"
            f"🔑 Права администратора: `{perms.administrator}`\n"
            f"🛠 Роли: {', '.join([r.name for r in user.roles if r.name != '@everyone'])}",
            ephemeral=True
        )

    @app_commands.command(name="setup_profile_panel", description="Создать панель управления профилем")
    @app_commands.checks.has_permissions(administrator=True)
    async def setup_profile_panel(self, interaction: discord.Interaction):
        # Импортируем нашу View (поправь путь импорта)
        from cogs.ui.profile_menu import ProfileManageView

        embed = discord.Embed(
            title="⚙️ Управление профилем игрока",
            description=(
                "Здесь вы можете обновить свои данные для текущего сезона.\n\n"
                "🔹 **Смена ника:** Доступна **1 раз** за сезон.\n"
                "🔹 **Смена ролей:** Доступна **2 раза** за сезон.\n\n"
            ),
            color=discord.Color.blue()
        )

        await interaction.channel.send(embed=embed, view=ProfileManageView())
        await interaction.response.send_message("✅ Панель создана!", ephemeral=True)

    @app_commands.command(name="timeout", description="[Admin] Выдать тайм-аут на произвольное время")
    @app_commands.checks.has_permissions(administrator=True)
    @app_commands.describe(
        member="Участник для тайм-аута",
        minutes="Длительность в минутах (например: 90 = 1.5 часа, 360 = 6 часов)",
        reason="Причина тайм-аута"
    )
    async def custom_timeout(self, interaction: discord.Interaction, member: discord.Member,
                             minutes: int, reason: str = None):
        if minutes < 1:
            return await interaction.response.send_message("❌ Минимальный тайм-аут — 1 минута.", ephemeral=True)

        max_minutes = 40320  # 28 days — Discord's maximum
        if minutes > max_minutes:
            return await interaction.response.send_message(
                f"❌ Максимальный тайм-аут — {max_minutes} минут (28 дней).", ephemeral=True
            )

        duration = timedelta(minutes=minutes)

        try:
            await member.timeout(duration, reason=reason)
        except discord.Forbidden:
            return await interaction.response.send_message(
                "❌ Нет прав для тайм-аута этого пользователя (проверьте иерархию ролей).", ephemeral=True
            )
        except Exception as e:
            return await interaction.response.send_message(f"❌ Ошибка: {e}", ephemeral=True)

        # Format duration for display
        days = minutes // 1440
        hours = (minutes % 1440) // 60
        mins = minutes % 60
        parts = []
        if days: parts.append(f"{days} д.")
        if hours: parts.append(f"{hours} ч.")
        if mins: parts.append(f"{mins} мин.")
        duration_str = " ".join(parts)

        reason_str = f"\n📝 Причина: {reason}" if reason else ""

        await interaction.response.send_message(
            f"🔇 {member.mention} получил тайм-аут на **{duration_str}**{reason_str}",
            ephemeral=True
        )

    @app_commands.command(name="untimeout", description="[Admin] Снять тайм-аут с пользователя")
    @app_commands.checks.has_permissions(administrator=True)
    async def remove_timeout(self, interaction: discord.Interaction, member: discord.Member):
        try:
            await member.timeout(None)
        except discord.Forbidden:
            return await interaction.response.send_message(
                "❌ Нет прав для снятия тайм-аута.", ephemeral=True
            )
        except Exception as e:
            return await interaction.response.send_message(f"❌ Ошибка: {e}", ephemeral=True)

        await interaction.response.send_message(f"🔊 Тайм-аут снят с {member.mention}.", ephemeral=True)

    @app_commands.command(name="edit_say", description="[Admin] Редактировать текст поста, созданного через /say")
    @app_commands.checks.has_permissions(administrator=True)
    @app_commands.describe(
        message_link="Ссылка на сообщение или ID сообщения (если ID — берётся текущий канал)"
    )
    async def edit_say(self, interaction: discord.Interaction, message_link: str):
        # --- 1. ПАРСИНГ ССЫЛКИ / ID ---
        # Format: https://discord.com/channels/guild_id/channel_id/message_id
        link_match = re.match(r'https?://(?:ptb\.|canary\.)?discord(?:app)?\.com/channels/(\d+)/(\d+)/(\d+)', message_link)

        if link_match:
            channel_id = int(link_match.group(2))
            message_id = int(link_match.group(3))
        elif message_link.isdigit():
            channel_id = interaction.channel.id
            message_id = int(message_link)
        else:
            return await interaction.response.send_message(
                "❌ Неверный формат. Укажите ссылку на сообщение или ID сообщения.", ephemeral=True
            )

        # --- 2. ПОЛУЧАЕМ КАНАЛ И СООБЩЕНИЕ ---
        target_channel = self.bot.get_channel(channel_id)
        if not target_channel:
            try:
                target_channel = await self.bot.fetch_channel(channel_id)
            except Exception:
                return await interaction.response.send_message("❌ Канал не найден.", ephemeral=True)

        try:
            target_msg = await target_channel.fetch_message(message_id)
        except discord.NotFound:
            return await interaction.response.send_message("❌ Сообщение не найдено.", ephemeral=True)
        except Exception as e:
            return await interaction.response.send_message(f"❌ Ошибка: {e}", ephemeral=True)

        # --- 3. ОПРЕДЕЛЯЕМ ТИП (EMBED ИЛИ PLAIN TEXT) ---
        has_embed = bool(target_msg.embeds)

        if has_embed:
            old_text = target_msg.embeds[0].description or "(пусто)"
            msg_type = "Embed"
        else:
            old_text = target_msg.content or "(пусто)"
            msg_type = "Текст"

        # --- 4. ЗАПРАШИВАЕМ НОВЫЙ ТЕКСТ ---
        await interaction.response.send_message(
            f"✍️ **Редактирование сообщения** (тип: {msg_type})\n"
            f"Текущий текст:\n```\n{old_text[:500]}\n```\n"
            f"Напишите новый текст следующим сообщением.\n*(5 минут на ввод)*",
            ephemeral=True
        )

        def check(m):
            return m.author == interaction.user and m.channel == interaction.channel

        try:
            user_msg = await self.bot.wait_for('message', check=check, timeout=300)
            raw_text = user_msg.content
            try:
                await user_msg.delete()
            except:
                pass
        except asyncio.TimeoutError:
            return await interaction.followup.send("⏰ Время вышло!", ephemeral=True)

        # --- 5. ОБРАБОТКА EMOJI ---
        def replace_emoji(match):
            name = match.group(1)
            emoji = discord.utils.get(self.bot.emojis, name=name)
            if emoji: return str(emoji)
            return match.group(0)

        pattern = r"(?<!<):([a-zA-Z0-9_]+):"
        proc_text = re.sub(pattern, replace_emoji, raw_text)

        # --- 6. РЕДАКТИРОВАНИЕ ЧЕРЕЗ WEBHOOK ---
        try:
            webhook = await get_or_create_webhook(target_channel)

            if has_embed:
                embed = target_msg.embeds[0].copy()
                embed.description = proc_text
                await webhook.edit_message(message_id, embed=embed)
            else:
                # Сохраняем пинги, если они были в начале контента
                # Находим часть с пингами (до текста пользователя)
                await webhook.edit_message(message_id, content=proc_text)

            await interaction.followup.send(
                f"✅ Сообщение отредактировано в {target_channel.mention}", ephemeral=True
            )
        except discord.NotFound:
            await interaction.followup.send(
                "❌ Не удалось отредактировать. Убедитесь, что сообщение было отправлено через бота (/say).",
                ephemeral=True
            )
        except Exception as e:
            await interaction.followup.send(f"❌ Ошибка редактирования: {e}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Admin(bot))