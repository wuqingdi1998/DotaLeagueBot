import gspread


class SheetService:
    def __init__(self, json_key_path, sheet_url):
        self.gc = gspread.service_account(filename=json_key_path)
        self.sh = self.gc.open_by_url(sheet_url)
        self.worksheet = self.sh.sheet1
        self.setup_headers()

    def setup_headers(self):
        if not self.worksheet.acell('A1').value:
            self.worksheet.update('A1:C1', [['🌳 Radiant', '🌋 Dire', '🪑 Bench']])

    def safe_get(self, row, index):
        try:
            if index < len(row): return str(row[index]).strip()
        except:
            pass
        return ""

    def export_custom_format(self, lobbies, bench):
        ws = self.sh.get_worksheet(0)

        # Очистка листа перед записью
        try:
            ws.unmerge_cells("A1:J200")
            ws.batch_clear(["A1:J200"])
        except:
            pass

        merge_ranges = ["A1:C1"]
        format_ranges = ["A1:C1"]

        def get_pos_str(p):
            if not hasattr(p, 'positions') or not p.positions: return "-"

            val = p.positions

            # ВАРИАНТ 1: Если в памяти записана строка (например "1///5" после кривого импорта)
            if isinstance(val, str):
                # Мы разбиваем её по слэшу, выкидываем пустоту и собираем заново
                clean_parts = [s.strip() for s in val.split('/') if s.strip()]
                return "/".join(clean_parts)

            # ВАРИАНТ 2: Если в памяти список (['1', '', '5'])
            if isinstance(val, list):
                clean_parts = []
                for x in val:
                    if x is None: continue
                    s = str(x).strip()
                    # Исключаем сами слэши, если они вдруг попали в список
                    if s and s != "/":
                        clean_parts.append(s)
                return "/".join(clean_parts)

            return str(val)


        def get_tier_val(p):
            if hasattr(p, 'internal_rating') and p.internal_rating: return int(p.internal_rating)
            if hasattr(p, 'rank_tier') and p.rank_tier: return int(p.rank_tier)
            return 0

        # Формируем левую колонку (BENCH)
        left_column = []
        left_column.append(["BENCH", "", ""])
        left_column.append(["Tier", "Nick", "Pos"])

        sorted_bench = sorted(bench, key=lambda x: get_tier_val(x), reverse=True)
        for p in sorted_bench:
            left_column.append([get_tier_val(p), p.ingame_name, get_pos_str(p)])

        # Формируем правую часть (LOBBIES)
        right_column = []

        # Можете тут тоже поменять названия на Team Alpha и т.д., если хотите
        lobby_names = ["HIGH LOBBY", "MID LOBBY", "LOW LOBBY"]

        for i, lobby in enumerate(lobbies):
            rad = lobby['radiant']
            dire = lobby['dire']

            # Название лобби
            l_name = lobby_names[i] if i < len(lobby_names) else f"LOBBY {i + 1}"

            current_row = len(right_column) + 1
            player_start = current_row + 2
            player_end = player_start + 4

            # Формулы для подсчета MMR
            f_rad = f'="Total: "&SUM(E{player_start}:E{player_end})'
            f_dire = f'="Total: "&SUM(H{player_start}:H{player_end})'

            # Объединение заголовка лобби
            rng = f"E{current_row}:J{current_row}"
            merge_ranges.append(rng)
            format_ranges.append(rng)

            right_column.append([l_name, "", "", "", "", ""])
            right_column.append([f_rad, "Radiant", "", f_dire, "Dire", ""])

            # Заполняем 5 слотов (или пустые, если игроков нет)
            for j in range(5):
                row = []
                # Radiant Player
                if j < len(rad):
                    p = rad[j]
                    row.extend([get_tier_val(p), p.ingame_name, get_pos_str(p)])
                else:
                    row.extend([0, "", ""])

                # Dire Player
                if j < len(dire):
                    p = dire[j]
                    row.extend([get_tier_val(p), p.ingame_name, get_pos_str(p)])
                else:
                    row.extend([0, "", ""])

                right_column.append(row)

            # Пустая строка между лобби
            right_column.append(["", "", "", "", "", ""])

        # Склеиваем левую и правую части
        final_data = []
        max_len = max(len(left_column), len(right_column))

        for i in range(max_len):
            l_row = left_column[i] if i < len(left_column) else ["", "", ""]
            r_row = right_column[i] if i < len(right_column) else ["", "", "", "", "", ""]
            final_data.append(l_row + [""] + r_row)

        # Отправляем в Google Sheets
        ws.update("A1", final_data, value_input_option='USER_ENTERED')

        # Применяем форматирование
        for rng in merge_ranges:
            try:
                ws.merge_cells(rng, merge_type='MERGE_ALL')
            except:
                pass

        try:
            for rng in format_ranges:
                ws.format(rng, {
                    "horizontalAlignment": "CENTER",
                    "textFormat": {"bold": True, "fontSize": 12}
                })
        except:
            pass

    # ==========================================
    # ИМПОРТ (ИСПРАВЛЕННЫЙ)
    # ==========================================
    def import_all_lobbies(self):
        ws = self.sh.get_worksheet(0)
        # force_fetch не всегда работает в gspread, но get_all_values обычно надежен
        all_values = ws.get_all_values()

        lobbies_data = []
        bench_names = []
        current_rad = []
        current_dire = []
        found_first_header = False

        # МЯГКИЙ СПИСОК (Только точные совпадения)
        ignored_exact = [
            "radiant", "dire", "bench", "high lobby", "mid lobby", "low lobby",
            "tier", "nick", "pos", "total", "sum", "0", "---"
        ]

        def is_valid_name(value):
            if not value: return False
            v = str(value).strip()
            if not v: return False
            if v.isdigit(): return False
            if v.startswith("="): return False

            # Проверяем ТОЧНОЕ совпадение, а не "содержит внутри"
            if v.lower() in ignored_exact: return False

            # Исключаем строки, похожие на формулы тотала
            if "total:" in v.lower(): return False

            return True

        for row in all_values:
            if not row: continue

            val_bench = self.safe_get(row, 1)  # Колонка B (Nick)
            val_rad_col = self.safe_get(row, 5)  # Колонка F (Radiant)
            val_dire_col = self.safe_get(row, 8)  # Колонка I (Dire)

            # 1. ЗАПАС (Читаем всегда, даже если справа пусто)
            if is_valid_name(val_bench):
                bench_names.append(val_bench)

            # 2. ЛОББИ
            is_header_row = (val_rad_col.lower() == "radiant")

            if is_header_row:
                if found_first_header:
                    lobbies_data.append({'radiant': current_rad, 'dire': current_dire})
                    current_rad = []
                    current_dire = []
                found_first_header = True
                continue

            if found_first_header:
                if is_valid_name(val_rad_col): current_rad.append(val_rad_col)
                if is_valid_name(val_dire_col): current_dire.append(val_dire_col)

        if found_first_header:
            lobbies_data.append({'radiant': current_rad, 'dire': current_dire})

        return lobbies_data, bench_names