export default {
  common: {
    loading: 'Загрузка...',
    userFallback: 'Пользователь',
    saving: 'Сохранение...',
    deleting: 'Удаление...',
    uploading: 'Загрузка...',
    downloading: 'Скачивание...',
    building: 'Сборка...',
    processing: 'Обработка...',
    searching: 'Поиск...',
    refreshing: 'Обновление...',

    submit: 'Отправить',
    save: 'Сохранить',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    delete: 'Удалить',
    edit: 'Редактировать',
    create: 'Создать',
    update: 'Обновить',
    reset: 'Сбросить',
    refresh: 'Обновить',
    search: 'Поиск',
    filter: 'Фильтр',
    clear: 'Очистить',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Далее',
    previous: 'Назад',
    finish: 'Завершить',

    yes: 'Да',
    no: 'Нет',
    ok: 'ОК',

    online: 'В сети',
    offline: 'Оффлайн',

    all: 'Все',
    none: 'Нет',
    unknown: 'Неизвестно',
    actions: 'Действия',
    status: 'Статус',
  },

  nav: {
    dashboard: 'Панель управления',
    devices: 'Устройства',
    users: 'Пользователи',
    builder: 'Сборка APK',
    settings: 'Настройки',
    logs: 'Журнал',

    deviceInfo: 'Информация',
    sms: 'SMS',
    calls: 'Звонки',
    contacts: 'Контакты',
    gps: 'GPS',
    camera: 'Камера',
    mic: 'Микрофон',
    files: 'Файлы',
    wifi: 'Wi‑Fi',
    clipboard: 'Буфер обмена',
    notifications: 'Уведомления',
    permissions: 'Разрешения',
    apps: 'Приложения',
    liuma: 'Liuma',
    screen: 'Экран',
    hvnc: 'HVNC',
    keylogger: 'Кейлоггер',
    proxy: 'Прокси',
    shell: 'Терминал',
    downloads: 'Загрузки',
  },

  pages: {
    dashboard: {
      greeting: { morning: 'Доброе утро, {name}', afternoon: 'Добрый день, {name}', evening: 'Добрый вечер, {name}' },
      welcome: 'Добро пожаловать в панель управления',
      refreshData: 'Обновить данные',
    },
    devices: {
      title: 'Устройства',
      description: 'Список подключенных устройств и их состояние',
    },
    users: {
      title: 'Пользователи',
      description: 'Создавайте и управляйте учетными записями',
      addUser: 'Добавить пользователя',
      searchPlaceholder: 'Поиск по имени или email',
      noUsers: 'Пользователи не найдены',
      tryDifferentSearch: 'Попробуйте другой запрос',
      createFirstUser: 'Создайте первого пользователя',
    },
    builder: {
      title: 'Сборка APK',
      description: 'Создавайте кастомные APK для установки на устройство',
    },
  },

  dashboard: {
    stats: {
      totalDevices: 'Всего устройств',
      online: 'Онлайн',
      offline: 'Оффлайн',
      totalUsers: 'Всего пользователей',
      admins: 'Администраторов',
      uptime: 'Время работы',
    },
    systemStatus: 'Состояние системы',
    runningNormal: 'Система работает в штатном режиме',
    activeConnections: 'Активные подключения',
    memoryUsage: 'Использование памяти',
    quickActions: 'Быстрые действия',
  },

  users: {
    fields: {
      username: 'Имя пользователя',
      email: 'Email',
      password: 'Пароль',
      role: 'Роль',
    },
    dialogs: {
      createUser: { title: 'Создать пользователя', description: 'Создайте нового пользователя и при необходимости сгенерировать ключ привязки' },
      editUser: { title: 'Редактировать пользователя', description: 'Обновите информацию о пользователе' },
      resetPassword: { title: 'Сброс пароля', description: 'Установите новый пароль для пользователя', newPassword: 'Новый пароль', enterNewPassword: 'Введите новый пароль' },
      permissions: { title: 'Права доступа', description: 'Управляйте правами пользователя' },
    },
    badges: { you: 'Вы', primary: 'Основной' },
    roles: { admin: 'Администратор', user: 'Пользователь' },
    errors: {
      fetchFailed: 'Не удалось загрузить список пользователей',
      createFailed: 'Не удалось создать пользователя',
      updateFailed: 'Не удалось обновить данные пользователя',
      resetPasswordFailed: 'Не удалось сбросить пароль',
      updatePermissionsFailed: 'Не удалось обновить права',
      deleteFailed: 'Не удалось удалить пользователя',
    },
    confirm: { delete: 'Вы уверены, что хотите удалить этого пользователя?' }
  },

  builder: {
    actions: {
      downloadApk: 'Скачать APK',
      viewLog: 'Показать лог',
    }
  },

  settings: {
    profile: { title: 'Профиль', username: 'Имя пользователя', email: 'Email', saveProfile: 'Сохранить профиль' },
  },

  logs: {
    title: 'Журнал',
  },
  users: {
    errors: {
      fetchFailed: 'Не удалось загрузить список пользователей',
      createFailed: 'Не удалось создать пользователя',
      updateFailed: 'Не удалось обновить данные пользователя',
      resetPasswordFailed: 'Не удалось сбросить пароль',
      updatePermissionsFailed: 'Не удалось обновить права',
      deleteFailed: 'Не удалось удалить пользователя',
    },
    confirm: { delete: 'Вы уверены, что хотите удалить этого пользователя?' }
  }
};
