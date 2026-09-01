CREATE TABLE IF NOT EXISTS channel_announcement_outbox (
    id BIGSERIAL PRIMARY KEY,
    dedupe_key TEXT NOT NULL UNIQUE,
    channel_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    attachment_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    discord_message_id BIGINT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO channel_announcement_outbox (
    dedupe_key,
    channel_id,
    content,
    attachment_name
)
VALUES
    (
        'season9-registration-preview-round-1',
        1461860575259660408,
        $$@everyone
06.09.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=1) на 1-ый тур Linken's Sphere 5x5 League$$,
        'Reg1.png'
    ),
    (
        'season9-registration-preview-round-2',
        1461860575259660408,
        $$@everyone
11.09.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=2) на 2-ой тур Linken's Sphere 5x5 League$$,
        'Reg2.png'
    ),
    (
        'season9-registration-preview-round-3',
        1461860575259660408,
        $$@everyone
20.09.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=3) на 3-ий тур Linken's Sphere 5x5 League$$,
        'Reg3.png'
    ),
    (
        'season9-registration-preview-round-4',
        1461860575259660408,
        $$@everyone
25.09.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=4) на 4-ый тур Linken's Sphere 5x5 League$$,
        'Reg4.png'
    ),
    (
        'season9-registration-preview-round-5',
        1461860575259660408,
        $$@everyone
04.10.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=5) на 5-ый тур Linken's Sphere 5x5 League$$,
        'Reg5.png'
    ),
    (
        'season9-registration-preview-round-6',
        1461860575259660408,
        $$@everyone
09.10.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=6) на 6-ой тур Linken's Sphere 5x5 League$$,
        'Reg6.png'
    ),
    (
        'season9-registration-preview-round-7',
        1461860575259660408,
        $$@everyone
18.10.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=7) на 7-ой тур Linken's Sphere 5x5 League$$,
        'Reg7.png'
    ),
    (
        'season9-registration-preview-round-8',
        1461860575259660408,
        $$@everyone
23.10.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=8) на 8-ой тур Linken's Sphere 5x5 League$$,
        'Reg8.png'
    ),
    (
        'season9-registration-preview-round-9',
        1461860575259660408,
        $$@everyone
01.11.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=9) на 9-ый тур Linken's Sphere 5x5 League$$,
        'Reg9.png'
    ),
    (
        'season9-registration-preview-round-10',
        1461860575259660408,
        $$@everyone
06.11.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=10) на 10-ый тур Linken's Sphere 5x5 League$$,
        'Reg10.png'
    ),
    (
        'season9-registration-preview-round-11',
        1461860575259660408,
        $$@everyone
15.11.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=11) на 11-ый тур Linken's Sphere 5x5 League$$,
        'Reg11.png'
    ),
    (
        'season9-registration-preview-round-12',
        1461860575259660408,
        $$@everyone
20.11.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=12) на 12-ый тур Linken's Sphere 5x5 League$$,
        'Reg12.png'
    ),
    (
        'season9-registration-preview-round-13',
        1461860575259660408,
        $$@everyone
29.11.2026 (Воскресенье) 21:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=13) на 13-ый тур Linken's Sphere 5x5 League$$,
        'Reg13.png'
    ),
    (
        'season9-registration-preview-round-14',
        1461860575259660408,
        $$@everyone
04.12.2026 (Пятница) 22:00
Открыта [регистрация](https://lsesports.ru/tournaments/league-season-9?round=14) на 14-ый тур Linken's Sphere 5x5 League$$,
        'Reg14.png'
    )
ON CONFLICT (dedupe_key) DO NOTHING;
