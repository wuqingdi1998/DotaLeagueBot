import discord
import asyncio
from discord import app_commands
from discord.ext import commands, tasks  # tasks нужен для автоматики
from discord.ui import Modal, View, Select, Button, TextInput
from sqlalchemy import select
from database.models import Player
from services.league_service import LeagueService
from services.profile_service import ProfileService
from datetime import datetime, timedelta, timezone


class TierModalInternal(Modal):
    rating_input = TextInput(
        label="Новый тир (4-10)",
        placeholder="0 = авто-ранк (сброс)",
        min_length=1,
        max_length=2
    )

    def __init__(self, bot, parent_view, player_discord_id, player_name):
        super().__init__(title=f"Edit: {player_name}")
        self.bot = bot
        self.parent_view = parent_view
        self.player_discord_id = player_discord_id

    async def on_submit(self, interaction: discord.Interaction):
        try:
            val = int(self.rating_input.value)
            if val < 0 or val > 10:
                await interaction.response.send_message("❌ Ошибка: Тир должен быть от **1 до 10** (или 0 для сброса).",ephemeral=True)
                return
            # Сохраняем в БД
            async with self.bot.session_maker() as session:
                service = LeagueService(session)
                # Вызываем метод обновления (убедись, что добавил его в Service)
                await service.update_player_internal_rating(self.player_discord_id, val)

            await interaction.response.send_message(f"✅ Рейтинг изменен на **{val}**. Нажми кнопку 'Обновить'.",
                                                    ephemeral=True)

        except ValueError:
            await interaction.response.send_message("❌ Ошибка: нужно ввести число.", ephemeral=True)


class TierAdjustmentViewWrapper(View):
    def __init__(self, bot, registrations):
        super().__init__(timeout=600)
        self.bot = bot
        self.registrations = registrations
        # Сортируем сразу при инициализации
        self.registrations.sort(key=lambda x: x[1].ingame_name.lower())

        self.page = 0  # Текущая страница
        self.items_per_page = 10  # Лимит дискорда
        self.update_components()

    def _get_display_tier(self, player):
        """Вспомогательный метод для получения отображаемого тира"""
        if player.internal_rating and player.internal_rating > 0:
            return player.internal_rating, True  # True означает "ручной"

        # Если ручного нет, берем автоматический (первую цифру)
        raw = player.rank_tier or 0
        # Если число >= 10 (например 72), берем 7. Если меньше (например 0), оставляем как есть.
        val = raw // 10 if raw >= 10 else raw
        return val, False  # False означает "авто"

    def update_components(self):
        self.clear_items()

        # 1. Вычисляем срез для текущей страницы
        start = self.page * self.items_per_page
        end = start + self.items_per_page
        current_batch = self.registrations[start:end]

        # Всего страниц
        total_pages = (len(self.registrations) - 1) // self.items_per_page + 1

        # 2. Формируем опции для Select
        options = []
        for reg, player in current_batch:
            val, is_manual = self._get_display_tier(player)
            if is_manual:
                desc = f"🛠️ Manual: {val}"
                emoji = "🛠️"
            else:
                desc = f"🤖 Auto: {val}"
                emoji = "🤖"

            label = f"{player.ingame_name}"
            options.append(
                discord.SelectOption(label=label, description=desc, value=str(player.discord_id), emoji=emoji))

        # 3. Добавляем Select (если есть игроки)
        if options:
            select_menu = Select(
                placeholder=f"Игроки {start + 1}-{start + len(options)} (Всего: {len(self.registrations)})",
                options=options,
                row=0
            )
            select_menu.callback = self.select_callback
            self.add_item(select_menu)

        # 4. КНОПКИ УПРАВЛЕНИЯ (Row 1)

        # Кнопка НАЗАД
        btn_prev = Button(label="⬅️", style=discord.ButtonStyle.secondary, row=1, disabled=(self.page == 0))
        btn_prev.callback = self.prev_page
        self.add_item(btn_prev)

        # Кнопка ОБНОВИТЬ (показывает текущую страницу)
        btn_refresh = Button(label=f"🔄 Стр {self.page + 1}/{total_pages}", style=discord.ButtonStyle.primary, row=1)
        btn_refresh.callback = self.refresh_btn
        self.add_item(btn_refresh)

        # Кнопка ВПЕРЕД
        # Активна, только если есть следующая страница
        btn_next = Button(label="➡️", style=discord.ButtonStyle.secondary, row=1,
                          disabled=(end >= len(self.registrations)))
        btn_next.callback = self.next_page
        self.add_item(btn_next)

    async def select_callback(self, interaction: discord.Interaction):
        selected_id = int(interaction.data['values'][0])

        # Ищем имя (нужно искать во всем списке, а не только на странице, хотя id уникален)
        p_name = "Unknown"
        for reg, p in self.registrations:
            if p.discord_id == selected_id:
                p_name = p.ingame_name
                break

        await interaction.response.send_modal(TierModalInternal(self.bot, self, selected_id, p_name))

    async def prev_page(self, interaction: discord.Interaction):
        if self.page > 0:
            self.page -= 1
            self.update_components()
            await interaction.response.edit_message(view=self)
        else:
            await interaction.response.defer()

    async def next_page(self, interaction: discord.Interaction):
        # Проверка границ
        if (self.page + 1) * self.items_per_page < len(self.registrations):
            self.page += 1
            self.update_components()
            await interaction.response.edit_message(view=self)
        else:
            await interaction.response.defer()

    async def refresh_btn(self, interaction: discord.Interaction):
        await interaction.response.defer()

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            week, registrations = await service.get_active_registrations()

        self.registrations = registrations
        self.registrations.sort(key=lambda x: x[1].ingame_name.lower())

        # Если после обновления игроков стало меньше и текущая страница исчезла
        if self.page * self.items_per_page >= len(self.registrations):
            self.page = 0

        self.update_components()

        embed = self.build_embed()
        await interaction.edit_original_response(embed=embed, view=self)

    def build_embed(self):
        lines = []
        for reg, p in self.registrations:
            val, is_manual = self._get_display_tier(p)
            icon = "🛠️" if is_manual else "🤖"
            lines.append(f"`{val:>2}` {icon} | **{p.ingame_name}**")

        full_text = "\n".join(lines)
        if len(full_text) > 4000:
            full_text = full_text[:3900] + "\n... (список слишком длинный)"

        desc = "**Настройка баланса**\n🛠️ = Ручной рейтинг\n🤖 = Ранг из Доты\n\n" + full_text
        return discord.Embed(title="🔧 Корректировка Тиров", description=desc, color=discord.Color.orange())

