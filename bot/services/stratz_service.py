import os
import aiohttp
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()


def _truthy(val: str) -> bool:
    return str(val).strip().lower() in ("1", "true", "yes", "y", "on")


class StratzService:
    def __init__(self):
        self.token = os.getenv("STRATZ_TOKEN")
        self.base_url = "https://api.stratz.com/graphql"

        self.use_wins = _truthy(os.getenv("ACTIVITY_CHECK_USE_WINS", "true"))
        self.main_required = int(os.getenv("ACTIVITY_MAIN_REQUIRED", "10"))
        self.side_required = int(os.getenv("ACTIVITY_SIDE_REQUIRED", "4"))
        self.total_required = int(os.getenv("ACTIVITY_TOTAL_REQUIRED", "20"))

    async def get_player_activity(self, steam_id, main_role_char, side_role_char, target_date: datetime):
        if not steam_id:
            return {'success': False, 'error': 'No ID'}

        start_dt = target_date.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30)
        ts_start = int(start_dt.timestamp())
        ts_end = int(datetime.now().timestamp())

        print(f"\n🔎 [STRATZ] Проверяем ID: {steam_id}")
        print(f"   📅 Окно поиска: с {start_dt.date()} по {datetime.fromtimestamp(ts_end).date()}")

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
                isVictory
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

        try:
            async with aiohttp.ClientSession() as session:
                while keep_fetching:
                    query = query_template % (steam_id, skip_count)

                    async with session.post(self.base_url, json={'query': query}, headers=headers) as resp:
                        if resp.status != 200:
                            print(f"🔴 [Stratz] Ошибка HTTP: {resp.status}")
                            break

                        data = await resp.json()

                        if 'data' not in data or not data['data'].get('player'):
                            print("🔴 [Stratz] Игрок не найден или профиль скрыт")
                            if not all_matches:
                                return {
                                    'success': True, 'is_private': True,
                                    'total': 0, 'main': 0, 'side': 0,
                                    'wins_main': 0, 'wins_side': 0,
                                    'mode': 'wins' if self.use_wins else 'games',
                                    'passed': False
                                }
                            break

                        batch = data['data']['player'].get('matches', [])

                        if not batch:
                            break

                        all_matches.extend(batch)
                        print(f"   -> Загружена пачка {len(batch)} игр (Skip: {skip_count})...")

                        last_match_time = batch[-1].get('startDateTime', 0)

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

        mode = 'wins' if self.use_wins else 'games'

        if not all_matches:
            print("🔴 [Stratz] Игр не найдено.")
            return {
                'success': True, 'is_private': False,
                'total': 0, 'main': 0, 'side': 0,
                'wins_main': 0, 'wins_side': 0,
                'mode': mode, 'passed': False
            }

        count_total = 0
        count_main = 0
        count_side = 0
        wins_main = 0
        wins_side = 0

        pos_map = {
            "1": "POSITION_1", "2": "POSITION_2", "3": "POSITION_3",
            "4": "POSITION_4", "5": "POSITION_5"
        }
        target_main = pos_map.get(str(main_role_char), "UNKNOWN")
        target_side = pos_map.get(str(side_role_char), "UNKNOWN")

        print(f"📋 Всего загружено {len(all_matches)} потенциальных игр. Фильтруем...")

        for m in all_matches:
            lobby = m.get('lobbyType')
            start_time = m.get('startDateTime', 0)

            if start_time < ts_start:
                continue
            if start_time > ts_end:
                continue

            lobby_str = str(lobby).upper()
            is_ranked = (lobby_str == "7" or lobby_str == "RANKED")

            if not is_ranked:
                continue

            players_in_match = m.get('players', [])
            my_player = None
            for p in players_in_match:
                if p.get('steamAccountId') == int(steam_id):
                    my_player = p
                    break

            if not my_player:
                continue

            match_pos = my_player.get('position') or "NONE"
            is_victory = bool(my_player.get('isVictory'))

            count_total += 1
            if match_pos == target_main:
                count_main += 1
                if is_victory:
                    wins_main += 1
            elif match_pos == target_side:
                count_side += 1
                if is_victory:
                    wins_side += 1

        if self.use_wins:
            passed = (wins_main >= self.main_required and wins_side >= self.side_required)
        else:
            passed = (
                count_total >= self.total_required
                and count_main >= self.main_required
                and count_side >= self.side_required
            )

        print(
            f"📊 ИТОГ [{mode}]: Total={count_total}, Main={count_main}, Side={count_side}, "
            f"WMain={wins_main}, WSide={wins_side} -> Passed: {passed}\n"
        )

        return {
            'success': True,
            'is_private': False,
            'total': count_total,
            'main': count_main,
            'side': count_side,
            'wins_main': wins_main,
            'wins_side': wins_side,
            'mode': mode,
            'passed': passed
        }
