const LOCALE_MAP = {
  en: 'en-US',
  ru: 'ru-RU'
};

const STORAGE_KEY = 'language';

const STRINGS_EN = {
  popupTitle: 'KickClips',
  popupSubtitle: 'Browse all clips from a Kick channel',
  channelLabel: 'Channel name',
  channelPlaceholder: 'e.g. Meiweif',
  openClips: 'Open clips',
  channelRequired: 'Enter a channel name',
  channelNotFound: 'Channel "{channel}" was not found on Kick',
  channelValidating: 'Checking channel...',
  popupHint: 'Opens an extension page with the full clip list, search, sorting, and player.',
  pageClips: 'Channel clips',
  pageClipsNamed: 'Clips: {channel}',
  pageTitleNamed: 'Clips {channel} — KickClips',
  changeChannel: 'Change channel',
  refresh: 'Refresh',
  settings: 'Settings',
  language: 'Language',
  loadingClips: 'Loading clips...',
  loadingClipsChannel: 'Loading clips for {channel}...',
  loadingClipsHint: 'First clips will appear in a few seconds',
  loadingRest: 'Loading remaining clips...',
  cancel: 'Cancel',
  back: 'Back',
  forward: 'Next',
  pageInfo: 'Page {page} of {total} ({count} {clips})',
  pageInfoProgress: 'Page {page} of {total} ({loaded} of {expected} {clips})',
  channelTotalProgress: '@{login} · loaded {loaded} of {expected} {clips}',
  loadingRestProgress: 'Loaded {loaded} of {expected} clips...',
  searchPlaceholder: 'Search clips...',
  sortOldest: 'Oldest first',
  sortNewest: 'Newest first',
  sortPopular: 'Most popular',
  sortUnpopular: 'Least views',
  colNum: '#',
  colCreator: 'Username',
  colClip: 'Clip',
  colDate: 'Created',
  colViews: 'Views',
  colDuration: 'Duration',
  emptyClips: 'No clips found',
  openKick: 'Open Kick.com',
  changeChannelTitle: 'Change channel',
  channelModalPlaceholder: 'e.g. Meiweif',
  open: 'Open',
  confirmTitle: 'Confirm',
  confirmStop: 'Stop',
  clipUntitled: 'Untitled',
  quality: 'Quality',
  download: 'Download',
  downloading: 'Downloading...',
  loadingClip: 'Loading clip...',
  openOnKick: 'Open on Kick',
  watchClip: 'Watch clip',
  close: 'Close',
  trackingSince: 'Tracking since {date}',
  clipCount: 'Clips created:',
  topClip: 'Most popular clip',
  lastClip: 'Latest clip',
  viewsOnClip: '{count} views · {date}',
  channelTotal: '@{login} · {count} {clips} total',
  cancelLoadConfirm: 'Stop loading the remaining clips?',
  resumeLoadClips: 'Resume loading clips from platform',
  loadPaused: 'Loading paused · {loaded} clips loaded',
  leavePageConfirm: 'Leave site? Changes you made may not be saved.',
  noChannelInUrl: 'Add channel to the URL: ?channel=channel_name',
  loadError: 'Something went wrong while loading',
  loadCancelled: 'Loading cancelled',
  hlsUnsupported: 'HLS is not supported in this browser',
  playError: 'Could not play clip',
  loadClipError: 'Could not load clip',
  clipWord1: 'clip',
  clipWord2: 'clips',
  clipWord5: 'clips',
  minSec: '{mins} min {secs} sec',
  secOnly: '{secs} sec',
  dragPopover: 'Drag to move',
  onboardingWelcome: 'Welcome to KickClips',
  onboardingSubtitle: 'Thanks for installing. Let\'s set up a couple of things.',
  onboardingSave: 'Save and continue',
  onboardingContinue: 'Continue',
  onboardingChannelStep: 'Enter a Kick channel to browse all clips',
  analyticsLabel: 'Share anonymous analytics',
  analyticsHint: 'Helps us understand which features are used and what to improve next.',
  analyticsLearnMore: 'Learn what we collect',
  analyticsEnabled: 'Anonymous analytics enabled',
  analyticsDisabled: 'Anonymous analytics disabled',
  privacyPolicy: 'Privacy Policy',
  transparencyReport: 'Transparency report',
  langEnglish: 'English',
  langRussian: 'Russian',
  onboardingAnalyticsNote: 'This is a small indie project. Anonymous usage counters are the main feedback we have for fixing bugs and prioritizing features.',
  analyticsAnonymous: 'Anonymous',
  analyticsCountersOnly: 'Counters only',
  analyticsByConsent: 'Opt-in',
  analyticsCanDisable: 'Disable anytime'
};

