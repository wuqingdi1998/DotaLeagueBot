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

    async def get_player_activity(self, steam_id, main_role_char, side_role_char):
        if not steam_id:
            return {'success': False, 'error': 'No ID'}

        # 1. Дата отсечки (30 дней назад)
        month_ago = int((datetime.now() - timedelta(days=30)).timestamp())

        print(f"\n🔎 [STRATZ] Проверяем ID: {steam_id} (Пагинация по 50 игр)")

        # Шаблон запроса с параметром skip (пропуск)
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
                    # Формируем запрос с текущим отступом (0, 50, 100...)
                    query = query_template % (steam_id, skip_count)

                    async with session.post(self.base_url, json={'query': query}, headers=headers) as resp:
                        if resp.status != 200:
                            print(f"🔴 [Stratz] Ошибка HTTP: {resp.status}")
                            break  # Прерываем цикл при ошибке

                        data = await resp.json()

                        if 'data' not in data or not data['data'].get('player'):
                            print("🔴 [Stratz] Игрок не найден или профиль скрыт")
                            # Если мы уже что-то собрали, обработаем это. Если нет - выходим.
                            if not all_matches:
                                return {'success': True, 'is_private': True, 'total': 0, 'main': 0, 'side': 0,
                                        'passed': False}
                            break

                        batch = data['data']['player'].get('matches', [])

                        if not batch:
                            # Матчи кончились
                            break

                        # Добавляем пачку в общий котел
                        all_matches.extend(batch)
                        print(f"   -> Загружена пачка {len(batch)} игр (Skip: {skip_count})...")

                        # Проверяем последнюю игру в пачке
                        last_match_time = batch[-1].get('startDateTime', 0)

                        # Если последняя игра старее месяца -> останавливаемся
                        if last_match_time < month_ago:
                            keep_fetching = False
                            print("   🛑 Найдена игра старее 30 дней. Стоп.")
                        else:
                            # Иначе готовимся брать следующую пачку
                            skip_count += 50

                            # ЗАЩИТА ОТ БЕСКОНЕЧНОСТИ (на всякий случай, макс 500 игр)
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
        target_main = pos_map.get(str(main_role_char), "UNKNOWN")
        target_side = pos_map.get(str(side_role_char), "UNKNOWN")

        print(f"📋 Всего загружено {len(all_matches)} потенциальных игр. Фильтруем...")

        for m in all_matches:
            match_id = m.get('id')
            lobby = m.get('lobbyType')
            start_time = m.get('startDateTime', 0)

            # Строгий фильтр даты (выкидываем лишнее из последней пачки)
            if start_time < month_ago:
                continue

            lobby_str = str(lobby).upper()
            is_ranked = (lobby_str == "7" or lobby_str == "RANKED")

            players_in_match = m.get('players', [])
            my_player = None
            for p in players_in_match:
                if p.get('steamAccountId') == int(steam_id):
                    my_player = p
                    break

            if not my_player: continue

            match_pos = my_player.get('position') if my_player else "NONE"

            # Считаем только Рейтинг
            if is_ranked:
                count_total += 1
                if match_pos == target_main:
                    count_main += 1
                elif match_pos == target_side:
                    count_side += 1

        passed = (count_total >= 20 and count_main >= 10 and count_side >= 5)

        print(f"📊 ИТОГ ЗА 30 ДНЕЙ: Total={count_total}, Main={count_main}, Side={count_side} -> Passed: {passed}\n")

        return {
            'success': True,
            'is_private': False,
            'total': count_total,
            'main': count_main,
            'side': count_side,
            'passed': passed
        }