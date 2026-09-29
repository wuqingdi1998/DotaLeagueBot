import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { FiShield } from "react-icons/fi";
import type { SessionUser } from "@/app/components/SiteHeader";
import { OrganizerPasswordLoginForm } from "./OrganizerPasswordLoginForm";

export function LoginScreen({
  user,
  returnTo,
  passwordChanged = false,
}: {
  user: SessionUser | null;
  returnTo: string;
  passwordChanged?: boolean;
}) {
  return (
    <section className="auth-page">
      <header className="auth-page-heading">
        <p>Безопасный вход</p>
        <h1>Выберите способ входа</h1>
        <span>Обычный профиль и управление организатора работают независимо.</span>
      </header>
      {passwordChanged && (
        <p className="auth-page-success" role="status">
          Пароль изменён. Все прежние входы по паролю завершены.
        </p>
      )}
      <div className="auth-choice-grid">
        <article className="auth-choice-card">
          <FaDiscord aria-hidden="true" />
          <h2>Вход участника</h2>
          <p>Для профиля, заявок, матчей и остальных функций участника.</p>
          {user && !user.isStandaloneOrganizer ? (
            <Link className="secondary-button" href={returnTo}>Продолжить как участник</Link>
          ) : (
            <a
              className="discord-login modal-discord-button"
              href={`/api/auth/discord?returnTo=${encodeURIComponent(returnTo)}`}
            >
              <FaDiscord /> Войти через Discord
            </a>
          )}
        </article>
        <article className="auth-choice-card auth-organizer-card">
          <FiShield aria-hidden="true" />
          <h2>Вход организатора</h2>
          <p>Отдельный вход для управления без создания профиля участника.</p>
          {user?.isAdmin ? (
            <Link className="primary-button" href="/organizer">Открыть панель организатора</Link>
          ) : (
            <OrganizerPasswordLoginForm returnTo={returnTo} />
          )}
        </article>
      </div>
    </section>
  );
}