const STRINGS_RU = {
  popupTitle: 'KickClips',
  popupSubtitle: 'Просматривайте все клипы канала Kick',
  channelLabel: 'Имя канала',
  channelPlaceholder: 'например, Meiweif',
  openClips: 'Открыть клипы',
  channelRequired: 'Введите имя канала',
  channelNotFound: 'Канал «{channel}» не найден на Kick',
  channelValidating: 'Проверка канала...',
  popupHint: 'Открывает страницу расширения со списком клипов, поиском, сортировкой и плеером.',
  pageClips: 'Клипы канала',
  pageClipsNamed: 'Клипы: {channel}',
  pageTitleNamed: 'Клипы {channel} — KickClips',
  changeChannel: 'Сменить канал',
  refresh: 'Обновить',
  settings: 'Настройки',
  language: 'Язык',
  loadingClips: 'Загрузка клипов...',
  loadingClipsChannel: 'Загрузка клипов канала {channel}...',
  loadingClipsHint: 'Первые клипы появятся через несколько секунд',
  loadingRest: 'Загрузка остальных клипов...',
  cancel: 'Отмена',
  back: 'Назад',
  forward: 'Далее',
  pageInfo: 'Страница {page} из {total} ({count} {clips})',
  pageInfoProgress: 'Страница {page} из {total} ({loaded} из {expected} {clips})',
  channelTotalProgress: '@{login} · загружено {loaded} из {expected} {clips}',
  loadingRestProgress: 'Загружено {loaded} из {expected} клипов...',
  searchPlaceholder: 'Поиск клипов...',
  sortOldest: 'Сначала старые',
  sortNewest: 'Сначала новые',
  sortPopular: 'Самые популярные',
  sortUnpopular: 'Меньше всего просмотров',
  colNum: '#',
  colCreator: 'Имя пользователя',
  colClip: 'Клип',
  colDate: 'Создан',
  colViews: 'Просмотры',
  colDuration: 'Длительность',
  emptyClips: 'Клипы не найдены',
  openKick: 'Открыть Kick.com',
  changeChannelTitle: 'Сменить канал',
  channelModalPlaceholder: 'например, Meiweif',
  open: 'Открыть',
  confirmTitle: 'Подтверждение',
  confirmStop: 'Остановить',
  clipUntitled: 'Без названия',
  quality: 'Качество',
  download: 'Скачать',
  downloading: 'Скачивание...',
  loadingClip: 'Загрузка клипа...',
  openOnKick: 'Открыть на Kick',
  watchClip: 'Смотреть клип',
  close: 'Закрыть',
  trackingSince: 'Отслеживается с {date}',
  clipCount: 'Клипов создано:',
  topClip: 'Самый популярный клип',
  lastClip: 'Последний клип',
  viewsOnClip: '{count} просмотров · {date}',
  channelTotal: '@{login} · всего {count} {clips}',
  cancelLoadConfirm: 'Остановить загрузку остальных клипов?',
  resumeLoadClips: 'Продолжить загрузку клипов с платформы',
  loadPaused: 'Загрузка приостановлена · загружено {loaded} клипов',
  leavePageConfirm: 'Покинуть страницу? Изменения могут не сохраниться.',
  noChannelInUrl: 'Добавьте канал в URL: ?channel=имя_канала',
  loadError: 'Что-то пошло не так при загрузке',
  loadCancelled: 'Загрузка отменена',
  hlsUnsupported: 'HLS не поддерживается в этом браузере',
  playError: 'Не удалось воспроизвести клип',
  loadClipError: 'Не удалось загрузить клип',
  clipWord1: 'клип',
  clipWord2: 'клипа',
  clipWord5: 'клипов',
  minSec: '{mins} мин {secs} сек',
  secOnly: '{secs} сек',
  dragPopover: 'Перетащите, чтобы переместить',
  onboardingWelcome: 'Добро пожаловать в KickClips',
  onboardingSubtitle: 'Спасибо за установку. Давайте настроим несколько параметров.',
  onboardingSave: 'Сохранить и продолжить',
  onboardingContinue: 'Продолжить',
  onboardingChannelStep: 'Введите канал Kick для просмотра всех клипов',
  analyticsLabel: 'Делиться анонимной аналитикой',
  analyticsHint: 'Помогает понять, какие функции используют, и что улучшать дальше.',
  analyticsLearnMore: 'Узнать, что именно мы собираем',
  analyticsEnabled: 'Анонимная аналитика включена',
  analyticsDisabled: 'Анонимная аналитика выключена',
  privacyPolicy: 'Политика конфиденциальности',
  transparencyReport: 'Отчёт о прозрачности',
  langEnglish: 'Английский',
  langRussian: 'Русский',
  onboardingAnalyticsNote: 'Это небольшой инди-проект. Анонимные счётчики использования — основная обратная связь для исправления ошибок и приоритизации функций.',
  analyticsAnonymous: 'Анонимно',
  analyticsCountersOnly: 'Только счётчики',
  analyticsByConsent: 'По согласию',
  analyticsCanDisable: 'Можно отключить в любой момент'
};

const STRINGS_BY_LANG = {
  en: STRINGS_EN,
  ru: STRINGS_RU
};

let currentLang = 'en';

export function getLanguage() {
  return currentLang;
}

export function getLocale() {
  return LOCALE_MAP[currentLang] || LOCALE_MAP.en;
}

/** @deprecated Use getLocale() — kept for existing imports */
export let LOCALE = LOCALE_MAP.en;

function normalizeLang(lang) {
  return lang === 'ru' ? 'ru' : 'en';
}

function applyLang(lang) {
  currentLang = normalizeLang(lang);
  LOCALE = LOCALE_MAP[currentLang];
  return currentLang;
}

export async function loadLanguage() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return applyLang(data[STORAGE_KEY]);
}

export async function setLanguage(lang) {
  const next = applyLang(lang);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export function t(key, vars = {}) {
  const strings = STRINGS_BY_LANG[currentLang] || STRINGS_EN;
  const template = strings[key] ?? STRINGS_EN[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : ''));
}

export function pluralizeClips(count) {
  if (currentLang === 'ru') {
    const n = Math.abs(Number(count)) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) {
      return t('clipWord5');
    }
    if (n1 === 1) {
      return t('clipWord1');
    }
    if (n1 >= 2 && n1 <= 4) {
      return t('clipWord2');
    }
    return t('clipWord5');
  }

  return Number(count) === 1 ? t('clipWord1') : t('clipWord5');
}
