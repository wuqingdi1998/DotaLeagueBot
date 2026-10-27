import { OrganizerPasswordLoginForm } from "@/app/auth/components/OrganizerPasswordLoginForm";

export function DevelopmentLoginScreen({ returnTo }: { returnTo: string }) {
  return (
    <div className="site-shell" data-theme="dark">
      <main className="auth-page development-login">
        <section className="auth-choice-card auth-organizer-card">
          <p>DEV · Тестовый сайт</p>
          <h1>Проверка будущих обновлений</h1>
          <p>Войдите по паролю организатора. Данные и загруженные файлы здесь отдельные.</p>
          <OrganizerPasswordLoginForm returnTo={returnTo} autoFocus />
        </section>
      </main>
    </div>
  );
}
