FROM python:3.12-slim

WORKDIR /app

COPY bot/requirements.txt .

RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

COPY bot/ .
COPY anounce/Reg/ ./assets/channel-announcements/
COPY anounce/Lob/ ./assets/channel-announcements/
COPY anounce/Rez/ ./assets/channel-announcements/
COPY site/public/compendium/october/morbus-emblem.png ./assets/compendium/morbus-emblem.png
COPY site/public/compendium/october/panacea-emblem.png ./assets/compendium/panacea-emblem.png

RUN useradd --create-home --uid 1001 botuser \
    && chown -R botuser:botuser /app

USER botuser

CMD ["python", "main.py"]
