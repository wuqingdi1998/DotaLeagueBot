import { DOTABUFF_EXTENSION_DOWNLOAD } from "@/lib/season-ranked-wins/browser-import";

export function DotabuffExtensionHelp() {
  return (
    <div className="season-dotabuff-extension-help">
      <p>Для загрузки после проверки Dotabuff установите расширение в Chrome или Edge на компьютере.</p>
      <ol>
        <li><a href={DOTABUFF_EXTENSION_DOWNLOAD} download>Скачайте расширение</a> и распакуйте архив в постоянную папку.</li>
        <li>Откройте <code>chrome://extensions</code> (в Edge — <code>edge://extensions</code>).</li>
        <li>Включите «Режим разработчика», нажмите «Загрузить распакованное расширение» и выберите эту папку.</li>
        <li>Обновите страницу лиги и снова нажмите Dotabuff.</li>
      </ol>
      <p>Расширение читает только матчи Dotabuff по вашему запросу. Пароли и данные входа остаются в браузере.</p>
    </div>
  );
}
