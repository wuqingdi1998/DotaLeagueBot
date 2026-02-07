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
    def __init__(self, bot, view, player_discord_id, player_name):
        super().__init__(title=f"Edit: {player_name}")
        self.bot = bot
        self.view = view  # Ссылка на родительское View (меню)
        self.player_discord_id = player_discord_id

        # Поле ввода
        self.rating_input = TextInput(
            label="Новый тир (1-10)",
            placeholder="0 = сброс (авто)",
            min_length=1,
            max_length=2,
            required=True
        )
        self.add_item(self.rating_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            val = int(self.rating_input.value)
            if not 0 <= val <= 10:
                return await interaction.response.send_message("❌ Число от 0 до 10!", ephemeral=True)

            # 1. Сохраняем в БД
            async with self.bot.session_maker() as session:
                service = LeagueService(session)
                await service.update_player_internal_rating(self.player_discord_id, val)

            # 2. ОБНОВЛЯЕМ ПАМЯТЬ VIEW (чтобы цифра сменилась мгновенно)
            # Ищем игрока в списке, который хранится в View, и меняем ему рейтинг
            for reg, p in self.view.registrations:
                if p.discord_id == self.player_discord_id:
                    p.internal_rating = val
                    break

            # 3. Перестраиваем вид (кнопки, текст)
            self.view.update_components()
            new_embed = self.view.build_embed()

            # 4. ГЛАВНОЕ: Ответ на модалку — это редактирование исходного сообщения!
            await interaction.response.edit_message(embed=new_embed, view=self.view)

        except ValueError:
            await interaction.response.send_message("❌ Это не число.", ephemeral=True)
        except Exception as e:
            print(f"Error in modal: {e}")
            await interaction.response.send_message("❌ Ошибка при обновлении.", ephemeral=True)


# --- 2. КЛАСС VIEW (МЕНЮ) ---
class TierAdjustmentViewWrapper(View):
    def __init__(self, bot, registrations):
        super().__init__(timeout=600)
        self.bot = bot
        self.registrations = registrations
        # Сортировка по имени
        self.registrations.sort(key=lambda x: x[1].ingame_name.lower())

        self.page = 0
        self.items_per_page = 10
        self.update_components()

    def _get_display_tier(self, player):
        # Логика отображения: если есть ручной рейтинг > 0, берем его
        if player.internal_rating and player.internal_rating > 0:
            return player.internal_rating, True

            # Иначе берем авто-ранк
        raw = player.rank_tier or 0
        val = raw // 10 if raw >= 10 else raw
        return val, False

    def update_components(self):
        self.clear_items()  # Очищаем старые кнопки

        # Пагинация
        start = self.page * self.items_per_page
        end = start + self.items_per_page
        current_batch = self.registrations[start:end]
        total_pages = (len(self.registrations) - 1) // self.items_per_page + 1

        # Формируем список (Select)
        options = []
        for reg, player in current_batch:
            val, is_manual = self._get_display_tier(player)

            emoji = "🛠️" if is_manual else "🤖"
            desc = f"{'Manual' if is_manual else 'Auto'}: {val}"

            if reg.screenshot_url:
                desc += " | 📸 Screen"
            elif player.rank_tier and player.rank_tier >= 80:
                desc += " | ⚠️ NO SCREEN"

            options.append(discord.SelectOption(
                label=player.ingame_name,
                description=desc,
                value=str(player.discord_id),
                emoji=emoji
            ))

        if options:
            select = Select(
                placeholder=f"Выберите игрока (Стр {self.page + 1})",
                options=options,
                row=0
            )
            select.callback = self.select_callback
            self.add_item(select)

        # Кнопки навигации
        self.add_item(Button(label="⬅️", style=discord.ButtonStyle.secondary, row=1, disabled=(self.page == 0),
                             custom_id="prev_btn"))
        self.children[-1].callback = self.prev_page  # Привязываем коллбек к последней добавленной кнопке

        self.add_item(Button(label="🔄 Обновить", style=discord.ButtonStyle.primary, row=1, custom_id="refresh_btn"))
        self.children[-1].callback = self.refresh_btn

        self.add_item(
            Button(label="➡️", style=discord.ButtonStyle.secondary, row=1, disabled=(end >= len(self.registrations)),
                   custom_id="next_btn"))
        self.children[-1].callback = self.next_page

    async def select_callback(self, interaction: discord.Interaction):
        # Получаем ID выбранного игрока
        selected_id = int(interaction.data['values'][0])

        # Ищем имя (чисто для заголовка модалки)
        p_name = "Player"
        for reg, p in self.registrations:
            if p.discord_id == selected_id:
                p_name = p.ingame_name
                break

        # Открываем модалку, передавая 'self' (этот View) внутрь
        modal = TierModalInternal(self.bot, self, selected_id, p_name)
        await interaction.response.send_modal(modal)

    async def prev_page(self, interaction: discord.Interaction):
        self.page -= 1
        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def next_page(self, interaction: discord.Interaction):
        self.page += 1
        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def refresh_btn(self, interaction: discord.Interaction):
        # Полная перезагрузка из БД
        await interaction.response.defer()
        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            _, registrations = await service.get_active_registrations()

        self.registrations = registrations
        self.registrations.sort(key=lambda x: x[1].ingame_name.lower())
        self.update_components()
        await interaction.edit_original_response(embed=self.build_embed(), view=self)

    def build_embed(self):
        start = self.page * self.items_per_page
        end = start + self.items_per_page

        lines = []
        for reg, p in self.registrations[start:end]:
            val, is_manual = self._get_display_tier(p)
            icon = "🛠️" if is_manual else "🤖"
            line = f"`{val:>2}` {icon} | **{p.ingame_name}**"
            if reg.screenshot_url:
                line += f" [📸]({reg.screenshot_url})"
            elif p.rank_tier and p.rank_tier >= 80:
                line += " ⚠️"
            lines.append(line)

        desc = "**Список игроков**\n" + ("\n".join(lines) if lines else "Пусто")
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




def simple_balance(players):
    sorted_p = sorted(players, key=lambda x: x.internal_rating if x.internal_rating else (x.rank_tier or 0) // 10,
                      reverse=True)

    t1 = []
    t2 = []

    for i, p in enumerate(sorted_p):
        if i % 4 == 0 or i % 4 == 3:
            t1.append(p)
        else:
            t2.append(p)

    return t1, t2


class MultiLobbyView(View):
    def __init__(self, bot, active_players, bench_players):
        super().__init__(timeout=1800)
        self.bot = bot

        # 1. СТАРТ: Все в запасе
        self.bench = active_players + bench_players
        # Сортируем по ТИРУ (функция get_tier)
        self.bench.sort(key=lambda x: self.get_tier(x), reverse=True)

        self.lobbies = []
        self.current_lobby_idx = 0
        self.selected_player_id = None

        # 2. Создаем слоты
        total_players = len(self.bench)
        num_lobbies = max(1, total_players // 10)

        for _ in range(num_lobbies):
            self.lobbies.append({'radiant': [], 'dire': []})

        self.update_components()

    # --- РАСЧЕТ ТИРА ---
    def get_tier(self, p):
        if p.internal_rating and p.internal_rating > 0:
            return int(p.internal_rating)
        if p.rank_tier:
            return int(p.rank_tier // 10)
        return 0

    # --- ПОЛУЧЕНИЕ ДАННЫХ ---
    def get_current_lobby(self):
        return self.lobbies[self.current_lobby_idx]

    def get_player_by_id(self, p_id):
        lobby = self.get_current_lobby()
        for p in lobby['radiant'] + lobby['dire']:
            if p.discord_id == p_id: return p
        for p in self.bench:
            if p.discord_id == p_id: return p
        return None

    # --- ФОРМАТИРОВАНИЕ ---
    def format_player_str(self, p):
        tier = self.get_tier(p)
        name = p.ingame_name[:15]
        link = f"https://stratz.com/players/{p.steam_id32}"
        pos_str = f" `[{p.positions}]`" if p.positions else ""
        return f"`{tier}` [**{name}**]({link}){pos_str}"

    def calculate_avg(self, team):
        if not team: return 0
        total = sum([self.get_tier(p) for p in team])
        return round(total / len(team), 1)

    # --- ВИЗУАЛ (EMBED) ---
    def build_embed(self):
        lobby = self.get_current_lobby()

        rad_avg = self.calculate_avg(lobby['radiant'])
        dire_avg = self.calculate_avg(lobby['dire'])

        rad_text = "\n".join([self.format_player_str(p) for p in lobby['radiant']]) or "*(Пусто)*"
        dire_text = "\n".join([self.format_player_str(p) for p in lobby['dire']]) or "*(Пусто)*"

        # Сортировка запаса
        self.bench.sort(key=lambda x: self.get_tier(x), reverse=True)

        lobby_num = self.current_lobby_idx + 1
        total_lobbies = len(self.lobbies)

        embed = discord.Embed(
            title=f"🏟️ Лобби {lobby_num} из {total_lobbies}",
            description=f"Avg Tier: **Rad {rad_avg}** vs **Dire {dire_avg}**",
            color=discord.Color.gold()
        )

        embed.add_field(name="🌳 Radiant", value=rad_text, inline=True)
        embed.add_field(name="🌋 Dire", value=dire_text, inline=True)
        embed.add_field(name="\u200b", value="\u200b", inline=False)

        if self.bench:
            bench_strings = [self.format_player_str(p) for p in self.bench]
            # Показываем запас компактно, если он большой
            chunk_size = 12
            for i in range(0, len(bench_strings), chunk_size):
                chunk = bench_strings[i: i + chunk_size]
                name = f"🪑 Запас ({len(self.bench)})" if i == 0 else "..."
                embed.add_field(name=name, value="\n".join(chunk), inline=True)
        else:
            embed.add_field(name="🪑 Запас", value="*(Пусто)*", inline=False)

        return embed

    # --- ИНТЕРФЕЙС ---
    def update_components(self):
        self.clear_items()  # Очищаем все
        lobby = self.get_current_lobby()

        # --- 1. СЕЛЕКТЫ ИГРОКОВ (Ряды 0 и 1) ---
        sort_key = lambda p: (-self.get_tier(p), p.ingame_name.lower())
        in_game = sorted(lobby['radiant'] + lobby['dire'], key=sort_key)
        bench_sorted = sorted(self.bench, key=sort_key)
        all_players = in_game + bench_sorted

        chunk_size = 25
        chunks = [all_players[i:i + chunk_size] for i in range(0, len(all_players), chunk_size)]

        current_row = 0
        # Лимит 2 меню (до 50 игроков)
        for i, chunk in enumerate(chunks[:2]):
            options = []
            for p in chunk:
                icon = "🌳" if p in lobby['radiant'] else "🌋" if p in lobby['dire'] else "🪑"
                tier = self.get_tier(p)
                label = f"[{tier}] {p.ingame_name}"[:100]

                # Обработка позиций
                pos_text = "Rank only"
                if p.positions:
                    if isinstance(p.positions, list):
                        pos_text = "/".join([str(x) for x in p.positions if str(x).strip() and str(x) != "/"])
                    else:
                        pos_text = str(p.positions).replace("///", "/")

                desc = f"Pos: {pos_text}"
                is_def = (self.selected_player_id == p.discord_id)

                options.append(discord.SelectOption(
                    label=label, value=str(p.discord_id), emoji=icon,
                    description=desc[:100], default=is_def
                ))

            if options:
                sel = Select(
                    placeholder=f"🔍 Игроки {i * 25 + 1}-{i * 25 + len(chunk)}",
                    options=options, row=current_row
                )
                sel.callback = self.select_callback
                self.add_item(sel)
                current_row += 1

        # --- 2. ПЕРЕМЕЩЕНИЕ (Ряд 2) ---
        move_row = current_row
        dis = (self.selected_player_id is None)

        b_rad = Button(style=discord.ButtonStyle.success, emoji="🌳", row=move_row, disabled=dis)
        b_rad.callback = self.move_to_radiant
        self.add_item(b_rad)

        b_dire = Button(style=discord.ButtonStyle.danger, emoji="🌋", row=move_row, disabled=dis)
        b_dire.callback = self.move_to_dire
        self.add_item(b_dire)

        b_bench = Button(style=discord.ButtonStyle.secondary, emoji="🪑", row=move_row, disabled=dis)
        b_bench.callback = self.move_to_bench
        self.add_item(b_bench)

        # --- 3. НАВИГАЦИЯ И УТИЛИТЫ (Ряд 3) ---
        nav_row = move_row + 1

        b_prev = Button(label="⬅️", style=discord.ButtonStyle.primary, row=nav_row,
                        disabled=(self.current_lobby_idx == 0))
        b_prev.callback = self.prev_lobby
        self.add_item(b_prev)

        b_shuf = Button(emoji="🎲", style=discord.ButtonStyle.secondary, row=nav_row)
        b_shuf.callback = self.auto_balance_current
        self.add_item(b_shuf)

        b_next = Button(label="➡️", style=discord.ButtonStyle.primary, row=nav_row,
                        disabled=(self.current_lobby_idx >= len(self.lobbies) - 1))
        b_next.callback = self.next_lobby
        self.add_item(b_next)

        b_reset = Button(emoji="🗑️", style=discord.ButtonStyle.danger, row=nav_row)
        b_reset.callback = self.reset_current_to_bench
        self.add_item(b_reset)

        b_pub = Button(label="Start", style=discord.ButtonStyle.green, row=nav_row)
        b_pub.callback = self.publish_all
        self.add_item(b_pub)

        # --- 4. GOOGLE TOOLS (Ряд 4) - ТОЛЬКО MASSIVE ---
        google_row = nav_row + 1
        if google_row < 5:
            # 4.1 Export ALL
            btn_ex_all = Button(
                label="Export ALL",
                style=discord.ButtonStyle.blurple,
                emoji="📤",
                row=google_row
            )
            btn_ex_all.callback = self.export_all_callback
            self.add_item(btn_ex_all)

            # 4.2 Import ALL
            btn_im_all = Button(
                label="Import ALL",
                style=discord.ButtonStyle.blurple,
                emoji="📥",
                row=google_row
            )
            btn_im_all.callback = self.import_all_callback
            self.add_item(btn_im_all)
    # --- CALLBACKS (Стандартные) ---
    async def select_callback(self, interaction):
        self.selected_player_id = int(interaction.data['values'][0])
        self.update_components()
        await interaction.response.edit_message(view=self)

    async def prev_lobby(self, interaction):
        self.current_lobby_idx -= 1
        self.selected_player_id = None
        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def next_lobby(self, interaction):
        self.current_lobby_idx += 1
        self.selected_player_id = None
        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def _move_player(self, interaction, target_dest):
        if not self.selected_player_id: return
        p = self.get_player_by_id(self.selected_player_id)
        if not p: return

        lobby = self.get_current_lobby()
        if p in lobby['radiant']: lobby['radiant'].remove(p)
        if p in lobby['dire']: lobby['dire'].remove(p)
        if p in self.bench: self.bench.remove(p)

        if target_dest == 'radiant':
            lobby['radiant'].append(p)
        elif target_dest == 'dire':
            lobby['dire'].append(p)
        elif target_dest == 'bench':
            self.bench.append(p)

        if target_dest == 'bench':
            self.bench.sort(key=lambda x: self.get_tier(x), reverse=True)

        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def move_to_radiant(self, interaction):
        await self._move_player(interaction, 'radiant')

    async def move_to_dire(self, interaction):
        await self._move_player(interaction, 'dire')

    async def move_to_bench(self, interaction):
        await self._move_player(interaction, 'bench')

    async def auto_balance_current(self, interaction):
        lobby = self.get_current_lobby()
        pool = lobby['radiant'] + lobby['dire']
        if not pool: return await interaction.response.send_message("⚠️ Лобби пустое.", ephemeral=True)
        lobby['radiant'], lobby['dire'] = simple_balance(pool)
        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def reset_current_to_bench(self, interaction):
        lobby = self.get_current_lobby()
        self.bench.extend(lobby['radiant'] + lobby['dire'])
        lobby['radiant'], lobby['dire'] = [], []
        self.bench.sort(key=lambda x: self.get_tier(x), reverse=True)
        self.selected_player_id = None
        self.update_components()
        await interaction.response.edit_message(embed=self.build_embed(), view=self)

    async def publish_all(self, interaction: discord.Interaction):
        await interaction.response.defer()

        # --- НАСТРОЙКИ КОМАНД ---
        TEAM_NAMES = {
            0: ("Natus Vincere", "Team Empire"),
            1: ("The Alliance", "Team Secret"),
            2: ("Evil Geniuses", "NewBee"),
        }
        # ------------------------

        await interaction.edit_original_response(view=None, content="✅ **Матчи публикуются...**")

        try:
            for i, lobby in enumerate(self.lobbies):
                if not lobby['radiant'] and not lobby['dire']:
                    continue

                r_name, d_name = TEAM_NAMES.get(i, (f"Radiant {i + 1}", f"Dire {i + 1}"))

                # -----------------------------------------------------------
                # 🔥 ШАГ 1: ПОДГРУЖАЕМ STEAM_ID32 ИЗ БАЗЫ
                # -----------------------------------------------------------
                all_players_in_lobby = lobby['radiant'] + lobby['dire']
                discord_ids = [p.discord_id for p in all_players_in_lobby]

                steam_map = {}  # {discord_id: steam_id32}

                if discord_ids:
                    async with self.bot.session_maker() as session:
                        # 👇 ТУТ ИЗМЕНЕНИЕ: запрашиваем Player.steam_id32
                        stmt = select(Player.discord_id, Player.steam_id32).where(Player.discord_id.in_(discord_ids))
                        result = await session.execute(stmt)
                        for row in result:
                            # row[0] = discord_id, row[1] = steam_id32
                            steam_map[row.discord_id] = row.steam_id32

                # -----------------------------------------------------------

                # === ВНУТРЕННЯЯ ФУНКЦИЯ ФОРМАТИРОВАНИЯ ===
                def format_p(p):
                    # 1. ТИР/ММР
                    tier_val = self.get_tier(p)

                    # 2. РОЛИ
                    roles_str = ""
                    clean_pos = []

                    if hasattr(p, 'positions') and p.positions:
                        raw_pos = p.positions
                        if isinstance(raw_pos, list):
                            for x in raw_pos:
                                if x is None: continue
                                s = str(x).strip()
                                if s and s != "/": clean_pos.append(s)
                        elif isinstance(raw_pos, str):
                            clean_pos = [s.strip() for s in raw_pos.split('/') if s.strip()]

                    if clean_pos:
                        roles_str = f" | Pos: {'/'.join(clean_pos)}"

                    # 3. ГИПЕРССЫЛКА (Stratz)
                    display_name = f"**{p.ingame_name}**"

                    # Берем ID из карты, которую загрузили выше
                    sid = steam_map.get(p.discord_id)

                    # Если вдруг в объекте регистрации уже есть ID
                    if not sid and hasattr(p, 'steam_id32') and p.steam_id32:
                        sid = p.steam_id32

                    # Формируем ссылку
                    if sid:
                        try:
                            # На всякий случай проверяем, вдруг там все-таки 64-битный ID
                            sid_int = int(sid)
                            if sid_int > 76561190000000000:
                                sid_int -= 76561197960265728

                            url = f"https://stratz.com/players/{sid_int}"
                            display_name = f"[{display_name}]({url})"
                        except:
                            pass

                    return f"[{tier_val}] {display_name}{roles_str}"

                # ==========================================

                rad_list = "\n".join([format_p(p) for p in lobby['radiant']])
                dire_list = "\n".join([format_p(p) for p in lobby['dire']])

                rad_pings = " ".join([f"<@{p.discord_id}>" for p in lobby['radiant']])
                dire_pings = " ".join([f"<@{p.discord_id}>" for p in lobby['dire']])

                embed = discord.Embed(
                    title=f"⚔️ Match #{i + 1} (Start)",
                    color=discord.Color.purple()
                )

                embed.add_field(name=f"🌳 {r_name}", value=rad_list or "-", inline=False)
                embed.add_field(name=f"🌋 {d_name}", value=dire_list or "-", inline=False)

                await interaction.channel.send(
                    content=f"**Lobby {i + 1}** Summon: {rad_pings} {dire_pings}",
                    embed=embed
                )

            if self.bench:
                bench_pings = " ".join([f"<@{p.discord_id}>" for p in self.bench])
                await interaction.channel.send(f"🪑 **В запасе:** {bench_pings}")

            await interaction.edit_original_response(content="✅ **Все матчи опубликованы!**")

        except Exception as e:
            import traceback
            traceback.print_exc()
            await interaction.channel.send(f"❌ Ошибка: {e}")

    async def export_all_callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        try:
            self.bot.sheet_service.export_custom_format(self.lobbies, self.bench)

            await interaction.followup.send(f"✅ Таблица обновлена!\n<{self.bot.sheet_url}>", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Ошибка: {e}", ephemeral=True)

    async def import_all_callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        try:
            # 1. Читаем таблицу
            imported_data, bench_names = self.bot.sheet_service.import_all_lobbies()

            # 2. Создаем ПОЛНЫЙ пул игроков из памяти бота (до импорта)
            pool = []
            if self.lobbies:
                for l in self.lobbies: pool.extend(l['radiant'] + l['dire'])
            if self.bench:
                pool.extend(self.bench)

            def find(n):
                if not n: return None
                for p in pool:
                    if p.ingame_name.lower().strip() == n.lower().strip(): return p
                return None

            # 3. Строим структуру новых лобби
            new_lobbies = []
            # ID игроков, которые нашлись в таблице и попали в лобби/бенч
            processed_ids = set()

            for l_data in imported_data:
                nl = {'radiant': [], 'dire': []}
                for name in l_data.get('radiant', []):
                    if p := find(name):
                        nl['radiant'].append(p)
                        processed_ids.add(p.discord_id)
                for name in l_data.get('dire', []):
                    if p := find(name):
                        nl['dire'].append(p)
                        processed_ids.add(p.discord_id)
                new_lobbies.append(nl)

            # 4. Строим новый запас из таблицы
            new_bench = []
            for name in bench_names:
                if p := find(name):
                    # Если игрок еще не обработан (не в лобби), добавляем
                    if p.discord_id not in processed_ids:
                        new_bench.append(p)
                        processed_ids.add(p.discord_id)

            # 5. SAFETY NET (СПАСЕНИЕ ПОТЕРЯШЕК)
            # Если игрока не было в таблице, но он был в пуле -> ВОЗВРАЩАЕМ В ЗАПАС
            restored_count = 0
            for p in pool:
                if p.discord_id not in processed_ids:
                    new_bench.append(p)
                    processed_ids.add(p.discord_id)
                    restored_count += 1

            # 6. Применяем
            if new_lobbies:
                self.lobbies = new_lobbies
            else:
                self.lobbies = []

            # Гарантируем 3 лобби
            while len(self.lobbies) < 3:
                self.lobbies.append({'radiant': [], 'dire': []})

            self.bench = new_bench
            try:
                self.bench.sort(key=lambda x: self.get_tier(x), reverse=True)
            except:
                pass

            if self.current_lobby_idx >= len(self.lobbies): self.current_lobby_idx = 0

            self.update_components()
            await interaction.edit_original_response(embed=self.build_embed(), view=self)

            msg = "✅ **Импорт завершен!**"
            if restored_count > 0:
                msg += f"\n🛡️ **Восстановлено {restored_count} игроков**, которых не было в таблице (или ошибки чтения)."

            await interaction.followup.send(msg, ephemeral=True)

        except Exception as e:
            import traceback
            traceback.print_exc()
            await interaction.followup.send(f"❌ Error: {e}", ephemeral=True)

    # ==========================
    # === GOOGLE: ONE LOBBY ====
    # ==========================

    async def export_current_callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        lobby = self.get_current_lobby()
        try:
            # Используем старый метод export_lobby (только для текущего)
            # Он запишет данные только в первые колонки (или как настроено)
            self.bot.sheet_service.export_lobby(lobby['radiant'], lobby['dire'], self.bench)
            await interaction.followup.send(f"✅ **Текущее** лобби выгружено!\n<{self.bot.sheet_url}>", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Error Export One: {e}", ephemeral=True)

    async def import_current_callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        try:
            # Читаем ТОЛЬКО первые колонки (старый метод)
            r_names, d_names, b_names = self.bot.sheet_service.import_lobby()

            lobby = self.get_current_lobby()

            # Пул: берем игроков только из ЭТОГО лобби и ЗАПАСА
            # (Игроков других лобби не трогаем, чтобы не сломать соседние игры)
            pool = lobby['radiant'] + lobby['dire'] + self.bench

            new_rad, new_dire, new_bench = [], [], []
            found_ids = set()

            def find(n):
                for p in pool:
                    if p.ingame_name.lower().strip() == n.lower().strip(): return p
                return None

            for n in r_names:
                if p := find(n): new_rad.append(p); found_ids.add(p.discord_id)
            for n in d_names:
                if p := find(n): new_dire.append(p); found_ids.add(p.discord_id)

            # Тех, кого нет в таблице для этого лобби, кидаем в ОБЩИЙ запас
            for p in pool:
                if p.discord_id not in found_ids: new_bench.append(p)

            # Обновляем только текущее лобби
            lobby['radiant'] = new_rad
            lobby['dire'] = new_dire
            self.bench = new_bench  # Запас обновляется глобально
            self.bench.sort(key=lambda x: self.get_tier(x), reverse=True)

            self.update_components()
            await interaction.edit_original_response(embed=self.build_embed(), view=self)
            await interaction.followup.send("✅ **Текущее** лобби обновлено!", ephemeral=True)

        except Exception as e:
            await interaction.followup.send(f"❌ Error Import One: {e}", ephemeral=True)

class RegistrationView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot

    @discord.ui.button(label="Участвовать", style=discord.ButtonStyle.green, emoji="✅", custom_id="join_league_btn")
    async def join_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            profile_service = ProfileService(session)
            league_service = LeagueService(session)

            # 1. Проверки профиля
            player = await profile_service.get_player(interaction.user.id)
            if not player or not player.rank_tier:
                await interaction.followup.send("❌ Сначала создай профиль: `/profile me`", ephemeral=True)
                return

            # 2. Попытка регистрации
            # Если это Титан, сервис вернет False и текст про скриншот
            success, message, is_auto_checked = await league_service.register_player(user_id=interaction.user.id)

            if not success:
                # Если ошибка про Титана — шлем инструкцию
                if "Titan" in message:
                    try:
                        await interaction.user.send(
                            "📸 **Подтверждение ранга**\n"
                            "Пожалуйста, отправь скриншот твоего MMR (в профиле Dota 2) прямо сюда, в ответ на это сообщение."
                        )
                        await interaction.followup.send(f"⚠️ **Требуется подтверждение.** Инструкция отправлена в ЛС.",
                                                        ephemeral=True)
                    except discord.Forbidden:
                        await interaction.followup.send(f"❌ {message}\n(Открой ЛС, бот не может написать тебе)",
                                                        ephemeral=True)
                else:
                    # Любая другая ошибка (уже зареган, нет сезона и т.д.)
                    await interaction.followup.send(f"❌ {message}", ephemeral=True)
                return

            # 3. Успех (для обычных игроков)
            await interaction.followup.send(f"✅ {message}", ephemeral=True)

            # Если сработал авточекин (для обычных игроков)
            if hasattr(self.bot, 'active_checkin') and self.bot.active_checkin:
                if not self.bot.active_checkin.is_finished() and is_auto_checked:
                    await self.bot.active_checkin.add_player_external(player, interaction.channel)


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
                        print(f"[AUTO-CHECKIN] Запускаю рассылку для Тура #{week.week_number}")
                        await self.send_checkin_dms(registrations, week.week_number)
                        self.checkin_sent_weeks.add(week.id)

        except Exception as e:
            print(f"[ERROR] Auto-checkin task failed: {e}")

    # --- ФУНКЦИЯ РАССЫЛКИ ---
    async def send_checkin_dms(self, registrations, week_num):
        embed = discord.Embed(
            title="⚠️ Check-In: Подтверждение участия",
            description=(
                f"Игры лиги (Тур #{week_num}) начнутся менее чем через час.\n"
                "**Ты готов играть?**\n\n"
                "Нажми **✅ Я буду играть**, чтобы подтвердить.\n"
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

        # Сообщаем, что начали обработку (для UX)
        processing_msg = await message.channel.send("⏳ Обрабатываю скриншот...")

        player_obj = None # Сюда сохраним объект игрока, если всё пройдет успешно

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            profile_service = ProfileService(session) # Нужен сервис профилей

            # --- ИСПРАВЛЕНИЕ ТУТ: Принимаем 3 значения ---
            success, response_text, is_auto_checked = await service.register_player(
                user_id=message.author.id,
                screenshot_url=attachment.url
            )

            # Если всё ок и сработал авто-чекин, нам нужен объект игрока для обновления меню
            if success and is_auto_checked:
                player_obj = await profile_service.get_player(message.author.id)

        # Сессия закрыта, работаем с результатами
        if success:
            await processing_msg.edit(content=f"✅ {response_text}")

            # --- ОБНОВЛЕНИЕ ГЛОБАЛЬНОГО МЕНЮ (VIEW) ---
            # Если сервис сказал, что авто-чекин был (значит время игры близко),
            # мы должны обновить цифру в канале.
            if is_auto_checked and hasattr(self.bot, 'active_checkin') and self.bot.active_checkin:
                if not self.bot.active_checkin.is_finished() and player_obj:
                    # Находим канал, в котором висит меню чекина
                    if self.bot.active_checkin.message:
                        target_channel = self.bot.active_checkin.message.channel
                        await self.bot.active_checkin.add_player_external(player_obj, target_channel)

        else:
            # Обработка ошибок
            # Если "Титан" в тексте — значит что-то не так с проверкой, показываем
            # Если просто левая картинка — можно игнорить, но лучше обработать
            if "Титан" in response_text or "уже" in response_text or "нет" in response_text:
                 await processing_msg.edit(content=f"❌ {response_text}")
            else:
                 # Если ошибка совсем неясная, можно удалить сообщение о загрузке или написать детали
                 await processing_msg.delete()

    # --- КОМАНДЫ ---
    league_group = app_commands.Group(name="league", description="Управление лигой")

    @league_group.command(name="debug_fill", description="[DEBUG] Создать 12 фейковых игроков для теста")
    @app_commands.checks.has_permissions(administrator=True)
    async def debug_fill(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        import random
        adjectives = ["Super", "Mega", "Lazy", "Angry", "Pro", "Noob", "Fast", "Drunk"]
        nouns = ["Carry", "Support", "Pudge", "Techies", "Mid", "Feeder", "Gamer", "Knight"]

        created_count = 0

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            week, _ = await service.get_active_registrations()

            if not week:
                return await interaction.followup.send("❌ Сначала создай неделю: `/league open ...`", ephemeral=True)

            for i in range(1, 32):
                fake_id = 99000 + i
                fake_name = f"{random.choice(adjectives)}_{random.choice(nouns)}_{i}"
                fake_rank = random.randint(10, 80)
                fake_mmr = 1000 + (fake_rank * 80)
                fake_steam_id = 80000000 + i

                # 1. Создаем игрока или получаем существующего
                stmt = select(Player).where(Player.discord_id == fake_id)
                result = await session.execute(stmt)
                player = result.scalar_one_or_none()

                if not player:
                    player = Player(
                        discord_id=fake_id,
                        ingame_name=fake_name,
                        rank_tier=fake_rank,
                        steam_id32=fake_steam_id
                    )
                    session.add(player)
                else:
                    player.ingame_name = fake_name
                    player.rank_tier = fake_rank

                # Сохраняем, чтобы убедиться, что объект зафиксирован
                await session.flush()

                # 2. Регистрируем
                await service.register_player(fake_id)

                # 3. Делаем Check-In вручную (ИСПРАВЛЕННАЯ ЧАСТЬ)
                from database.models import LeagueRegistration

                # Мы ищем регистрацию по player.discord_id, так как у Player нет поля id
                reg_stmt = select(LeagueRegistration).where(
                    LeagueRegistration.player_id == player.discord_id,  # <--- ТУТ БЫЛА ОШИБКА
                    LeagueRegistration.session_id == week.id
                )
                reg_res = await session.execute(reg_stmt)
                reg = reg_res.scalar_one_or_none()

                if reg:
                    reg.is_checked_in = True
                    reg.mmr_snapshot = fake_mmr
                    created_count += 1

            await session.commit()

        await interaction.followup.send(
            f"✅ Успешно создано **{created_count}** фейковых игроков с Check-In.\nТеперь жми `/league make_teams`",
            ephemeral=True)

    @league_group.command(name="debug_clear", description="[DEBUG] Удалить фейковых игроков")
    @app_commands.checks.has_permissions(administrator=True)
    async def debug_clear(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            # Удаляем всех, у кого ID от 99000 (наши фейки)
            # В SQLAlchemy 2.0 delete делается так:
            from sqlalchemy import delete

            stmt = delete(Player).where(Player.discord_id >= 99000)
            result = await session.execute(stmt)
            await session.commit()

            deleted = result.rowcount

        await interaction.followup.send(f"🗑️ Удалено **{deleted}** фейковых игроков.", ephemeral=True)

    @league_group.command(name="make_teams", description="Создать матчи (Мульти-лобби)")
    @app_commands.checks.has_permissions(administrator=True)
    async def make_teams(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            week, registrations = await service.get_active_registrations()

        if not registrations:
            return await interaction.followup.send("❌ Нет регистраций.", ephemeral=True)

        # 1. Берем всех CHECKED_IN
        ready_players = [p for reg, p in registrations if reg.is_checked_in]

        if len(ready_players) < 2:
            return await interaction.followup.send(f"⚠️ Мало людей: {len(ready_players)}.", ephemeral=True)

        # 2. Сортируем всех по скиллу (Internal Rating -> Rank Tier)
        # Это критично, чтобы Лобби 1 было самым сильным
        sorted_all = sorted(ready_players, key=lambda x: x.internal_rating if x.internal_rating else (x.rank_tier or 0),
                            reverse=True)

        # 3. Определяем, сколько полных лобби получается
        total_players = len(sorted_all)
        games_count = total_players // 10

        if games_count == 0:
            # Если меньше 10 человек, пробуем сделать хотя бы одну неполную игру
            games_count = 1

        cutoff = games_count * 10

        active_pool = sorted_all[:cutoff]  # Те кто точно играет
        bench_pool = sorted_all[cutoff:]  # Остаток (лишние люди)

        # Если игроков меньше 10 (например 8), active_pool будет пустым из-за логики среза, поправим:
        if total_players < 10:
            active_pool = sorted_all
            bench_pool = []

        # 4. Запускаем MultiLobbyView
        view = MultiLobbyView(self.bot, active_pool, bench_pool)
        embed = view.build_embed()

        await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    @league_group.command(name="open", description="Открыть регистрацию (время по МСК)")
    @app_commands.checks.has_permissions(administrator=True)
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
            title=f"🏆 Лига Dota 2 - Тур #{week_num}",
            description=(
                f"📅 **Старт игр:** {time_str_msk} (МСК)\n" 
                f"⏳ **До старта:** <t:{timestamp}:R>\n\n"
                "⏳ **Чек-ин:** Автоматически в ЛС за 1 час до начала.\n\n"
                "**Жми кнопку ниже, чтобы записаться!**"
            ),
            color=discord.Color.gold()
        )
        await interaction.channel.send(embed=embed, view=view)
        await interaction.followup.send("✅ Регистрация опубликована!", ephemeral=True)
    @league_group.command(name="adjust_tiers", description="[ADMIN] Изменить рейтинг игроков вручную")
    @app_commands.checks.has_permissions(administrator=True)
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
    @app_commands.checks.has_permissions(administrator=True)
    async def league_status(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            week, registrations = await service.get_active_registrations()

        if not week or not registrations:
            await interaction.followup.send("ℹ️ Нет активных участников.", ephemeral=True)
            return

        # СОРТИРОВКА
        # 1. Сначала те, кто НЕ готов (False < True, поэтому not is_checked_in ставит готовых вверх)
        # 2. Потом по ID регистрации (кто раньше нажал кнопку, тот выше)
        registrations.sort(key=lambda x: (not x[0].is_checked_in, x[0].id))

        checked_cnt = sum(1 for r, p in registrations if r.is_checked_in)

        lines = []
        for i, (reg, player) in enumerate(registrations, start=1):
            status = "✅" if reg.is_checked_in else "💤"
            mmr = f"**{reg.mmr_snapshot}**"

            # ССЫЛКА НА STRATZ
            link = player.ingame_name
            if player.steam_id32:
                link = f"[{player.ingame_name}](https://www.stratz.com/players/{player.steam_id32})"

            # СКРИНШОТ
            evd = f" [📸]({reg.screenshot_url})" if reg.screenshot_url else ""

            # --- ВЫРАВНИВАНИЕ ---
            # {i:>2} добавит пробел перед 1..9 (будет " 1", " 2"... "10")
            # Оборачиваем в `...`, чтобы ширина символов была фиксированной
            num_display = f"`{i:>2}.`"

            row_str = f"{num_display} {status} {mmr} | {link} (<@{player.discord_id}>){evd}"
            lines.append(row_str)

        # Собираем описание
        desc_header = (
            f"**Всего заявок:** {len(registrations)}\n"
            f"**Подтвердили (Ready):** {checked_cnt}\n"
            f"*(Сортировка: Готовые -> По времени регистрации)*\n\n"
        )

        # Объединяем строки
        full_text = desc_header + "\n".join(lines)

        # Обрезаем, если слишком длинно (лимит Discord 4096)
        if len(full_text) > 4096:
            full_text = full_text[:4000] + "\n... (список обрезан)"

        embed = discord.Embed(
            title=f"📊 Статус Тура #{week.week_number}",
            description=full_text,
            color=discord.Color.blue()
        )
        await interaction.followup.send(embed=embed, ephemeral=True)

    @league_group.command(name="delete_last", description="Удалить неделю")
    @app_commands.checks.has_permissions(administrator=True)
    async def league_delete(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        async with self.bot.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.delete_last_week()
        await interaction.followup.send(msg, ephemeral=True)

    @league_group.command(name="kick", description="Кикнуть игрока")
    @app_commands.checks.has_permissions(administrator=True)
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