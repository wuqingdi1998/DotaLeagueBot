const authErrorMessages: Record<string, string> = {
  discord:
    "Discord временно не отвечает. Попробуйте войти ещё раз через несколько секунд.",
  state:
    "Попытка входа устарела или уже была использована. Начните вход через Discord заново.",
  config:
    "Вход через Discord временно недоступен из-за настройки сервера.",
  not_registered:
    "Сначала зарегистрируйте профиль через Discord-бота сообщества.",
};

export function getAuthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return authErrorMessages[code] ?? null;
}
