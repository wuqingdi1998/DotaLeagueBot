"""Create an isolated configuration without copying Discord or production DB access."""

import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess


def development_environment(production: dict[str, str], existing: dict[str, str], revision: str) -> dict[str, str]:
    domain = production.get("DEVELOPMENT_DOMAIN", "dev.lsesports.ru")
    allowed_names = ("ORGANIZER_PASSWORD", "STEAM_API_KEY", "OPENDOTA_API_KEY", "STRATZ_TOKEN")
    result = {name: production[name] for name in allowed_names if production.get(name)}
    result.update({
        "POSTGRES_USER": "linkens_development",
        "POSTGRES_DB": "linkens_development",
        "POSTGRES_PASSWORD": existing.get("POSTGRES_PASSWORD") or secrets.token_hex(32),
        "POSTGRES_HOST": "db",
        "POSTGRES_PORT": "5432",
        "PUBLIC_BASE_URL": f"https://{domain}",
        "PRODUCTION_BASE_URL": production["PUBLIC_BASE_URL"],
        "SITE_ENVIRONMENT": "development",
        "SITE_RELEASE_SHA": revision,
        "DATABASE_POOL_SIZE": "3",
        "WEBSITE_NOTIFICATIONS_ENABLED": "false",
        "COMPENDIUM_SCHEDULER_SECRET": existing.get("COMPENDIUM_SCHEDULER_SECRET") or secrets.token_hex(32),
    })
    return result


def compose_environment(directory: Path, filename: str) -> dict[str, str]:
    configuration = subprocess.check_output(
        ["docker", "compose", "-f", filename, "config", "--format", "json"],
        cwd=directory, text=True,
    )
    return json.loads(configuration)["services"]["site"]["environment"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--production-dir", type=Path, required=True)
    parser.add_argument("--revision", required=True)
    arguments = parser.parse_args()
    production = compose_environment(arguments.production_dir, "docker-compose.yml")
    existing = compose_environment(Path.cwd(), "docker-compose.development.yml") if Path(".env.development").exists() else {}
    environment = development_environment(production, existing, arguments.revision)
    target = Path(".env.development")
    with open(target, "w", encoding="utf-8", opener=lambda path, flags: os.open(path, flags, 0o600)) as output:
        for name, value in environment.items():
            escaped_value = str(value).replace("\\", "\\\\").replace("'", "\\'")
            output.write(f"{name}='{escaped_value}'\n")
    target.chmod(0o600)
    print("Development configuration prepared; production credentials excluded")


if __name__ == "__main__":
    main()
