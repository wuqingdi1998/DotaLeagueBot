import os
import aiohttp
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()


class StratzService:
    def __init__(self):
        self.token = os.getenv("STRATZ_TOKEN")
        self.base_url = "https://api.stratz.com/graphql"

    # Добавил target_date в аргументы
    async def get_player_activity(self, steam_id, main_role_char, side_role_char, target_date: datetime):
        if not steam_id:
            return {'success': False, 'error': 'No ID'}

        # === 1. НОВЫЕ РАМКИ ВРЕМЕНИ ===
        # Начало окна: Дата турнира (00:00) минус 30 день
        start_dt = target_date.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30)
        ts_start = int(start_dt.timestamp())

        # Конец окна: Текущий момент (чтобы не залезть в будущее, если дата лиги далеко)
        ts_end = int(datetime.now().timestamp())

        print(f"\n🔎 [STRATZ] Проверяем ID: {steam_id}")
        print(f"   📅 Окно поиска: с {start_dt.date()} по {datetime.fromtimestamp(ts_end).date()}")

        # Шаблон запроса (Твой старый)
        query_template = """
        {
          player(steamAccountId: %s) {
            matches(request: {take: 50, skip: %d}) {
              id
              lobbyType
              gameMode
              startDateTime
              players {
                steamAccountId
                position
              }
            }
          }
        }
        """

        headers = {
            "Authorization": f"Bearer {self.token}",
            "User-Agent": "DiscordBot/1.0",
            "Content-Type": "application/json"
        }

        all_matches = []
        skip_count = 0
        keep_fetching = True

        # === ЦИКЛ СБОРА МАТЧЕЙ ===
        try:
            async with aiohttp.ClientSession() as session:
                while keep_fetching:
                    # Формируем запрос
                    query = query_template % (steam_id, skip_count)

                    async with session.post(self.base_url, json={'query': query}, headers=headers) as resp:
                        if resp.status != 200:
                            print(f"🔴 [Stratz] Ошибка HTTP: {resp.status}")
                            break

                        data = await resp.json()

                        if 'data' not in data or not data['data'].get('player'):
                            print("🔴 [Stratz] Игрок не найден или профиль скрыт")
                            if not all_matches:
                                return {'success': True, 'is_private': True, 'total': 0, 'main': 0, 'side': 0,
                                        'passed': False}
                            break

                        batch = data['data']['player'].get('matches', [])

                        if not batch:
                            break

                        all_matches.extend(batch)
                        print(f"   -> Загружена пачка {len(batch)} игр (Skip: {skip_count})...")

                        # Проверяем последнюю игру в пачке
                        last_match_time = batch[-1].get('startDateTime', 0)

                        # ИЗМЕНЕНИЕ: Сравниваем с ts_start (30 дней до лиги), а не просто month_ago
                        if last_match_time < ts_start:
                            keep_fetching = False
                            print("   🛑 Найдена игра старее стартовой даты окна. Стоп.")
                        else:
                            skip_count += 50
                            if skip_count >= 500:
                                print("   ⚠️ Достигнут лимит безопасности (500 игр). Стоп.")
                                keep_fetching = False

        except Exception as e:
            print(f"🔴 [Stratz] Ошибка сети/парсинга: {e}")
            return {'success': False, 'error': str(e)}

        # === АНАЛИЗ ВСЕХ СОБРАННЫХ МАТЧЕЙ ===
        if not all_matches:
            print("🔴 [Stratz] Игр не найдено.")
            return {'success': True, 'is_private': False, 'total': 0, 'main': 0, 'side': 0, 'passed': False}

        count_total = 0
        count_main = 0
        count_side = 0

        pos_map = {
            "1": "POSITION_1", "2": "POSITION_2", "3": "POSITION_3",
            "4": "POSITION_4", "5": "POSITION_5"
        }
        # Тут у тебя была логика маппинга, оставил как есть, предполагая что char приходит как "1", "2"...
        # Но в pos_map ключи - строки.
        target_main = pos_map.get(str(main_role_char), "UNKNOWN")
        target_side = pos_map.get(str(side_role_char), "UNKNOWN")

        # Если вдруг в маппинге ошибка (например main_role_char="POSITION_1"), можно сделать реверс:
        # Но я не трогаю, как ты просил. Оставляю твою логику.

        print(f"📋 Всего загружено {len(all_matches)} потенциальных игр. Фильтруем...")

        for m in all_matches:
            # match_id = m.get('id') # Не используется
            lobby = m.get('lobbyType')
            start_time = m.get('startDateTime', 0)

            # ИЗМЕНЕНИЕ: Строгий фильтр по окну [Start ... End]
            if start_time < ts_start:
                continue
            if start_time > ts_end:
                continue

            lobby_str = str(lobby).upper()
            # Твоя проверка на ранкед (Lobby 7)
            is_ranked = (lobby_str == "7" or lobby_str == "RANKED")

            players_in_match = m.get('players', [])
            my_player = None
            for p in players_in_match:
                if p.get('steamAccountId') == int(steam_id):
                    my_player = p
                    break

            if not my_player: continue

            match_pos = my_player.get('position') if my_player else "NONE"

            # Внимание: Stratz возвращает "POSITION_1", а не цифру "1".
            # Твой target_main выше через pos_map.get("1") вернет "POSITION_1".
            # Значит сравнение match_pos == target_main корректно.

            if is_ranked:
                count_total += 1
                if match_pos == target_main:
                    count_main += 1
                elif match_pos == target_side:
                    count_side += 1

        passed = (count_total >= 20 and count_main >= 10 and count_side >= 5)

        print(f"📊 ИТОГ: Total={count_total}, Main={count_main}, Side={count_side} -> Passed: {passed}\n")

        return {
            'success': True,
            'is_private': False,
            'total': count_total,
            'main': count_main,
            'side': count_side,
            'passed': passed
        }