# --- КНОПКИ ДЛЯ ЛИЧКИ (CHECK-IN) ---
class DMCheckinView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot

    @discord.ui.button(label="✅ Я буду играть", style=discord.ButtonStyle.success)
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            # Ставим галочку is_checked_in = True
            success, msg = await service.process_checkin(interaction.user.id)

        if success:
            # Отключаем кнопки
            for child in self.children:
                child.disabled = True
            await interaction.edit_original_response(
                content="✅ **Отлично! Твое участие подтверждено.**\nОжидай анонса команд в канале Discord.", view=self)
        else:
            await interaction.followup.send(f"⚠️ {msg}", ephemeral=True)

    @discord.ui.button(label="❌ Не смогу", style=discord.ButtonStyle.danger)
    async def decline(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            # Удаляем регистрацию
            success, msg = await service.remove_registration(interaction.user.id)

        for child in self.children:
            child.disabled = True

        await interaction.edit_original_response(content="👌 **Понял, снял твою заявку.**\nЖдем тебя в следующий раз!",
                                                 view=self)


# --- КНОПКА РЕГИСТРАЦИИ (В КАНАЛЕ) ---
class RegistrationView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot

    @discord.ui.button(label="Участвовать", style=discord.ButtonStyle.green, emoji="✅", custom_id="join_league_btn")
    async def join_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            profile_service = ProfileService(session)
            league_service = LeagueService(session)  # Создаем сервис сразу

            # 1. Проверяем наличие профиля
            player = await profile_service.get_player(interaction.user.id)
            if not player or not player.rank_tier:
                await interaction.followup.send("❌ Сначала создай профиль: `/profile me`", ephemeral=True)
                return

            # 2. ПРОВЕРЯЕМ, НЕ ЗАРЕГИСТРИРОВАН ЛИ УЖЕ (для всех: и титанов, и обычных)
            if await league_service.is_registered(interaction.user.id):
                await interaction.followup.send("✅ Ты уже зарегистрирован в этом лобби!", ephemeral=True)
                return

            # 3. Если Титан (сюда дойдет только если не зарегистрирован)
            if player.rank_tier >= 80:
                try:
                    await interaction.user.send(
                        "👋 Привет! Ты регистрируешься как **Titan (Immortal)**.\n"
                        "Отправь мне сюда (в ЛС) **скриншот твоего MMR**, чтобы завершить регистрацию."
                    )
                    await interaction.followup.send("📩 Инструкция отправлена в ЛС.", ephemeral=True)
                except discord.Forbidden:
                    await interaction.followup.send("❌ Открой личку, чтобы я мог принять скриншот!", ephemeral=True)
                return

            # 4. Если обычный игрок (регистрируем)
            # Тут метод register_player тоже сделает проверку, но мы её уже прошли выше, так что всё ок.
            success, message = await league_service.register_player(user_id=interaction.user.id)

        if success:
            await interaction.followup.send(f"✅ {message}", ephemeral=True)
        else:
            await interaction.followup.send(f"❌ {message}", ephemeral=True)


# --- ОСНОВНОЙ КОГ ---
class League(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.bot.add_view(RegistrationView(bot))
        # Кэш, чтобы не отправлять чек-ин дважды для одной и той же недели
        self.checkin_sent_weeks = set()
        # Запускаем фоновую задачу
        self.check_upcoming_games.start()

    def cog_unload(self):
        self.check_upcoming_games.cancel()

    # --- ФОНОВАЯ ЗАДАЧА: АВТО-ЧЕКИН ---
    @tasks.loop(minutes=1)
    async def check_upcoming_games(self):
        """Проверяет каждую минуту, не пора ли делать чек-ин (за 1 час до старта)"""
        try:
            async with self.bot.session_maker() as session:
                service = LeagueService(session)
                week, registrations = await service.get_active_registrations()

                if not week or not registrations:
                    return

                # Если для этой недели уже рассылали - пропускаем
                if week.id in self.checkin_sent_weeks:
                    return

                # Время сейчас (UTC)
                now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
                # Время старта (UTC из базы)
                start_utc = week.start_time

                # Если старт в будущем
                if start_utc > now_utc:
                    diff = start_utc - now_utc
                    # Если осталось меньше или равно 60 минут (и больше 0)
                    if timedelta(minutes=0) < diff <= timedelta(minutes=60):
                        print(f"[AUTO-CHECKIN] Запускаю рассылку для недели #{week.week_number}")
                        await self.send_checkin_dms(registrations, week.week_number)
                        self.checkin_sent_weeks.add(week.id)

        except Exception as e:
            print(f"[ERROR] Auto-checkin task failed: {e}")

    # --- ФУНКЦИЯ РАССЫЛКИ ---
    async def send_checkin_dms(self, registrations, week_num):
        embed = discord.Embed(
            title="⚠️ Check-In: Подтверждение участия",
            description=(
                f"Игры лиги (Неделя #{week_num}) начнутся менее чем через час.\n"
                "**Ты готов играть?**\n\n"
                "Нажми **✅ Я буду играть**, чтобы подтвердить.\n"
                "Если нажмешь **❌**, я уберу тебя из списка."
            ),
            color=discord.Color.gold()
        )

        for reg, player in registrations:
            # Если уже подтвердил - не трогаем
            if reg.is_checked_in:
                continue

            try:
                user = self.bot.get_user(player.discord_id) or await self.bot.fetch_user(player.discord_id)
                view = DMCheckinView(self.bot)
                await user.send(embed=embed, view=view)
                await asyncio.sleep(0.2)  # Анти-спам задержка
            except Exception as e:
                print(f"Не удалось отправить чек-ин игроку {player.ingame_name}: {e}")

    # --- СЛУШАТЕЛЬ СКРИНШОТОВ ---
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot: return
        if not isinstance(message.channel, discord.DMChannel): return
        if not message.attachments: return

        attachment = message.attachments[0]
        if not attachment.content_type or not attachment.content_type.startswith('image/'):
            return

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            # Пробуем зарегистрировать со скриншотом
            success, response_text = await service.register_player(
                user_id=message.author.id,
                screenshot_url=attachment.url
            )

        if success:
            await message.channel.send(f"✅ {response_text}")
        else:
            # Если игрок не подавал заявку, сервис вернет ошибку,
            # но чтобы не спамить на каждую картинку в ЛС, можно отвечать только если ошибка специфичная
            if "заявку" in response_text or "Титан" in response_text:
                await message.channel.send(f"❌ {response_text}")

    # --- КОМАНДЫ ---
    league_group = app_commands.Group(name="league", description="Управление лигой")


    @league_group.command(name="open", description="Открыть регистрацию (время по МСК)")
    @app_commands.checks.has_role("Admin")
    @app_commands.describe(
        day_month="Дата старта (формат: 07.02)",
        time="Время старта по МСК (формат: 19:00)",
        season="Номер сезона"
    )
    async def open_registration(self, interaction: discord.Interaction, day_month: str, time: str, season: int = 1):
        await interaction.response.defer()
        try:
            current_year = datetime.now().year
            dt_naive = datetime.strptime(f"{day_month}.{current_year} {time}", "%d.%m.%Y %H:%M")

            msk_zone = timezone(timedelta(hours=3))
            start_datetime_msk = dt_naive.replace(tzinfo=msk_zone)

            start_datetime_utc = start_datetime_msk.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            await interaction.followup.send("❌ Формат: `/league open 07.02 19:00`", ephemeral=True)
            return

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            week_id, week_num = await service.create_new_week(start_time=start_datetime_utc, season=season)
            if week_id in self.checkin_sent_weeks:
                self.checkin_sent_weeks.remove(week_id)

        time_str_msk = start_datetime_msk.strftime("%d.%m.%Y %H:%M")

        timestamp = int(start_datetime_msk.timestamp())

        view = RegistrationView(self.bot)

        embed = discord.Embed(
            title=f"🏆 Лига Dota 2 - Неделя #{week_num}",
            description=(
                f"📅 **Старт игр:** {time_str_msk} (МСК)\n" 
                f"⏳ **До старта:** <t:{timestamp}:R>\n\n"
                "⏳ **Чек-ин:** Автоматически в ЛС за 1 час до начала.\n\n"
                "**Жми кнопку ниже, чтобы записаться!**"
            ),
            color=discord.Color.gold()
        )
        await interaction.followup.send(embed=embed, view=view)

    @league_group.command(name="adjust_tiers", description="[ADMIN] Изменить рейтинг игроков вручную")
    @app_commands.checks.has_role("Admin")
    async def adjust_tiers(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            # Получаем список зарегистрированных на текущую неделю
            week, registrations = await service.get_active_registrations()

        if not registrations:
            return await interaction.followup.send("❌ Нет активных регистраций.", ephemeral=True)

        view = TierAdjustmentViewWrapper(self.bot, registrations)
        embed = view.build_embed()

        await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    @league_group.command(name="status", description="Статус регистрации и чек-ина")
    @app_commands.checks.has_role("Admin")
    async def league_status(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            week, registrations = await service.get_active_registrations()

        if not week or not registrations:
            await interaction.followup.send("ℹ️ Нет активных участников.", ephemeral=True)
            return

        # Сортировка: Сначала подтвержденные
        registrations.sort(key=lambda x: x[0].is_checked_in, reverse=True)

        checked_cnt = sum(1 for r, p in registrations if r.is_checked_in)

        lines = []
        for reg, player in registrations:
            status = "✅" if reg.is_checked_in else "💤"
            mmr = f"**{reg.mmr_snapshot}**"

            link = player.ingame_name
            if player.steam_id32:
                link = f"[{player.ingame_name}](https://www.stratz.com/players/{player.steam_id32})"

            evd = f" [📸]({reg.screenshot_url})" if reg.screenshot_url else ""

            lines.append(f"{status} {mmr} | {link} (<@{player.discord_id}>){evd}")

        desc = (
                f"**Всего заявок:** {len(registrations)}\n"
                f"**Подтвердили (Ready):** {checked_cnt}\n\n"
                + "\n".join(lines)
        )
        embed = discord.Embed(title=f"📊 Статус Недели #{week.week_number}", description=desc,
                              color=discord.Color.blue())
        await interaction.followup.send(embed=embed, ephemeral=True)

    @league_group.command(name="delete_last", description="Удалить неделю")
    @app_commands.checks.has_role("Admin")
    async def league_delete(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.delete_last_week()
        await interaction.followup.send(msg, ephemeral=True)

    @league_group.command(name="kick", description="Кикнуть игрока")
    @app_commands.checks.has_role("Admin")
    async def league_kick(self, interaction: discord.Interaction, user: discord.User):
        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.remove_registration(user.id)
        if success:
            await interaction.response.send_message(f"✅ {user.name} удален.", ephemeral=True)
        else:
            await interaction.response.send_message(f"❌ {msg}", ephemeral=True)

    async def cog_app_command_error(self, interaction: discord.Interaction, error):
        msg = f"❌ Ошибка: {error}"
        if isinstance(error, app_commands.MissingRole): msg = "❌ Нужны права Admin!"
        if interaction.response.is_done():
            await interaction.followup.send(msg, ephemeral=True)
        else:
            await interaction.response.send_message(msg, ephemeral=True)


async def setup(bot):
    await bot.add_cog(League(bot))