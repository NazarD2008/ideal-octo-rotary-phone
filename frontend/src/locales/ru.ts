/**
 * Russian translations (Русские переводы)
 */

export const ru = {
  common: {
    theme: 'Тема оформления',
    user: 'Пользователь',
    loading: 'Загрузка...',
    toggleTheme: 'Переключить тему',
    allRightsReserved: 'Все права защищены',
    userFallback: 'Пользователь',
    saving: 'Сохранение...',
    submit: 'Отправить',
    cancel: 'Отмена',
    edit: 'Редактировать',
    create: 'Создать',
    reset: 'Сбросить',
    delete: 'Удалить',
    save: 'Сохранить',
  },

  roles: {
    admin: 'Администратор',
    user: 'Пользователь',
    adminDescription: 'Полный доступ к системе',
    userDescription: 'Ограниченный доступ',
  },

  // navigation labels used across the header
  nav: {
    dashboard: 'Панель управления',
    devices: 'Устройства',
    users: 'Пользователи',
    builder: 'Сборка APK',
    settings: 'Настройки',
    logs: 'Журнал',
  },

  auth: {
    login: {
      username: 'Логин',
      password: 'Пароль',
      bindingKey: 'Ключ привязки',
      optional: 'Опционально',
      submit: 'Войти',
      subtitle: 'Вход в вашу учетную запись',
      usernamePlaceholder: 'Введите ваш логин',
      passwordPlaceholder: 'Введите ваш пароль',
      bindingKeyPlaceholder: 'Введите ключ (если требуется)',
      bindingKeyHint: 'Если ваша учетная запись привязана к устройству, введите ключ привязки',
      tryLater: 'Пожалуйста, попробуйте позже',
      noAccount: 'Нет учетной записи?',
      register: 'Зарегистрируйтесь',
      signingIn: 'Вход...',
      signing: 'Вход...',
      signIn: 'Войти',
      lockedOut: 'Заблокирован',
      show: 'Показать',
      hide: 'Скрыть',
    },
    validation: {
      usernameRequired: 'Введите логин',
      usernameTooShort: 'Минимум 3 символа',
      passwordRequired: 'Введите пароль',
      passwordTooShort: 'Минимум 6 символов',
    },
    password: {
      weak: 'Слабый',
      fair: 'Средний',
      good: 'Хороший',
      strong: 'Надёжный',
    },
    logout: 'Выйти',
  },

  app: {
    title: 'Консоль Лиума',
    subtitle: 'Панель управления',
    logoAlt: 'Логотип приложения',
  },

  pages: {
    dashboard: {
      welcome: 'Добро пожаловать в панель управления',
      greeting: {
        morning: 'Доброе утро, {name}!',
        afternoon: 'Добрый день, {name}!',
        evening: 'Добрый вечер, {name}!',
      },
      systemStatus: 'Состояние системы',
      systemSubtitle: 'Краткая сводка по ключевым компонентам',
      allSystemsNominal: 'Все системы в норме',
      quickSummary: 'Короткая сводка',
      quickSummaryText: 'Здесь отображаются последние показатели и быстрые ссылки для действий.',
      lastUpdate: 'Последнее обновление',
      status: 'Статус',
      active: 'Активно',
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
      fields: {
        username: 'Имя пользователя',
        email: 'Email',
        password: 'Пароль',
        role: 'Роль',
      },
      dialogs: {
        createUser: {
          title: 'Создать пользователя',
          description: 'Создайте нового пользователя и при необходимости сгенерируйте ключ привязки',
        },
        editUser: {
          title: 'Редактировать пользователя',
          description: 'Обновите информацию о пользователе',
        },
        resetPassword: {
          title: 'Сброс пароля',
          description: 'Установите новый пароль для пользователя',
          newPassword: 'Новый пароль',
          enterNewPassword: 'Введите новый пароль',
        },
        permissions: {
          title: 'Права доступа',
          description: 'Управляйте правами пользователя',
        },
      },
      badges: {
        you: 'Вы',
        primary: 'Основной',
      },
      roles: {
        admin: 'Администратор',
        user: 'Пользователь',
      },
    },
    builder: {
      title: 'Сборка APK',
      description: 'Создавайте кастомные APK для установки на устройство',
    },
    logs: {
      title: 'Журнал',
    },
  },

  dashboard: {
    stats: {
      totalDevices: 'Всего устройств',
      online: 'Онлайн',
      offline: 'Офлайн',
      totalUsers: 'Всего пользователей',
      admins: 'Администраторов',
      uptime: 'Время работы',
    },
  },

  // Errors and other strings
  users: {
    errors: {
      fetchFailed: 'Не удалось загрузить список пользователей',
      createFailed: 'Не удалось создать пользователя',
      updateFailed: 'Не удалось обновить данные пользователя',
      resetPasswordFailed: 'Не удалось сбросить пароль',
      updatePermissionsFailed: 'Не удалось обновить права',
      deleteFailed: 'Не удалось удалить пользователя',
    },
    confirm: {
      delete: 'Вы уверены, что хотите удалить этого пользователя?'
    }
  },

};

export default ru;
