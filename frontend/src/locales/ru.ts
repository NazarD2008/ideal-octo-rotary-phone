  export default {
    builder: {
      title: 'Сборщик APK',
      serverUrl: 'URL сервера',
      serverUrlHelp: 'URL вашего сервера (пример: https://example.com)',
      homePageUrl: 'Домашняя страница',
      appName: 'Название приложения',
      packageName: 'Package (идентификатор)',
      versionName: 'Версия (versionName)',
      adbBypass: 'Режим обхода ADB',
      uploadIcon: 'Загрузить иконку (PNG)',
      buildButton: 'Собрать APK',
      recentBuilds: 'Последние сборки',
      noBuilds: 'Сборок пока нет',
      progress: {
        started: 'Запущено',
        completed: 'Выполнено',
        pending: 'В очереди',
        failed: 'Ошибка',
        cancelled: 'Отменено'
      },
      actions: {
        downloadApk: 'Скачать APK',
        viewLog: 'Показать лог',
        downloadLog: 'Скачать лог',
        cancel: 'Отменить',
        retry: 'Повторить'
      },
      modal: {
        title: 'Лог сборки',
        autoscroll: 'Автопрокрутка',
        search: 'Поиск',
        download: 'Скачать лог',
        clear: 'Очистить'
      },
      table: {
        id: 'ID',
        appName: 'Приложение',
        server: 'Сервер',
        status: 'Статус',
        size: 'Размер',
        created: 'Создано',
        actions: 'Действия'
      }
    }
  
  , pages: { dashboard: { greeting: { afternoon: "������ ����, {name}" }, welcome: "����� ���������� � ������ ����������", refreshData: "�������� ������" }, devices: { title: "����������", description: "������ ������������ ���������" } }
};
