import discord
from discord import app_commands
from discord.ext import commands
import io
import re
import asyncio
from datetime import timedelta


WEBHOOK_NAME = "LS Bot"

DISCORD_CONTENT_LIMIT = 2000
DISCORD_EMBED_DESC_LIMIT = 4096
DISCORD_EMBED_TITLE_LIMIT = 256
BRAND_EMBED_COLOR = 0x00C3FF


# --- HELPER: Get or create persistent webhook ---
async def get_or_create_webhook(channel: discord.TextChannel) -> discord.Webhook:
    """Find an existing persistent webhook or create one."""
    webhooks = await channel.webhooks()
    for wh in webhooks:
        if wh.name == WEBHOOK_NAME:
            return wh
    return await channel.create_webhook(name=WEBHOOK_NAME)


def split_for_discord(text: str, limit: int = DISCORD_CONTENT_LIMIT) -> list[str]:
    """Split text into <= limit-char chunks, preferring line breaks, then spaces."""
    if not text:
        return []
    if len(text) <= limit:
        return [text]

    chunks: list[str] = []
    remaining = text
    while len(remaining) > limit:
        window = remaining[:limit]
        cut = window.rfind("\n")
        if cut <= 0:
            cut = window.rfind(" ")
        if cut <= 0:
            cut = limit
        chunk = remaining[:cut].rstrip()
        if chunk:
            chunks.append(chunk)
        remaining = remaining[cut:].lstrip("\n").lstrip(" ")

    tail = remaining.rstrip()
    if tail:
        chunks.append(tail)
    return chunks


def build_messages(prefix: str, body: str, limit: int = DISCORD_CONTENT_LIMIT) -> list[str]:
    """Build a list of Discord-sized messages: `prefix` is prepended to the first only."""
    prefix = prefix or ""
    body = body or ""
    sep = "\n" if prefix and body else ""
    first_budget = limit - len(prefix) - len(sep)

    if not body:
        head = prefix.rstrip()
        return [head] if head else []

    if first_budget < 1:
        # Prefix alone already at/over the limit — emit it separately.
        head = prefix.rstrip()
        rest = split_for_discord(body, limit)
        return ([head] if head else []) + rest

    if len(body) <= first_budget:
        head = (prefix + sep + body).rstrip()
        return [head] if head else []

    window = body[:first_budget]
    cut = window.rfind("\n")
    if cut <= 0:
        cut = window.rfind(" ")
    if cut <= 0:
        cut = first_budget
    first_body = body[:cut].rstrip()
    remaining = body[cut:].lstrip()

    head = (prefix + sep + first_body).rstrip()
    rest = split_for_discord(remaining, limit) if remaining else []
    return ([head] if head else []) + rest


def build_announcement_embed(title: str | None, description: str) -> discord.Embed:
    """Create an announcement embed in the Linken's Sphere brand color."""
    return discord.Embed(
        title=title,
        description=description,
        color=BRAND_EMBED_COLOR,
    )


