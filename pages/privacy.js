const CONTENT = {
  en: {
    updated: 'Last updated: July 2026',
    transparencyLink: 'Transparency report',
    html: `
      <p>This Privacy Policy describes how <strong>Kick Clips Viewer</strong> (“KickClips”, “we”, “the extension”) handles information when you use our Chrome extension to browse Kick channel clips.</p>

      <h2>Summary</h2>
      <ul>
        <li>The extension works locally to fetch public Kick clip data.</li>
        <li>We do not ask for your Kick password or Kick account login.</li>
        <li>Optional anonymous analytics is <strong>off by default</strong> until you enable it.</li>
        <li>We may record which <strong>Kick channel slugs</strong> are used to browse clips (e.g. <code>Meiweif</code>), but not who installed the extension.</li>
      </ul>

      <h2>Information stored on your device</h2>
      <p>Using Chrome’s local storage, the extension may store:</p>
      <ul>
        <li>Your UI language preference</li>
        <li>Last channel name you entered (for convenience)</li>
        <li>Anonymous analytics preference (on/off)</li>
        <li>A random install UUID used only for anonymous counters</li>
        <li>Queued analytics counters waiting to be sent</li>
        <li>Whether onboarding was completed</li>
      </ul>
      <p>This data stays on your device unless you enable analytics and a flush is sent to our server.</p>

      <h2>Information sent to our server (optional analytics)</h2>
      <p>If you enable anonymous analytics <strong>and</strong> collection is enabled on our server, the extension sends batched counters to our analytics endpoint. This may include:</p>
      <ul>
        <li>Random install UUID</li>
        <li>Extension version</li>
        <li>UI language</li>
        <li>Event counts (popup opened, clips page opened, refresh, etc.)</li>
        <li>Kick channel slugs used to open the clips page</li>
        <li>Timestamps of batch submission</li>
      </ul>
      <p>See the <a href="transparency.html">Transparency report</a> for the full list of events and an example payload.</p>

      <h2>Information we do not collect</h2>
      <ul>
        <li>Your Kick username or identity as the person who installed the extension</li>
        <li>Email address or contact information (unless you voluntarily contact us outside the extension)</li>
        <li>Kick chat messages or stream content</li>
        <li>Passwords, cookies, or authentication tokens</li>
        <li>General browsing history outside this extension</li>
        <li>Precise device fingerprinting</li>
      </ul>

      <h2>Install counting</h2>
      <p>When you first run the extension after installation, one install event may be sent so we can measure total installs. If you later disable analytics in Settings, we stop collecting further data and your install is excluded from our visible statistics until you enable analytics again.</p>

      <h2>Legal basis and purpose</h2>
      <p>Analytics is based on your consent. We use it to measure adoption, language preferences, popular channels for clip browsing, and feature usage so we can fix bugs and prioritize improvements.</p>

      <h2>Data retention</h2>
      <p>Aggregated analytics counters may be kept for up to 12 months to compare trends across releases. If you opt out, your UUID is marked as opted out and excluded from aggregate reports.</p>

      <h2>Third parties</h2>
      <p>The extension communicates with:</p>
      <ul>
        <li><strong>Kick.com</strong> — to load public channel and clip data required for core functionality</li>
        <li><strong>Our analytics server</strong> — only if you opt in to anonymous analytics</li>
      </ul>
      <p>We do not sell your data. We do not use third-party advertising analytics SDKs.</p>

      <h2>Security</h2>
      <p>Analytics data is transmitted over HTTP to our server and stored in a private database accessible only to the project maintainer via secure server access. No public statistics dashboard is provided.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Enable or disable anonymous analytics in onboarding or Settings at any time</li>
        <li>Read the Transparency report inside the extension</li>
        <li>Uninstall the extension to remove locally stored preferences</li>
      </ul>

      <h2>Children</h2>
      <p>The extension is not directed at children under 13, and we do not knowingly collect personal information from children.</p>

      <h2>Changes</h2>
      <p>If we change what data is collected, we will update this policy and the Transparency report with a new “last updated” date.</p>

      <h2>Contact</h2>
      <p>For privacy questions, contact the extension developer through the Chrome Web Store listing support channel.</p>
    `
  },
  ru: {
    updated: 'Последнее обновление: июль 2026',
    transparencyLink: 'Отчёт о прозрачности',
    html: `
      <p>Настоящая Политика конфиденциальности описывает, как расширение <strong>Kick Clips Viewer</strong> («KickClips», «мы») обрабатывает информацию при просмотре клипов каналов Kick.</p>

      <h2>Кратко</h2>
      <ul>
        <li>Расширение локально запрашивает публичные данные клипов Kick.</li>
        <li>Мы не запрашиваем пароль или вход в аккаунт Kick.</li>
        <li>Анонимная аналитика <strong>выключена по умолчанию</strong>, пока вы её не включите.</li>
        <li>Мы можем учитывать <strong>slug каналов Kick</strong> для просмотра клипов (например, <code>Meiweif</code>), но не то, кто установил расширение.</li>
      </ul>

      <h2>Данные на вашем устройстве</h2>
      <p>В локальном хранилище Chrome расширение может сохранять:</p>
      <ul>
        <li>Язык интерфейса</li>
        <li>Последний введённый канал (для удобства)</li>
        <li>Настройку анонимной аналитики (вкл/выкл)</li>
        <li>Случайный UUID установки только для анонимных счётчиков</li>
        <li>Очередь счётчиков аналитики перед отправкой</li>
        <li>Флаг завершения онбординга</li>
      </ul>
      <p>Эти данные остаются на устройстве, пока вы не включите аналитику и не произойдёт отправка на сервер.</p>

      <h2>Данные, отправляемые на наш сервер (опционально)</h2>
      <p>Если вы включите анонимную аналитику <strong>и</strong> сбор включён на сервере, расширение отправляет пакеты счётчиков. Это может включать:</p>
      <ul>
        <li>Случайный UUID установки</li>
        <li>Версию расширения</li>
        <li>Язык интерфейса</li>
        <li>Счётчики событий (popup, страница клипов, обновление и т.д.)</li>
        <li>Slug каналов Kick, открытых для просмотра клипов</li>
        <li>Время отправки пакета</li>
      </ul>
      <p>Полный список событий и пример payload — в <a href="transparency.html">Отчёте о прозрачности</a>.</p>

      <h2>Чего мы не собираем</h2>
      <ul>
        <li>Ник Kick пользователя, установившего расширение</li>
        <li>Email или контактные данные (если вы сами не обратитесь к нам вне расширения)</li>
        <li>Сообщения чата Kick или контент стримов</li>
        <li>Пароли, cookies, токены авторизации</li>
        <li>Общую историю браузера вне расширения</li>
        <li>Точный fingerprint устройства</li>
      </ul>

      <h2>Учёт установок</h2>
      <p>При первом запуске после установки может быть отправлено одно событие установки. Если позже вы отключите аналитику в настройках, дальнейший сбор прекращается, а установка исключается из видимой статистики до повторного включения.</p>

      <h2>Цель обработки</h2>
      <p>Аналитика основана на вашем согласии. Мы используем её для оценки установок, предпочтений языка, популярных каналов и использования функций, чтобы исправлять ошибки и планировать улучшения.</p>

      <h2>Хранение</h2>
      <p>Агрегированные счётчики могут храниться до 12 месяцев. При opt-out UUID помечается как отказавшийся и исключается из отчётов.</p>

      <h2>Третьи стороны</h2>
      <ul>
        <li><strong>Kick.com</strong> — для загрузки публичных данных клипов (основная функция)</li>
        <li><strong>Наш сервер аналитики</strong> — только при включённой вами анонимной аналитике</li>
      </ul>
      <p>Мы не продаём данные и не используем рекламные SDK аналитики.</p>

      <h2>Безопасность</h2>
      <p>Данные аналитики передаются на наш сервер по HTTP и хранятся в закрытой базе, доступной только maintainer через защищённый доступ к серверу. Публичной панели статистики нет.</p>

      <h2>Ваш выбор</h2>
      <ul>
        <li>Включать и выключать аналитику при онбординге или в настройках</li>
        <li>Читать Отчёт о прозрачности внутри расширения</li>
        <li>Удалить расширение, чтобы очистить локальные настройки</li>
      </ul>

      <h2>Дети</h2>
      <p>Расширение не предназначено для детей младше 13 лет, и мы сознательно не собираем их персональные данные.</p>

      <h2>Изменения</h2>
      <p>При изменении состава данных мы обновим эту политику и Отчёт о прозрачности с новой датой.</p>

      <h2>Контакты</h2>
      <p>По вопросам конфиденциальности обращайтесь к разработчику через канал поддержки в Chrome Web Store.</p>
    `
  }
};

async function render(lang) {
  const data = CONTENT[lang] || CONTENT.en;
  document.documentElement.lang = lang;
  document.getElementById('page-title').textContent = lang === 'ru'
    ? 'Политика конфиденциальности'
    : 'Privacy Policy';
  document.getElementById('transparency-link').textContent = data.transparencyLink;
  document.getElementById('doc-content').innerHTML = data.html;
  document.getElementById('doc-updated').textContent = data.updated;

  document.querySelectorAll('.lang-btn').forEach((button) => {
    button.classList.toggle('selected', button.dataset.lang === lang);
  });

  await chrome.storage.local.set({ language: lang });
}

document.querySelectorAll('.lang-btn').forEach((button) => {
  button.addEventListener('click', () => {
    render(button.dataset.lang === 'ru' ? 'ru' : 'en');
  });
});

chrome.storage.local.get(['language']).then((data) => {
  render(data.language === 'ru' ? 'ru' : 'en');
});
