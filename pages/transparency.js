const CONTENT = {
  en: {
    updated: 'Last updated: July 2026',
    privacyLink: 'Privacy Policy',
    html: `
      <p>KickClips collects a small amount of anonymous usage data so we can understand whether the extension is useful, which language people prefer, and which Kick channels are browsed most often. We do <strong>not</strong> collect your Kick username, email, passwords, chat messages, or browsing history outside Kick-related extension pages.</p>

      <h2>What a submission looks like</h2>
      <p>The extension batches counters locally and sends one compact JSON payload when collection is enabled on both your device and our server.</p>
      <pre>{
  "id": "kick-clips-viewer",
  "v": "1.1.0",
  "uuid": "random-install-id",
  "t": 1713348192000,
  "lang": "ru",
  "analytics": true,
  "e": {
    "po": 2,
    "tp": 1,
    "cv": 1
  },
  "channels": {
    "meiweif": 1
  }
}</pre>
      <p>No page URLs, chat content, keystrokes, or device fingerprint are included.</p>

      <h2>Fields we send</h2>
      <ul>
        <li><span class="event-key">uuid</span> — random ID created on install. Not linked to your Kick account.</li>
        <li><span class="event-key">v</span> — extension version.</li>
        <li><span class="event-key">lang</span> — UI language (<code>en</code> or <code>ru</code>).</li>
        <li><span class="event-key">e</span> — integer counters for events listed below.</li>
        <li><span class="event-key">channels</span> — how many times each Kick channel slug was opened for clip browsing.</li>
      </ul>

      <h2>Events we count</h2>
      <table class="event-table">
        <thead><tr><th>Key</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td class="event-key">in</td><td>Extension installed (once per install UUID)</td></tr>
          <tr><td class="event-key">po</td><td>Popup opened</td></tr>
          <tr><td class="event-key">tp</td><td>Clips page opened</td></tr>
          <tr><td class="event-key">cv</td><td>Channel opened for clip browsing</td></tr>
          <tr><td class="event-key">rf</td><td>Refresh clicked</td></tr>
          <tr><td class="event-key">lc</td><td>Language changed</td></tr>
          <tr><td class="event-key">sc</td><td>Settings changed</td></tr>
          <tr><td class="event-key">ao</td><td>Analytics opt-in</td></tr>
          <tr><td class="event-key">ax</td><td>Analytics opt-out</td></tr>
        </tbody>
      </table>

      <h2>What we never collect</h2>
      <ul>
        <li>Your Kick login or the account that installed the extension</li>
        <li>Email, IP address stored by the extension, or contact details</li>
        <li>Chat messages, stream content, or clip playback content</li>
        <li>Passwords, cookies, or session tokens</li>
        <li>Browsing history outside this extension</li>
      </ul>

      <h2>Your choices</h2>
      <div class="doc-card">
        <p><strong>Opt-in:</strong> Anonymous analytics is off until you enable it during onboarding or in Settings.</p>
        <p><strong>Opt-out:</strong> Turn off “Share anonymous analytics” in Settings. Collection stops immediately and your install is hidden from our statistics until you enable it again.</p>
        <p><strong>Install count:</strong> We record one install event when you first run the extension. If you later opt out, that install is excluded from our visible totals.</p>
      </div>

      <h2>Where data is stored</h2>
      <p>Aggregated counters are stored in a private database on our server. There is no public dashboard. Only the project maintainer can view statistics through secure server access (SSH).</p>
    `
  },
  ru: {
    updated: 'Последнее обновление: июль 2026',
    privacyLink: 'Политика конфиденциальности',
    html: `
      <p>KickClips собирает небольшой объём анонимных данных об использовании, чтобы понимать, полезно ли расширение, какой язык интерфейса выбирают чаще и какие каналы Kick открывают для просмотра клипов. Мы <strong>не</strong> собираем ваш ник Kick, email, пароли, сообщения в чате или историю браузера вне страниц расширения.</p>

      <h2>Как выглядит отправка</h2>
      <p>Расширение накапливает счётчики локально и отправляет один компактный JSON, когда сбор включён и у вас, и на нашем сервере.</p>
      <pre>{
  "id": "kick-clips-viewer",
  "v": "1.1.0",
  "uuid": "random-install-id",
  "t": 1713348192000,
  "lang": "ru",
  "analytics": true,
  "e": {
    "po": 2,
    "tp": 1,
    "cv": 1
  },
  "channels": {
    "meiweif": 1
  }
}</pre>
      <p>URL страниц, содержимое чата, нажатия клавиш и отпечаток устройства не передаются.</p>

      <h2>Какие поля мы отправляем</h2>
      <ul>
        <li><span class="event-key">uuid</span> — случайный ID при установке. Не связан с аккаунтом Kick.</li>
        <li><span class="event-key">v</span> — версия расширения.</li>
        <li><span class="event-key">lang</span> — язык интерфейса (<code>en</code> или <code>ru</code>).</li>
        <li><span class="event-key">e</span> — целочисленные счётчики событий из таблицы ниже.</li>
        <li><span class="event-key">channels</span> — сколько раз открывали канал Kick для просмотра клипов.</li>
      </ul>

      <h2>События, которые мы считаем</h2>
      <table class="event-table">
        <thead><tr><th>Ключ</th><th>Значение</th></tr></thead>
        <tbody>
          <tr><td class="event-key">in</td><td>Установка расширения (один раз на UUID)</td></tr>
          <tr><td class="event-key">po</td><td>Открыт popup</td></tr>
          <tr><td class="event-key">tp</td><td>Открыта страница клипов</td></tr>
          <tr><td class="event-key">cv</td><td>Открыт канал для просмотра клипов</td></tr>
          <tr><td class="event-key">rf</td><td>Нажат «Обновить»</td></tr>
          <tr><td class="event-key">lc</td><td>Сменён язык</td></tr>
          <tr><td class="event-key">sc</td><td>Изменены настройки</td></tr>
          <tr><td class="event-key">ao</td><td>Включена аналитика</td></tr>
          <tr><td class="event-key">ax</td><td>Выключена аналитика</td></tr>
        </tbody>
      </table>

      <h2>Чего мы никогда не собираем</h2>
      <ul>
        <li>Ник Kick пользователя, который установил расширение</li>
        <li>Email, IP (расширением), контактные данные</li>
        <li>Сообщения чата, контент стрима или воспроизведения клипов</li>
        <li>Пароли, cookies, токены сессии</li>
        <li>Историю браузера вне этого расширения</li>
      </ul>

      <h2>Ваш выбор</h2>
      <div class="doc-card">
        <p><strong>Opt-in:</strong> Аналитика выключена, пока вы не включите её при первом запуске или в настройках.</p>
        <p><strong>Opt-out:</strong> Выключите «Делиться анонимной аналитикой» в настройках. Сбор прекращается сразу, установка скрывается из статистики, пока вы снова не включите аналитику.</p>
        <p><strong>Установка:</strong> При первом запуске фиксируется одно событие установки. При последующем отказе оно исключается из видимой статистики.</p>
      </div>

      <h2>Где хранятся данные</h2>
      <p>Агрегированные счётчики хранятся в закрытой базе на нашем сервере. Публичной панели нет. Статистику видит только maintainer через защищённый доступ к серверу (SSH).</p>
    `
  }
};

async function render(lang) {
  const data = CONTENT[lang] || CONTENT.en;
  document.documentElement.lang = lang;
  document.getElementById('page-title').textContent = lang === 'ru'
    ? 'Отчёт о прозрачности'
    : 'Transparency report';
  document.getElementById('privacy-link').textContent = data.privacyLink;
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