# --- 1. CONFIRMATION VIEW CLASS ---
class ConfirmSendView(discord.ui.View):
    def __init__(self, channel, username, avatar_url, mentions, proc_text, embed, files_data):
        super().__init__(timeout=300)  # Button active for 5 minutes
        self.channel = channel
        self.username = username
        self.avatar_url = avatar_url
        self.mentions = mentions or ""
        self.proc_text = proc_text or ""
        self.embed = embed
        self.files_data = files_data  # List of tuples [(filename, bytes)]

    def _build_files(self):
        files = []
        for f_name, f_bytes in self.files_data:
            files.append(discord.File(io.BytesIO(f_bytes), filename=f_name))
        return files

    @discord.ui.button(label="Отправить в канал", style=discord.ButtonStyle.green, emoji="🚀")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        # Defer immediately to avoid interaction timeout
        await interaction.response.defer(ephemeral=True)

        try:
            webhook = await get_or_create_webhook(self.channel)

            if self.embed:
                files = self._build_files()
                if files:
                    self.embed.set_image(url=f"attachment://{self.files_data[0][0]}")
                first_msg = await webhook.send(
                    content=self.mentions or None,
                    embed=self.embed,
                    files=files,
                    username=self.username,
                    avatar_url=self.avatar_url,
                    allowed_mentions=discord.AllowedMentions.all(),
                    wait=True,
                )
            else:
                messages = build_messages(self.mentions, self.proc_text, DISCORD_CONTENT_LIMIT)
                if not messages:
                    # No text, but there may still be an image-only post to send.
                    if self.files_data:
                        first_msg = await webhook.send(
                            content=self.mentions or None,
                            files=self._build_files(),
                            username=self.username,
                            avatar_url=self.avatar_url,
                            allowed_mentions=discord.AllowedMentions.all(),
                            wait=True,
                        )
                        self.stop()
                        await interaction.followup.send(
                            f"✅ Успешно опубликовано в {self.channel.mention}\n"
                            f"🔗 ID сообщения: `{first_msg.id}`",
                            ephemeral=True
                        )
                        return
                    await interaction.followup.send("❌ Пустое сообщение.", ephemeral=True)
                    return

                first_msg = None
                last_idx = len(messages) - 1
                for i, content in enumerate(messages):
                    files = self._build_files() if i == last_idx else []
                    allowed = (
                        discord.AllowedMentions.all() if i == 0
                        else discord.AllowedMentions.none()
                    )
                    sent = await webhook.send(
                        content=content,
                        files=files,
                        username=self.username,
                        avatar_url=self.avatar_url,
                        allowed_mentions=allowed,
                        wait=True,
                    )
                    if i == 0:
                        first_msg = sent

            self.stop()

            await interaction.followup.send(
                f"✅ Успешно опубликовано в {self.channel.mention}\n"
                f"🔗 ID сообщения: `{first_msg.id}`",
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
        await self._say_impl(
            interaction=interaction,
            channel=channel,
            title=title,
            image=image,
            ping_role=ping_role,
            ping_everyone=ping_everyone,
            username=username,
            avatar_url=avatar_url,
        )

    async def _say_impl(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        title: str = None,
        image: discord.Attachment = None,
        ping_role: discord.Role = None,
        ping_everyone: bool = False,
        username: str = "Linken's Sphere Esports",
        avatar_url: str = None,
        force_embed: bool = False,
    ):

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

            # Capture content and any attachments from the follow-up message.
            # This lets an admin post an image with no caption (image-only).
            raw_text = user_msg.content
            followup_files = []
            for att in user_msg.attachments:
                try:
                    followup_files.append((att.filename, await att.read()))
                except Exception:
                    pass  # Skip attachments we can't read

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
            mentions = mentions.rstrip()

            # --- CONTENT ASSEMBLY ---
            final_embed = None
            files_to_save = []
            preview_files = []

            # Handle Image (from the slash option)
            if image:
                img_data = await image.read()
                files_to_save.append((image.filename, img_data))
                preview_files.append(discord.File(io.BytesIO(img_data), filename=image.filename))

            # Handle images attached to the follow-up message (image-only support)
            for f_name, f_bytes in followup_files:
                files_to_save.append((f_name, f_bytes))
                preview_files.append(discord.File(io.BytesIO(f_bytes), filename=f_name))

            # Handle Embed vs Plain Text
            if force_embed or title:
                if len(proc_title) > DISCORD_EMBED_TITLE_LIMIT:
                    return await interaction.followup.send(
                        f"❌ Заголовок слишком длинный: {len(proc_title)} симв. "
                        f"(максимум {DISCORD_EMBED_TITLE_LIMIT}). Сократите его.",
                        ephemeral=True
                    )
                if len(proc_text) > DISCORD_EMBED_DESC_LIMIT:
                    return await interaction.followup.send(
                        f"❌ Текст слишком длинный для embed: {len(proc_text)} симв. "
                        f"(максимум {DISCORD_EMBED_DESC_LIMIT}). Сократите его или "
                        f"уберите параметр `title`, чтобы отправить обычным текстом "
                        f"(будет разбит на несколько сообщений).",
                        ephemeral=True
                    )
                final_embed = build_announcement_embed(proc_title or None, proc_text)
                if files_to_save:
                    final_embed.set_image(url=f"attachment://{files_to_save[0][0]}")

            # Validation: Ensure we are not sending an empty message
            has_body = bool(proc_text) or bool(final_embed) or bool(files_to_save) or bool(mentions)
            if not has_body:
                return await interaction.followup.send("❌ Вы прислали пустое сообщение!", ephemeral=True)

            # --- PREVIEW GENERATION ---
            current_avatar = avatar_url or self.bot.user.display_avatar.url

            confirm_view = ConfirmSendView(
                channel=channel,
                username=username,
                avatar_url=current_avatar,
                mentions=mentions,
                proc_text="" if final_embed else proc_text,
                embed=final_embed,
                files_data=files_to_save
            )

            preview_header = f"**ПРЕВЬЮ ДЛЯ КАНАЛА {channel.mention}:**"

            if final_embed:
                await interaction.followup.send(
                    content=(preview_header + ("\n" + mentions if mentions else "")) or None,
                    embed=final_embed,
                    view=confirm_view,
                    files=preview_files,
                    ephemeral=True,
                    allowed_mentions=discord.AllowedMentions.none(),
                )
            else:
                preview_msgs = build_messages(mentions, proc_text, DISCORD_CONTENT_LIMIT)
                if not preview_msgs:
                    preview_msgs = [""]

                # Send header + first preview chunk
                first_combined = preview_header + "\n" + preview_msgs[0] if preview_msgs[0] else preview_header
                if len(first_combined) > DISCORD_CONTENT_LIMIT:
                    await interaction.followup.send(
                        content=preview_header,
                        ephemeral=True,
                        allowed_mentions=discord.AllowedMentions.none(),
                    )
                    for chunk in preview_msgs:
                        await interaction.followup.send(
                            content=chunk,
                            ephemeral=True,
                            allowed_mentions=discord.AllowedMentions.none(),
                        )
                else:
                    await interaction.followup.send(
                        content=first_combined,
                        ephemeral=True,
                        allowed_mentions=discord.AllowedMentions.none(),
                    )
                    for chunk in preview_msgs[1:]:
                        await interaction.followup.send(
                            content=chunk,
                            ephemeral=True,
                            allowed_mentions=discord.AllowedMentions.none(),
                        )

                # Final ephemeral message with the publish button + preview image
                await interaction.followup.send(
                    content="✅ Готов к публикации? Нажмите кнопку ниже.",
                    view=confirm_view,
                    files=preview_files,
                    ephemeral=True,
                    allowed_mentions=discord.AllowedMentions.none(),
                )

        except Exception as e:
            await interaction.followup.send(f"❌ System Error: {e}", ephemeral=True)

    @app_commands.command(
        name="say_embed",
        description="[Admin] Создать объявление в голубой embed-плашке",
    )
    @app_commands.describe(
        channel="Канал для публикации",
        title="Заголовок плашки",
        image="Изображение внизу плашки",
        ping_role="Роль для упоминания",
        ping_everyone="Упомянуть @everyone",
        username="Имя отправителя",
        avatar_url="Ссылка на аватар отправителя",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def say_embed(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        title: str = None,
        image: discord.Attachment = None,
        ping_role: discord.Role = None,
        ping_everyone: bool = False,
        username: str = "Linken's Sphere Esports",
        avatar_url: str = None,
    ):
        """Publish an announcement through the existing preview/confirm flow."""
        await self._say_impl(
            interaction=interaction,
            channel=channel,
            title=title,
            image=image,
            ping_role=ping_role,
            ping_everyone=ping_everyone,
            username=username,
            avatar_url=avatar_url,
            force_embed=True,
        )

    @app_commands.command(name="poll", description="[Admin] Создать опрос (голосование) в канале")
    @app_commands.describe(
        channel="Канал для опроса",
        question="Вопрос опроса",
        options="Варианты ответа через точку с запятой ';' (от 2 до 10)",
        duration_hours="Длительность в часах (1–768, по умолчанию 24)",
        multiple="Разрешить выбор нескольких вариантов",
        ping_role="Роль для пинга",
        ping_everyone="Пинг @everyone",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def poll(self, interaction: discord.Interaction,
                   channel: discord.TextChannel,
                   question: str,
                   options: str,
                   duration_hours: int = 24,
                   multiple: bool = False,
                   ping_role: discord.Role = None,
                   ping_everyone: bool = False):

        # --- ВАЛИДАЦИЯ ---
        question = question.strip()
        if not question:
            return await interaction.response.send_message("❌ Вопрос не может быть пустым.", ephemeral=True)
        if len(question) > 300:
            return await interaction.response.send_message(
                f"❌ Вопрос слишком длинный: {len(question)} симв. (максимум 300).", ephemeral=True
            )

        answers = [opt.strip() for opt in options.split(";") if opt.strip()]
        if len(answers) < 2:
            return await interaction.response.send_message(
                "❌ Нужно минимум 2 варианта ответа (разделяйте через `;`).", ephemeral=True
            )
        if len(answers) > 10:
            return await interaction.response.send_message(
                "❌ Максимум 10 вариантов ответа.", ephemeral=True
            )
        too_long = [a for a in answers if len(a) > 55]
        if too_long:
            return await interaction.response.send_message(
                f"❌ Вариант ответа слишком длинный (максимум 55 симв.): `{too_long[0][:60]}`", ephemeral=True
            )

        if not (1 <= duration_hours <= 768):
            return await interaction.response.send_message(
                "❌ Длительность должна быть от 1 до 768 часов (32 дня).", ephemeral=True
            )

        # --- СБОРКА ОПРОСА ---
        try:
            poll = discord.Poll(
                question=question,
                duration=timedelta(hours=duration_hours),
                multiple=multiple,
            )
            for ans in answers:
                poll.add_answer(text=ans)
        except Exception as e:
            return await interaction.response.send_message(f"❌ Ошибка создания опроса: {e}", ephemeral=True)

        # --- ПИНГИ ---
        mentions = ""
        if ping_everyone:
            mentions += "@everyone "
        if ping_role:
            mentions += f"{ping_role.mention} "
        mentions = mentions.rstrip()

        # --- ОТПРАВКА ---
        try:
            sent = await channel.send(
                content=mentions or None,
                poll=poll,
                allowed_mentions=discord.AllowedMentions.all(),
            )
        except discord.Forbidden:
            return await interaction.response.send_message(
                f"❌ Нет прав отправлять сообщения/опросы в {channel.mention}.", ephemeral=True
            )
        except Exception as e:
            return await interaction.response.send_message(f"❌ Ошибка отправки опроса: {e}", ephemeral=True)

        await interaction.response.send_message(
            f"✅ Опрос опубликован в {channel.mention}\n🔗 ID сообщения: `{sent.id}`",
            ephemeral=True
        )

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

        # --- 6. ВАЛИДАЦИЯ ДЛИНЫ ---
        if has_embed and len(proc_text) > DISCORD_EMBED_DESC_LIMIT:
            return await interaction.followup.send(
                f"❌ Текст слишком длинный для embed: {len(proc_text)} симв. "
                f"(максимум {DISCORD_EMBED_DESC_LIMIT}). Сократите его.",
                ephemeral=True
            )
        if not has_embed and len(proc_text) > DISCORD_CONTENT_LIMIT:
            return await interaction.followup.send(
                f"❌ Текст слишком длинный: {len(proc_text)} симв. "
                f"(максимум {DISCORD_CONTENT_LIMIT}). Редактирование не поддерживает "
                f"разбивку на несколько сообщений — сократите текст.",
                ephemeral=True
            )

        # --- 7. РЕДАКТИРОВАНИЕ ЧЕРЕЗ WEBHOOK ---
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
