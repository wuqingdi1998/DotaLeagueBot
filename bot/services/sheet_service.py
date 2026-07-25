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

        # 1. Очистка
        try:
            ws.batch_clear(["A1:J200"])
            ws.unmerge_cells("A1:J200")
        except Exception as e:
            print(f"[SheetService] Clear warning: {e}")

        # Списки для форматирования
        merge_ranges = ["A1:C1"]  # Диапазоны для объединения
        bold_ranges = ["A1:C2"]  # Диапазоны для жирного шрифта (Сразу добавляем шапку Бенча и строку ниже)

        # --- ХЕЛПЕРЫ ---
        def get_pos_str(p):
            if not hasattr(p, 'positions') or not p.positions: return "-"
            val = p.positions
            if isinstance(val, str):
                return "/".join([s.strip() for s in val.split('/') if s.strip()])
            if isinstance(val, list):
                clean_parts = []
                for x in val:
                    if x:
                        s = str(x).strip()
                        if s and s != "/": clean_parts.append(s)
                return "/".join(clean_parts)
            return str(val)

        def get_tier_val(p):
            # 1. Internal Rating
            if hasattr(p, 'internal_rating') and p.internal_rating:
                return int(p.internal_rating)
            # 2. Dota Rank Tier (делим на 10)
            if hasattr(p, 'rank_tier') and p.rank_tier:
                return int(int(p.rank_tier) / 10)
            return 0

        # --- СБОР ДАННЫХ ---

        # ЛЕВАЯ КОЛОНКА (BENCH)
        left_column = []
        left_column.append(["BENCH", "", ""])
        left_column.append(["Tier", "Nick", "Pos"])

        sorted_bench = sorted(bench, key=lambda x: get_tier_val(x), reverse=True)
        for p in sorted_bench:
            left_column.append([get_tier_val(p), p.ingame_name, get_pos_str(p)])

        # ПРАВАЯ КОЛОНКА (LOBBIES)
        right_column = []
        lobby_names = ["HIGH LOBBY", "MID LOBBY", "LOW LOBBY"]

        for i, lobby in enumerate(lobbies):
            rad = lobby['radiant']
            dire = lobby['dire']
            l_name = lobby_names[i] if i < len(lobby_names) else f"LOBBY {i + 1}"

            # Индекс первой строки текущего лобби в Excel (начинается с 1)
            start_row_idx = len(right_column) + 1

            # Строка 1: Название лобби
            right_column.append([l_name, "", "", "", "", ""])

            # Строка 2: Тоталы и названия команд
            p_start = start_row_idx + 2
            p_end = p_start + 4
            f_rad = f'="Total: "&SUM(E{p_start}:E{p_end})'
            f_dire = f'="Total: "&SUM(H{p_start}:H{p_end})'

            right_column.append([f_rad, "Radiant", "", f_dire, "Dire", ""])

            # --- ЗАПОМИНАЕМ ФОРМАТИРОВАНИЕ ДЛЯ ЛОББИ ---
            # 1. Объединяем только заголовок лобби
            merge_ranges.append(f"E{start_row_idx}:J{start_row_idx}")

            # 2. Жирным делаем ДВЕ строки: Заголовок лобби + Строку с Total/Radiant/Dire
            # start_row_idx = строка названия, start_row_idx+1 = строка команд
            bold_ranges.append(f"E{start_row_idx}:J{start_row_idx + 1}")

            # Игроки
            for j in range(5):
                row = []
                # Radiant
                if j < len(rad):
                    p = rad[j]
                    row.extend([get_tier_val(p), p.ingame_name, get_pos_str(p)])
                else:
                    row.extend([0, "", ""])
                # Dire
                if j < len(dire):
                    p = dire[j]
                    row.extend([get_tier_val(p), p.ingame_name, get_pos_str(p)])
                else:
                    row.extend([0, "", ""])
                right_column.append(row)

            # Пустая строка
            right_column.append(["", "", "", "", "", ""])

        # СБОРКА МАТРИЦЫ
        final_data = []
        max_len = max(len(left_column), len(right_column))

        for i in range(max_len):
            l_row = left_column[i] if i < len(left_column) else ["", "", ""]
            sep = [""]
            r_row = right_column[i] if i < len(right_column) else ["", "", "", "", "", ""]
            final_data.append(l_row + sep + r_row)

        # 2. ЗАПИСЬ ДАННЫХ
        end_row = len(final_data)
        ws.update(range_name=f"A1:J{end_row}", values=final_data, value_input_option='USER_ENTERED')

        # 3. ФОРМАТИРОВАНИЕ
        try:
            # А. Применяем объединение ячеек
            for rng in merge_ranges:
                ws.merge_cells(rng, merge_type='MERGE_ALL')

            # Б. Базовый стиль для ВСЕЙ таблицы (Montserrat + Center)
            ws.format(f"A1:J{end_row}", {
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "textFormat": {
                    "fontFamily": "Montserrat",
                    "fontSize": 10,
                    "bold": False
                }
            })

            # В. Применяем ЖИРНЫЙ шрифт для заголовков (Bench, Lobbies, Totals, Radiant/Dire)
            for rng in bold_ranges:
                ws.format(rng, {
                    "horizontalAlignment": "CENTER",
                    "verticalAlignment": "MIDDLE",
                    "textFormat": {
                        "fontFamily": "Montserrat",
                        "bold": True,  # <--- Жирный
                        "fontSize": 11  # Чуть крупнее
                    }
                })

        except Exception as e:
            print(f"[SheetService] Formatting error: {e}")

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