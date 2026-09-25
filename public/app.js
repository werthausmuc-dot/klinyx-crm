(function () {
  "use strict";

  /* ============ constants ============ */
  var SERVICE_TYPES = [
    "Генеральне прибирання",
    "Підтримуюче прибирання",
    "Прибирання після ремонту",
    "Миття вікон",
    "Хімчистка м'яких меблів",
    "Прибирання офісу / комерційного приміщення",
    "Прибирання ресторану / бару",
    "Інше"
  ];
  var UNITS = ["л", "кг", "шт", "уп"];
  var DOW = {
    uk: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
    de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    ar: ["اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت", "أحد"]
  };
  var MONTHS = {
    uk: ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"],
    de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
  };
  var POLL_MS = 20000;

  /* ============ i18n ============ */
  // Runtime UA/DE translation. Rather than introducing separate translation
  // keys throughout the codebase, t() looks the ORIGINAL Ukrainian string up
  // directly in I18N_DE and returns the German version when state.lang is
  // "de" (falling back to the Ukrainian text itself for anything missing).
  // Values that are also stored data (SERVICE_TYPES, UNITS, job/client/etc.
  // status codes) keep their Ukrainian <option value> / stored value — only
  // the on-screen label is translated — so switching language never changes
  // what's saved in the database.
  var I18N_DE = {
    "Адміністратор": "Administrator", "Співробітник": "Mitarbeiter",
    "адмін": "Admin", "співробітник": "Mitarbeiter", "активний": "aktiv", "вимкнено": "deaktiviert",
    "підключено": "verbunden", "не підключено": "nicht verbunden",
    "Сповіщення в Telegram": "Telegram-Benachrichtigungen", "Завантаження...": "Wird geladen...",
    "Telegram-бот ще не налаштований адміністратором сервера. Зверніться до того, хто розгортав CRM.": "Der Telegram-Bot wurde vom Server-Administrator noch nicht eingerichtet. Wenden Sie sich an die Person, die das CRM aufgesetzt hat.",
    "✅ Ваш акаунт під'єднано — сповіщення про призначені завдання приходитимуть у Telegram.": "✅ Ihr Konto ist verbunden — Benachrichtigungen zu zugewiesenen Aufträgen kommen jetzt per Telegram.",
    "Під'єднати інший Telegram / переприв'язати": "Anderen Telegram-Account verbinden / neu verknüpfen",
    "Щоб перепідключити на інший Telegram-акаунт, надішліть боту новий код нижче — щойно він це отримає, старий зв'язок заміниться новим.": "Um zu einem anderen Telegram-Account zu wechseln, senden Sie dem Bot den untenstehenden neuen Code — sobald er ihn erhält, ersetzt er die alte Verknüpfung.",
    "Натисніть кнопку нижче — відкриється Telegram і бот сам вас під'єднає.": "Klicken Sie auf die Schaltfläche unten — Telegram öffnet sich und der Bot verbindet Sie automatisch.",
    "Під'єднати Telegram": "Telegram verbinden",
    "Або вручну: напишіть боту": "Oder manuell: Schreiben Sie dem Bot",
    " команду:": " den Befehl:",
    "Новий код": "Neuer Code",
    "Новий код згенеровано — надішліть його боту в Telegram": "Neuer Code wurde generiert — senden Sie ihn dem Bot in Telegram",
    "Не вдалося створити акаунт": "Konto konnte nicht erstellt werden",
    "Не вдалося увійти": "Anmeldung fehlgeschlagen",
    "Сталася помилка": "Ein Fehler ist aufgetreten",
    "Не вдалося оновити дані": "Daten konnten nicht aktualisiert werden",
    "(клієнт видалений)": "(Kunde gelöscht)",
    "заплановано": "geplant", "виконано": "erledigt", "скасовано": "storniert",
    "лід": "Lead", "неактивний": "inaktiv",
    "прострочено": "überfällig", "неоплачено": "unbezahlt", "оплачено": "bezahlt", "не оплачено": "nicht bezahlt",
    " (оплачено ": " (bezahlt: ",
    "На цей день ще немає пунктів плану.": "Für diesen Tag gibt es noch keine Planpunkte.",
    "Позначити не виконано": "Als nicht erledigt markieren", "Позначити виконано": "Als erledigt markieren",
    "Видалити пункт": "Punkt löschen",
    "План на ": "Plan für ", " (сьогодні)": " (heute)",
    " — завдання": " — Aufträge", "Найближчі завдання": "Nächste Aufträge",
    "Немає запланованих завдань": "Keine geplanten Aufträge", " на цей день": " an diesem Tag",
    "завдання": "Auftrag", "Прострочено: ": "Überfällig: ",
    "Нічого термінового — усе під контролем.": "Nichts Dringendes — alles unter Kontrolle.",
    "Позначити оплаченим": "Als bezahlt markieren", "Скасувати оплату": "Zahlung stornieren",
    "Рахунок позначено оплаченим": "Rechnung als bezahlt markiert",
    "Видалити цей рахунок?": "Diese Rechnung löschen?", "Рахунок видалено": "Rechnung gelöscht",
    "Клієнт": "Kunde", "Опис": "Beschreibung", "Сума": "Betrag", "Термін оплати": "Zahlungsziel",
    "Статус": "Status", "Дата створення": "Erstellungsdatum",
    "(ви)": "(Sie)", "Скинути пароль": "Passwort zurücksetzen",
    "Прибрати адміна": "Admin-Rechte entziehen", "Зробити адміном": "Zum Admin machen",
    "Вимкнути": "Deaktivieren", "Увімкнути": "Aktivieren",
    "Новий пароль для цього співробітника (мінімум 8 символів):": "Neues Passwort für diesen Mitarbeiter (mindestens 8 Zeichen):",
    "Пароль оновлено": "Passwort aktualisiert",
    "Призначити ": "Soll ", " адміністратором?": " zum Administrator gemacht werden?",
    "Прибрати права адміністратора в ": "Admin-Rechte entziehen für ", "?": "?",
    "Роль оновлено": "Rolle aktualisiert", "Статус оновлено": "Status aktualisiert",
    "Видалити цей обліковий запис?": "Dieses Konto löschen?", "Акаунт видалено": "Konto gelöscht",
    "в процесі": "in Arbeit", "готово": "erledigt",
    "← заплановано": "← geplant", "готово →": "erledigt →",
    "Редагувати пункт": "Punkt bearbeiten", "Новий пункт плану": "Neuer Planpunkt",
    "Назва *": "Name *", "Напр. Клієнтський портал": "Z. B. Kundenportal",
    "Коротко, що це і навіщо": "Kurz: was und wofür",
    "Заплановано": "Geplant", "В процесі": "In Arbeit", "Готово": "Erledigt",
    "Видалити": "Löschen", "Зберегти": "Speichern", "Вкажіть назву": "Bitte Namen angeben",
    "Пункт оновлено": "Punkt aktualisiert", "Пункт додано": "Punkt hinzugefügt",
    "Пункт видалено": "Punkt gelöscht",
    "Рекомендованих платформ ще немає.": "Noch keine empfohlenen Plattformen.",
    "Платформ ще немає — додай першу кнопкою вище.": "Noch keine Plattformen — fügen Sie oben die erste hinzu.",
    "Редагувати": "Bearbeiten",
    "Позначити ": "Als ", "Виконано": "Erledigt", "Не виконано": "Nicht erledigt",
    "Нотатка для себе...": "Notiz für sich selbst...", "Нове завдання...": "Neue Aufgabe...",
    "Додати": "Hinzufügen", "Відкрити": "Öffnen", "Додати платформу": "Plattform hinzufügen",
    "Записів ще немає.": "Noch keine Einträge.", "Видалити запис": "Eintrag löschen",
    "Немає історії.": "Keine Historie.",
    "Завдань ще немає.": "Noch keine Aufgaben.", "Історія статусу": "Statusverlauf",
    "Видалити завдання": "Aufgabe löschen",
    " Завдання": " Aufgaben",
    "Редагувати платформу": "Plattform bearbeiten", "Нова платформа": "Neue Plattform",
    "Напр. Helpling": "Z. B. Helpling", "Посилання *": "Link *",
    "Завдання": "Aufgaben", "Нове завдання, напр. «Реєстрація»": "Neue Aufgabe, z. B. «Registrierung»",
    "Нотатки": "Notizen", "Додати запис, напр. «Зареєструвався», «3 замовлення»": "Neuer Eintrag, z. B. «Registriert», «3 Aufträge»",
    "Нотатка": "Notiz", "Коротко, навіщо (необов'язково)": "Kurz, wofür (optional)",
    "Реєстрацію вже виконано": "Registrierung bereits erledigt",
    "Вкажіть посилання": "Bitte Link angeben",
    "Платформу оновлено": "Plattform aktualisiert", "Платформу додано": "Plattform hinzugefügt",
    "Платформу видалено": "Plattform gelöscht",
    "Редагувати клієнта": "Kunde bearbeiten", "Новий клієнт": "Neuer Kunde",
    "Ім'я / назва *": "Name / Bezeichnung *", "Напр. Анна Шмідт": "Z. B. Anna Schmidt",
    "Телефон": "Telefon", "Адреса": "Adresse", "Вулиця, місто": "Straße, Ort",
    "Особливості об'єкта, домовленості...": "Besonderheiten des Objekts, Vereinbarungen...",
    "Видалити клієнта": "Kunde löschen", "Додати клієнта": "Kunde hinzufügen",
    "Видалити клієнта \"": "Kunden \"", "\"? Пов'язані завдання й рахунки залишаться в системі.": "\" löschen? Zugehörige Aufträge und Rechnungen bleiben im System erhalten.",
    "Видалити товар \"": "Artikel \"", "\" зі складу? Історію списань буде збережено.": "\" aus dem Lager löschen? Der Verlauf der Entnahmen bleibt erhalten.",
    "Видалити пункт \"": "Punkt \"", "\" з плану розвитку?": "\" aus dem Plan löschen?",
    " віджет \"": " das Widget \"",
    "Вкажіть ім'я клієнта": "Bitte Kundennamen angeben",
    "Клієнта оновлено": "Kunde aktualisiert", "Клієнта додано": "Kunde hinzugefügt",
    "Клієнта видалено": "Kunde gelöscht",
    "Контакти": "Kontakte", "+ Додати": "+ Hinzufügen",
    "Ще немає завдань": "Noch keine Aufträge", "Рахунки": "Rechnungen",
    "Ще немає рахунків": "Noch keine Rechnungen",
    "Редагувати завдання": "Auftrag bearbeiten", "Нове завдання": "Neuer Auftrag",
    "Клієнт *": "Kunde *", "Дата *": "Datum *", "Час": "Uhrzeit", "Тип послуги": "Leistungsart",
    "Адреса об'єкта": "Adresse des Objekts", "Вартість, €": "Preis, €", "Виконавець": "Ausführende(r)",
    "— не призначено —": "— nicht zugewiesen —", " (адмін)": " (Admin)", " · без Telegram": " · ohne Telegram",
    "\"· без Telegram\" — сповіщення про призначення не дійде, доки людина не під'єднає бота.": "„· ohne Telegram“ — die Zuweisungs-Benachrichtigung kommt erst an, wenn die Person den Bot verbindet.",
    "Оплата": "Zahlung", "не повторюється": "wiederholt sich nicht",
    "щотижня": "wöchentlich", "що 2 тижні": "alle 2 Wochen", "щомісяця": "monatlich",
    "Повторення": "Wiederholung",
    "Повторювати до (необов'язково)": "Wiederholen bis (optional)",
    "Наступні дати з'являться автоматично (наперед приблизно на 2 місяці). Про кожну згенеровану дату Telegram-сповіщення не надсилається — тільки про перше створене завдання.": "Die nächsten Termine erscheinen automatisch (ca. 2 Monate im Voraus). Für jeden automatisch erzeugten Termin wird keine Telegram-Benachrichtigung gesendet — nur für den zuerst erstellten Auftrag.",
    "Вкажіть дату": "Bitte Datum angeben",
    "Завдання оновлено": "Auftrag aktualisiert", "Завдання заплановано": "Auftrag geplant",
    "Видалити це завдання?": "Diesen Auftrag löschen?", "Завдання видалено": "Auftrag gelöscht",
    "Редагувати рахунок": "Rechnung bearbeiten", "Новий рахунок": "Neue Rechnung",
    "Сума, € *": "Betrag, € *", "Дата виставлення": "Ausstellungsdatum",
    "Напр. Генеральне прибирання, вул. ...": "Z. B. Grundreinigung, Straße ...",
    "Вкажіть суму": "Bitte Betrag angeben",
    "Рахунок оновлено": "Rechnung aktualisiert", "Рахунок створено": "Rechnung erstellt",
    "Списати": "Verbrauchen", "Поповнити": "Auffüllen",
    "Не вдалося прочитати зображення": "Bild konnte nicht gelesen werden",
    "Редагувати товар": "Artikel bearbeiten", "Новий товар": "Neuer Artikel",
    "Напр. Засіб для скла": "Z. B. Glasreiniger", "Одиниця виміру": "Maßeinheit",
    "Початковий залишок": "Anfangsbestand",
    "Мінімальний залишок (поріг попередження)": "Mindestbestand (Warnschwelle)",
    "Інвентарний номер": "Inventarnummer", "Напр. INV-001": "Z. B. INV-001",
    "Фото товару": "Artikelfoto", "Видалити фото": "Foto löschen",
    "Вкажіть назву товару": "Bitte Artikelnamen angeben",
    "Товар оновлено": "Artikel aktualisiert", "Товар додано": "Artikel hinzugefügt",
    "Товар видалено": "Artikel gelöscht",
    "— не пов'язано із завданням —": "— keinem Auftrag zugeordnet —",
    "Списати: ": "Verbrauchen: ", "Поповнити: ": "Auffüllen: ",
    "Поточний залишок: ": "Aktueller Bestand: ",
    "Кількість (": "Menge (", ") *": ") *",
    "Напр. причина, партія...": "Z. B. Grund, Charge...",
    "Додати на склад": "Zum Lager hinzufügen",
    "Вкажіть кількість більше нуля": "Bitte eine Menge größer als null angeben",
    "Списано зі складу": "Vom Lager abgebucht", "Склад поповнено": "Lager aufgefüllt",
    "Інформація": "Informationen", "Інв. номер": "Inv.-Nr.", "Залишок": "Bestand",
    "Мінімальний залишок": "Mindestbestand", "Історія": "Historie",
    "Ще немає записів.": "Noch keine Einträge.",
    "Списано": "Abgebucht", "Поповнено": "Aufgefüllt", "Коригування": "Korrektur",
    "Не вдалося завантажити історію.": "Historie konnte nicht geladen werden.",
    "Новий співробітник": "Neuer Mitarbeiter", "Ім'я": "Name", "Напр. Марія": "Z. B. Maria",
    "Логін *": "Login *", "Пароль *": "Passwort *", "Мінімум 8 символів": "Mindestens 8 Zeichen",
    "Роль": "Rolle", "Створити": "Erstellen",
    "Заповніть логін і пароль": "Bitte Login und Passwort ausfüllen",
    "Співробітника додано": "Mitarbeiter hinzugefügt",
    // service types & units — display only; stored values stay Ukrainian
    "Генеральне прибирання": "Grundreinigung", "Підтримуюче прибирання": "Unterhaltsreinigung",
    "Прибирання після ремонту": "Reinigung nach Renovierung", "Миття вікон": "Fensterreinigung",
    "Хімчистка м'яких меблів": "Polsterreinigung",
    "Прибирання офісу / комерційного приміщення": "Büro-/Gewerbereinigung",
    "Прибирання ресторану / бару": "Reinigung von Restaurant/Bar", "Інше": "Sonstiges",
    "л": "l", "кг": "kg", "шт": "Stk", "уп": "Pck",
    // static index.html strings (applied via data-i18n / data-i18n-placeholder / data-i18n-title)
    "Перший запуск": "Erste Einrichtung",
    "Створіть обліковий запис адміністратора": "Administratorkonto erstellen",
    "Це буде перший акаунт у системі — з нього ви зможете додавати облікові записи для співробітників.": "Dies ist das erste Konto im System — von hier aus können Sie Konten für Mitarbeiter anlegen.",
    "Ваше ім'я": "Ihr Name", "Напр. Олег": "Z. B. Oleg", "Логін": "Login", "Пароль": "Passwort",
    "Створити й увійти": "Erstellen und anmelden",
    "Вхід у систему": "Anmeldung", "Вхід": "Anmeldung",
    "Увійдіть під своїм робочим логіном.": "Melden Sie sich mit Ihrem Arbeitslogin an.",
    "Увійти": "Anmelden",
    "Меню": "Menü", "CRM & календар": "CRM & Kalender", "Закрити меню": "Menü schließen",
    "Дашборд": "Dashboard", "Клієнти": "Kunden", "Склад": "Lager", "Команда": "Team",
    "План розвитку": "Entwicklungsplan", "Замовлення": "Aufträge", "Вийти": "Abmelden",
    "Клієнтів усього": "Kunden gesamt", "Завдань цього тижня": "Aufträge diese Woche",
    "Сьогодні заплановано": "Heute geplant", "Неоплачено": "Unbezahlt",
    "Орієнтовний заробіток за місяць": "Geschätztes Monatseinkommen",
    "Календар завдань": "Auftragskalender", "План на день": "Plan für den Tag",
    "Напр. Подзвонити постачальнику...": "Z. B. Lieferanten anrufen...",
    "Потребують уваги": "Erfordert Aufmerksamkeit", "Фінансові підсумки": "Finanzübersicht",
    "Цей тиждень": "Diese Woche", "Цей місяць": "Dieser Monat",
    "Клієнтська база Kliny X": "Kundendatenbank von Kliny X",
    "Пошук за ім'ям, телефоном, адресою...": "Suche nach Name, Telefon, Adresse...",
    "Усі": "Alle", "Ліди": "Leads", "Активні": "Aktiv", "Неактивні": "Inaktiv",
    "Наступне завдання": "Nächster Auftrag",
    "Клієнтів ще немає. Додайте першого клієнта, щоб почати вести базу.": "Noch keine Kunden. Fügen Sie den ersten Kunden hinzu, um die Datenbank zu starten.",
    "Оплати та виставлені рахунки": "Zahlungen und ausgestellte Rechnungen",
    "Експорт CSV": "CSV exportieren", "Виставити рахунок": "Rechnung ausstellen",
    "Виставлено всього": "Gesamt ausgestellt", "Оплачено": "Bezahlt",
    "Неоплачені": "Unbezahlt", "Прострочені": "Überfällig", "Оплачені": "Bezahlt",
    "Рахунків ще немає.": "Noch keine Rechnungen.",
    "Облік хімії та витратних матеріалів": "Verwaltung von Reinigungsmitteln und Verbrauchsmaterial",
    "Додати товар": "Artikel hinzufügen", "Товар": "Artikel", "Мін. залишок": "Mindestbestand",
    "Товарів ще немає. Додайте перший, щоб почати облік хімії.": "Noch keine Artikel. Fügen Sie den ersten hinzu, um die Lagerverwaltung zu starten.",
    "Облікові записи співробітників для входу в систему": "Mitarbeiterkonten für die Systemanmeldung",
    "Додати співробітника": "Mitarbeiter hinzufügen",
    "Що вже готово в Kliny X CRM і що далі": "Was in Kliny X CRM bereits fertig ist und was als Nächstes kommt",
    "Додати пункт": "Punkt hinzufügen",
    "Плану розвитку ще немає.": "Noch kein Entwicklungsplan.",
    "Швидкий перехід на платформи, де шукаємо замовлення": "Schnellzugriff auf Plattformen, auf denen wir Aufträge suchen",
    "Додані вручну": "Manuell hinzugefügt", "Рекомендовані (авто)": "Empfohlen (automatisch)"
  };
  var I18N = {
    de: I18N_DE,
    ar: {
      "Адміністратор": "المسؤول",
      "Співробітник": "الموظف",
      "адмін": "مسؤول",
      "співробітник": "موظف",
      "активний": "نشط",
      "вимкнено": "معطّل",
      "підключено": "متصل",
      "не підключено": "غير متصل",
      "Сповіщення в Telegram": "إشعارات تيليجرام",
      "Завантаження...": "جارٍ التحميل...",
      "Telegram-бот ще не налаштований адміністратором сервера. Зверніться до того, хто розгортав CRM.": "لم يقم مسؤول الخادم بإعداد بوت تيليجرام بعد. يرجى التواصل مع من قام بنشر نظام CRM.",
      "✅ Ваш акаунт під'єднано — сповіщення про призначені завдання приходитимуть у Telegram.": "✅ تم ربط حسابك — ستصلك إشعارات المهام المسندة إليك عبر تيليجرام.",
      "Під'єднати інший Telegram / переприв'язати": "ربط حساب تيليجرام آخر / إعادة الربط",
      "Щоб перепідключити на інший Telegram-акаунт, надішліть боту новий код нижче — щойно він це отримає, старий зв'язок заміниться новим.": "للتبديل إلى حساب تيليجرام آخر، أرسل للبوت الرمز الجديد أدناه — بمجرد استلامه سيحل الرابط الجديد محل القديم.",
      "Натисніть кнопку нижче — відкриється Telegram і бот сам вас під'єднає.": "اضغط على الزر أدناه — سيفتح تيليجرام وسيقوم البوت بربط حسابك تلقائيًا.",
      "Під'єднати Telegram": "ربط تيليجرام",
      "Або вручну: напишіть боту": "أو يدويًا: أرسل للبوت",
      " команду:": " الأمر:",
      "Новий код": "رمز جديد",
      "Новий код згенеровано — надішліть його боту в Telegram": "تم إنشاء رمز جديد — أرسله إلى البوت في تيليجرام",
      "Не вдалося створити акаунт": "تعذّر إنشاء الحساب",
      "Не вдалося увійти": "تعذّر تسجيل الدخول",
      "Сталася помилка": "حدث خطأ",
      "Не вдалося оновити дані": "تعذّر تحديث البيانات",
      "(клієнт видалений)": "(تم حذف العميل)",
      "заплановано": "مجدول",
      "виконано": "منجز",
      "скасовано": "ملغى",
      "лід": "عميل محتمل",
      "неактивний": "غير نشط",
      "прострочено": "متأخر",
      "неоплачено": "غير مدفوع",
      "оплачено": "مدفوع",
      "не оплачено": "غير مدفوع",
      " (оплачено ": " (مدفوع ",
      "На цей день ще немає пунктів плану.": "لا توجد بنود في الخطة لهذا اليوم بعد.",
      "Позначити не виконано": "تعليم كغير منجز",
      "Позначити виконано": "تعليم كمنجز",
      "Видалити пункт": "حذف البند",
      "План на ": "خطة يوم ",
      " (сьогодні)": " (اليوم)",
      " — завдання": " — المهام",
      "Найближчі завдання": "المهام القادمة",
      "Немає запланованих завдань": "لا توجد مهام مجدولة",
      " на цей день": " لهذا اليوم",
      "завдання": "مهمة",
      "Прострочено: ": "متأخر: ",
      "Нічого термінового — усе під контролем.": "لا شيء عاجل — كل شيء تحت السيطرة.",
      "Позначити оплаченим": "تعليم كمدفوع",
      "Скасувати оплату": "إلغاء الدفع",
      "Рахунок позначено оплаченим": "تم تعليم الفاتورة كمدفوعة",
      "Видалити цей рахунок?": "حذف هذه الفاتورة؟",
      "Рахунок видалено": "تم حذف الفاتورة",
      "Клієнт": "العميل",
      "Опис": "الوصف",
      "Сума": "المبلغ",
      "Термін оплати": "موعد الاستحقاق",
      "Статус": "الحالة",
      "Дата створення": "تاريخ الإنشاء",
      "(ви)": "(أنت)",
      "Скинути пароль": "إعادة تعيين كلمة المرور",
      "Прибрати адміна": "إزالة صلاحيات المسؤول",
      "Зробити адміном": "منح صلاحيات المسؤول",
      "Вимкнути": "تعطيل",
      "Увімкнути": "تفعيل",
      "Новий пароль для цього співробітника (мінімум 8 символів):": "كلمة مرور جديدة لهذا الموظف (8 أحرف على الأقل):",
      "Пароль оновлено": "تم تحديث كلمة المرور",
      "Призначити ": "هل تريد تعيين ",
      " адміністратором?": " مسؤولاً؟",
      "Прибрати права адміністратора в ": "إزالة صلاحيات المسؤول عن ",
      "?": "؟",
      "Роль оновлено": "تم تحديث الدور",
      "Статус оновлено": "تم تحديث الحالة",
      "Видалити цей обліковий запис?": "حذف هذا الحساب؟",
      "Акаунт видалено": "تم حذف الحساب",
      "в процесі": "قيد التنفيذ",
      "готово": "مكتمل",
      "← заплановано": "← مخطط",
      "готово →": "مكتمل →",
      "Редагувати пункт": "تعديل البند",
      "Новий пункт плану": "بند خطة جديد",
      "Назва *": "الاسم *",
      "Напр. Клієнтський портал": "مثال: بوابة العملاء",
      "Коротко, що це і навіщо": "وصف موجز: ما هذا ولماذا",
      "Заплановано": "مخطط",
      "В процесі": "قيد التنفيذ",
      "Готово": "مكتمل",
      "Видалити": "حذف",
      "Зберегти": "حفظ",
      "Вкажіть назву": "يرجى إدخال الاسم",
      "Пункт оновлено": "تم تحديث البند",
      "Пункт додано": "تمت إضافة البند",
      "Пункт видалено": "تم حذف البند",
      "Рекомендованих платформ ще немає.": "لا توجد منصات موصى بها بعد.",
      "Платформ ще немає — додай першу кнопкою вище.": "لا توجد منصات بعد — أضف الأولى بالزر أعلاه.",
      "Редагувати": "تعديل",
      "Позначити ": "تعليم ",
      "Виконано": "منجز",
      "Не виконано": "غير منجز",
      "Нотатка для себе...": "ملاحظة لنفسك...",
      "Нове завдання...": "مهمة جديدة...",
      "Додати": "إضافة",
      "Відкрити": "فتح",
      "Додати платформу": "إضافة منصة",
      "Записів ще немає.": "لا توجد سجلات بعد.",
      "Видалити запис": "حذف السجل",
      "Немає історії.": "لا يوجد سجل.",
      "Завдань ще немає.": "لا توجد مهام بعد.",
      "Історія статусу": "سجل الحالة",
      "Видалити завдання": "حذف المهمة",
      " Завдання": " المهام",
      "Редагувати платформу": "تعديل المنصة",
      "Нова платформа": "منصة جديدة",
      "Напр. Helpling": "مثال: Helpling",
      "Посилання *": "الرابط *",
      "Завдання": "المهام",
      "Нове завдання, напр. «Реєстрація»": "مهمة جديدة، مثال «التسجيل»",
      "Нотатки": "الملاحظات",
      "Додати запис, напр. «Зареєструвався», «3 замовлення»": "أضف سجلاً، مثال «تم التسجيل»، «3 طلبات»",
      "Нотатка": "ملاحظة",
      "Коротко, навіщо (необов'язково)": "باختصار، لماذا (اختياري)",
      "Реєстрацію вже виконано": "تم التسجيل بالفعل",
      "Вкажіть посилання": "يرجى إدخال الرابط",
      "Платформу оновлено": "تم تحديث المنصة",
      "Платформу додано": "تمت إضافة المنصة",
      "Платформу видалено": "تم حذف المنصة",
      "Редагувати клієнта": "تعديل العميل",
      "Новий клієнт": "عميل جديد",
      "Ім'я / назва *": "الاسم *",
      "Напр. Анна Шмідт": "مثال: آنا شميدت",
      "Телефон": "الهاتف",
      "Адреса": "العنوان",
      "Вулиця, місто": "الشارع، المدينة",
      "Особливості об'єкта, домовленості...": "خصائص المكان، الاتفاقات...",
      "Видалити клієнта": "حذف العميل",
      "Додати клієнта": "إضافة عميل",
      "Видалити клієнта \"": "حذف العميل \"",
      "\"? Пов'язані завдання й рахунки залишаться в системі.": "\"؟ ستبقى المهام والفواتير المرتبطة في النظام.",
      "Видалити товар \"": "حذف الصنف \"",
      "\" зі складу? Історію списань буде збережено.": "\" من المخزون؟ سيتم الاحتفاظ بسجل السحوبات.",
      "Видалити пункт \"": "حذف البند \"",
      "\" з плану розвитку?": "\" من خطة التطوير؟",
      " віджет \"": " الودجت \"",
      "Вкажіть ім'я клієнта": "يرجى إدخال اسم العميل",
      "Клієнта оновлено": "تم تحديث بيانات العميل",
      "Клієнта додано": "تمت إضافة العميل",
      "Клієнта видалено": "تم حذف العميل",
      "Контакти": "جهات الاتصال",
      "+ Додати": "+ إضافة",
      "Ще немає завдань": "لا توجد مهام بعد",
      "Рахунки": "الفواتير",
      "Ще немає рахунків": "لا توجد فواتير بعد",
      "Редагувати завдання": "تعديل المهمة",
      "Нове завдання": "مهمة جديدة",
      "Клієнт *": "العميل *",
      "Дата *": "التاريخ *",
      "Час": "الوقت",
      "Тип послуги": "نوع الخدمة",
      "Адреса об'єкта": "عنوان الموقع",
      "Вартість, €": "التكلفة، €",
      "Виконавець": "المنفذ",
      "— не призначено —": "— غير مسند —",
      " (адмін)": " (مسؤول)",
      " · без Telegram": " · بدون تيليجرام",
      "\"· без Telegram\" — сповіщення про призначення не дійде, доки людина не під'єднає бота.": "«· بدون تيليجرام» — لن يصل إشعار التعيين حتى يقوم الشخص بربط البوت.",
      "Оплата": "الدفع",
      "не повторюється": "لا يتكرر",
      "щотижня": "أسبوعيًا",
      "що 2 тижні": "كل أسبوعين",
      "щомісяця": "شهريًا",
      "Повторення": "التكرار",
      "Повторювати до (необов'язково)": "التكرار حتى (اختياري)",
      "Наступні дати з'являться автоматично (наперед приблизно на 2 місяці). Про кожну згенеровану дату Telegram-сповіщення не надсилається — тільки про перше створене завдання.": "ستظهر التواريخ التالية تلقائيًا (لمدة شهرين تقريبًا مقدمًا). لا يُرسل إشعار تيليجرام عن كل تاريخ يتم إنشاؤه — فقط عن أول مهمة تُنشأ.",
      "Вкажіть дату": "يرجى إدخال التاريخ",
      "Завдання оновлено": "تم تحديث المهمة",
      "Завдання заплановано": "تمت جدولة المهمة",
      "Видалити це завдання?": "حذف هذه المهمة؟",
      "Завдання видалено": "تم حذف المهمة",
      "Редагувати рахунок": "تعديل الفاتورة",
      "Новий рахунок": "فاتورة جديدة",
      "Сума, € *": "المبلغ، € *",
      "Дата виставлення": "تاريخ الإصدار",
      "Напр. Генеральне прибирання, вул. ...": "مثال: تنظيف عام، شارع ...",
      "Вкажіть суму": "يرجى إدخال المبلغ",
      "Рахунок оновлено": "تم تحديث الفاتورة",
      "Рахунок створено": "تم إنشاء الفاتورة",
      "Списати": "سحب",
      "Поповнити": "تعبئة",
      "Не вдалося прочитати зображення": "تعذّرت قراءة الصورة",
      "Редагувати товар": "تعديل الصنف",
      "Новий товар": "صنف جديد",
      "Напр. Засіб для скла": "مثال: منظف الزجاج",
      "Одиниця виміру": "وحدة القياس",
      "Початковий залишок": "الرصيد الأولي",
      "Мінімальний залишок (поріг попередження)": "الحد الأدنى للمخزون (عتبة التنبيه)",
      "Інвентарний номер": "رقم الجرد",
      "Напр. INV-001": "مثال: INV-001",
      "Фото товару": "صورة الصنف",
      "Видалити фото": "حذف الصورة",
      "Вкажіть назву товару": "يرجى إدخال اسم الصنف",
      "Товар оновлено": "تم تحديث الصنف",
      "Товар додано": "تمت إضافة الصنف",
      "Товар видалено": "تم حذف الصنف",
      "— не пов'язано із завданням —": "— غير مرتبط بمهمة —",
      "Списати: ": "سحب: ",
      "Поповнити: ": "تعبئة: ",
      "Поточний залишок: ": "الرصيد الحالي: ",
      "Кількість (": "الكمية (",
      ") *": ") *",
      "Напр. причина, партія...": "مثال: السبب، الدفعة...",
      "Додати на склад": "إضافة إلى المخزون",
      "Вкажіть кількість більше нуля": "يرجى إدخال كمية أكبر من صفر",
      "Списано зі складу": "تم السحب من المخزون",
      "Склад поповнено": "تمت تعبئة المخزون",
      "Інформація": "المعلومات",
      "Інв. номер": "رقم الجرد",
      "Залишок": "الرصيد",
      "Мінімальний залишок": "الحد الأدنى للمخزون",
      "Історія": "السجل",
      "Ще немає записів.": "لا توجد سجلات بعد.",
      "Списано": "مسحوب",
      "Поповнено": "معبّأ",
      "Коригування": "تعديل",
      "Не вдалося завантажити історію.": "تعذّر تحميل السجل.",
      "Новий співробітник": "موظف جديد",
      "Ім'я": "الاسم",
      "Напр. Марія": "مثال: ماريا",
      "Логін *": "اسم المستخدم *",
      "Пароль *": "كلمة المرور *",
      "Мінімум 8 символів": "8 أحرف على الأقل",
      "Роль": "الدور",
      "Створити": "إنشاء",
      "Заповніть логін і пароль": "يرجى إدخال اسم المستخدم وكلمة المرور",
      "Співробітника додано": "تمت إضافة الموظف",
      "Генеральне прибирання": "تنظيف عام",
      "Підтримуюче прибирання": "تنظيف دوري",
      "Прибирання після ремонту": "تنظيف بعد التجديد",
      "Миття вікон": "تنظيف النوافذ",
      "Хімчистка м'яких меблів": "تنظيف الأثاث المنجد",
      "Прибирання офісу / комерційного приміщення": "تنظيف المكاتب / المحلات التجارية",
      "Прибирання ресторану / бару": "تنظيف المطاعم / البارات",
      "Інше": "أخرى",
      "л": "ل",
      "кг": "كغ",
      "шт": "قطعة",
      "уп": "عبوة",
      "Перший запуск": "الإعداد الأول",
      "Створіть обліковий запис адміністратора": "أنشئ حساب المسؤول",
      "Це буде перший акаунт у системі — з нього ви зможете додавати облікові записи для співробітників.": "سيكون هذا أول حساب في النظام — ومن خلاله يمكنك إضافة حسابات للموظفين.",
      "Ваше ім'я": "اسمك",
      "Напр. Олег": "مثال: أوليغ",
      "Логін": "اسم المستخدم",
      "Пароль": "كلمة المرور",
      "Створити й увійти": "إنشاء وتسجيل الدخول",
      "Вхід у систему": "تسجيل الدخول إلى النظام",
      "Вхід": "تسجيل الدخول",
      "Увійдіть під своїм робочим логіном.": "سجّل الدخول باستخدام بيانات عملك.",
      "Увійти": "تسجيل الدخول",
      "Меню": "القائمة",
      "CRM & календар": "CRM والتقويم",
      "Закрити меню": "إغلاق القائمة",
      "Дашборд": "لوحة التحكم",
      "Клієнти": "العملاء",
      "Склад": "المخزون",
      "Команда": "الفريق",
      "План розвитку": "خطة التطوير",
      "Замовлення": "الطلبات",
      "Вийти": "تسجيل الخروج",
      "Клієнтів усього": "إجمالي العملاء",
      "Завдань цього тижня": "مهام هذا الأسبوع",
      "Сьогодні заплановано": "مجدول اليوم",
      "Неоплачено": "غير مدفوع",
      "Орієнтовний заробіток за місяць": "الدخل التقديري لهذا الشهر",
      "Календар завдань": "تقويم المهام",
      "План на день": "خطة اليوم",
      "Напр. Подзвонити постачальнику...": "مثال: الاتصال بالمورد...",
      "Потребують уваги": "تحتاج إلى انتباه",
      "Фінансові підсумки": "الملخص المالي",
      "Цей тиждень": "هذا الأسبوع",
      "Цей місяць": "هذا الشهر",
      "Клієнтська база Kliny X": "قاعدة عملاء Kliny X",
      "Пошук за ім'ям, телефоном, адресою...": "البحث بالاسم أو الهاتف أو العنوان...",
      "Усі": "الكل",
      "Ліди": "العملاء المحتملون",
      "Активні": "النشطون",
      "Неактивні": "غير النشطين",
      "Наступне завдання": "المهمة التالية",
      "Клієнтів ще немає. Додайте першого клієнта, щоб почати вести базу.": "لا يوجد عملاء بعد. أضف أول عميل للبدء في إدارة القاعدة.",
      "Оплати та виставлені рахунки": "المدفوعات والفواتير الصادرة",
      "Експорт CSV": "تصدير CSV",
      "Виставити рахунок": "إصدار فاتورة",
      "Виставлено всього": "إجمالي الصادر",
      "Оплачено": "مدفوع",
      "Неоплачені": "غير مدفوعة",
      "Прострочені": "متأخرة",
      "Оплачені": "مدفوعة",
      "Рахунків ще немає.": "لا توجد فواتير بعد.",
      "Облік хімії та витратних матеріалів": "إدارة المواد الكيميائية والمستهلكات",
      "Додати товар": "إضافة صنف",
      "Товар": "الصنف",
      "Мін. залишок": "الحد الأدنى",
      "Товарів ще немає. Додайте перший, щоб почати облік хімії.": "لا توجد أصناف بعد. أضف الأول لبدء إدارة المخزون.",
      "Облікові записи співробітників для входу в систему": "حسابات الموظفين لتسجيل الدخول إلى النظام",
      "Додати співробітника": "إضافة موظف",
      "Що вже готово в Kliny X CRM і що далі": "ما الذي أُنجز في Kliny X CRM وما هو القادم",
      "Додати пункт": "إضافة بند",
      "Плану розвитку ще немає.": "لا توجد خطة تطوير بعد.",
      "Швидкий перехід на платформи, де шукаємо замовлення": "وصول سريع إلى المنصات التي نبحث فيها عن الطلبات",
      "Додані вручну": "مضافة يدويًا",
      "Рекомендовані (авто)": "موصى بها (تلقائي)",
    }
  };
  function t(s) {
    if (state.lang === "uk") return s;
    var dict = I18N[state.lang];
    return dict && Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s;
  }
  function loadLang() {
    try {
      var l = localStorage.getItem("klinyx_lang");
      return (l === "de" || l === "ar") ? l : "uk";
    } catch (e) { return "uk"; }
  }
  function saveLang(l) {
    try { localStorage.setItem("klinyx_lang", l); } catch (e) { /* ignore */ }
  }
  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === state.lang);
    });
    document.documentElement.setAttribute("lang", state.lang);
    document.documentElement.setAttribute("dir", state.lang === "ar" ? "rtl" : "ltr");
  }
  function setLang(l) {
    if (l !== "uk" && l !== "de" && l !== "ar") return;
    state.lang = l;
    saveLang(l);
    applyStaticI18n();
    if (state.me) render();
    scheduleAutoTranslate();
  }

  /* ============ auto-translation of Arabic-authored notes ============ */
  // Static UI strings are translated via t()/I18N above. Free-text content
  // users type (client notes, platform notes/tasks, day-plan items) can't go
  // through a static dictionary, so instead: if such text is detected as
  // Arabic and the viewer's own UI language is NOT Arabic (they can't already
  // read it), we show it as-is plus an automatically fetched translation
  // underneath, via the free MyMemory API called directly from the browser.
  var ARABIC_RE = /[؀-ۿ]/;
  var translateCache = Object.create(null);
  var autoTranslatePending = false;
  function isArabicText(s) {
    return typeof s === "string" && ARABIC_RE.test(s);
  }
  function decodeHtmlEntities(s) {
    var el = document.createElement("textarea");
    el.innerHTML = s;
    return el.value;
  }
  // Wrap text for display: if it looks like Arabic and the viewer isn't
  // reading the UI in Arabic, mark it so the MutationObserver below can find
  // it and fill in a translation; otherwise behaves exactly like escapeHtml.
  function autoTranslateHtml(s) {
    var text = s == null ? "" : String(s);
    if (!text || state.lang === "ar" || !isArabicText(text)) return escapeHtml(text);
    return '<span class="auto-i18n" data-src="' + escapeHtml(text) + '"></span>';
  }
  function fetchTranslation(text, target, cb) {
    var key = target + "::" + text;
    if (Object.prototype.hasOwnProperty.call(translateCache, key)) { cb(translateCache[key]); return; }
    var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=ar|" + target;
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var out = data && data.responseData && data.responseData.translatedText ? decodeHtmlEntities(data.responseData.translatedText) : null;
      translateCache[key] = out;
      cb(out);
    }).catch(function () {
      translateCache[key] = null;
      cb(null);
    });
  }
  function runAutoTranslate() {
    if (state.lang === "ar") return;
    var target = state.lang === "de" ? "de" : "uk";
    document.querySelectorAll(".auto-i18n:not([data-translated])").forEach(function (span) {
      span.setAttribute("data-translated", "1");
      span.textContent = span.getAttribute("data-src");
      var text = span.getAttribute("data-src");
      fetchTranslation(text, target, function (translated) {
        if (!translated || translated.trim() === text.trim()) return;
        if (!span.parentNode) return;
        var next = span.nextElementSibling;
        if (!next || !next.classList.contains("auto-i18n-note")) {
          var note = document.createElement("div");
          note.className = "auto-i18n-note";
          note.textContent = translated;
          span.insertAdjacentElement("afterend", note);
        }
      });
    });
  }
  function scheduleAutoTranslate() {
    if (autoTranslatePending) return;
    autoTranslatePending = true;
    setTimeout(function () { autoTranslatePending = false; runAutoTranslate(); }, 150);
  }
  function setupAutoTranslateObserver() {
    var observer = new MutationObserver(function () { scheduleAutoTranslate(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ============ state ============ */
  var state = {
    me: null,
    clients: new Map(),
    jobs: new Map(),
    invoices: new Map(),
    inventory: new Map(),
    roadmap: new Map(),
    platforms: new Map(),
    dayPlans: new Map(),
    users: [],
    roster: [],
    telegram: null,
    lang: loadLang(),
    view: "dashboard",
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedDay: null,
    clientFilter: "all",
    clientQuery: "",
    invoiceFilter: "all",
    ordersTab: "manual"
  };

  function todayStr() { return fmtDate(new Date()); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function fmtDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function parseDate(s) { var p = s.split("-"); return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)); }
  function weekRange(d) {
    var day = d.getDay();
    var diffToMonday = day === 0 ? -6 : 1 - day;
    var monday = new Date(d); monday.setDate(d.getDate() + diffToMonday);
    var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: fmtDate(monday), end: fmtDate(sunday) };
  }
  function monthRange(d) {
    var first = new Date(d.getFullYear(), d.getMonth(), 1);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: fmtDate(first), end: fmtDate(last) };
  }
  function fmtDateHuman(s) {
    if (!s) return "—";
    var d = parseDate(s);
    if (state.lang === "ar") return d.getDate() + " " + MONTHS.ar[d.getMonth()];
    return d.getDate() + " " + MONTHS[state.lang][d.getMonth()].toLowerCase().slice(0, 3) + ".";
  }
  function fmtMoney(n) {
    n = Number(n) || 0;
    return "€" + n.toLocaleString("de-DE", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Renders free-text description line by line. A line shaped like
  // "Назва: https://..." becomes a label plus a real clickable "Увійти →"
  // button (e.g. platform login/registration links in the Roadmap) instead
  // of showing the raw URL as plain text.
  function renderDescLines(text) {
    if (!text) return "";
    var urlLineRe = /^(.*?):\s*(https?:\/\/\S+)\s*$/;
    return String(text).split("\n").map(function (line) {
      var m = line.match(urlLineRe);
      if (m) {
        return '<div class="roadmap-link-row"><span>' + escapeHtml(m[1].trim()) + '</span>' +
          '<a class="btn-chip" href="' + escapeHtml(m[2]) + '" target="_blank" rel="noopener noreferrer">' + t("Увійти") + ' →</a></div>';
      }
      return line.trim() ? '<div>' + escapeHtml(line) + '</div>' : '<div>&nbsp;</div>';
    }).join("");
  }

  /* ============ toast ============ */
  function toast(msg, isError) {
    var host = document.getElementById("toast-host");
    var el = document.createElement("div");
    el.className = "toast" + (isError ? " err" : "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  }

  /* ============ API client ============ */
  function api(method, url, body) {
    var opts = { method: method, credentials: "same-origin", headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      if (res.status === 401) {
        showLogin();
        throw { code: "not_authenticated" };
      }
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.message) || t("Сталася помилка"));
          err.code = data && data.error;
          throw err;
        }
        return data;
      });
    });
  }

  /* ============ auth flow ============ */
  function boot() {
    applyStaticI18n();
    setupAutoTranslateObserver();
    api("GET", "/api/auth/me").then(function (data) {
      if (data.needsSetup) return showSetup();
      if (!data.user) return showLogin();
      enterApp(data.user);
    }).catch(function () {
      showLogin();
    });
  }

  function hideAllScreens() {
    ["screen-loading", "screen-setup", "screen-login", "app"].forEach(function (id) {
      document.getElementById(id).hidden = true;
    });
  }

  function showSetup() {
    hideAllScreens();
    document.getElementById("screen-setup").hidden = false;
  }

  function showLogin() {
    hideAllScreens();
    document.getElementById("screen-login").hidden = false;
    state.me = null;
  }

  function enterApp(user) {
    state.me = user;
    hideAllScreens();
    document.getElementById("app").hidden = false;
    document.getElementById("me-name").textContent = user.name || user.username;
    document.getElementById("me-role").textContent = user.role === "admin" ? t("Адміністратор") : t("Співробітник");
    document.getElementById("me-avatar").textContent = (user.name || user.username).trim().slice(0, 1).toUpperCase();
    document.getElementById("nav-team").hidden = user.role !== "admin";
    document.getElementById("nav-inventory").hidden = user.role !== "admin";
    setView("dashboard");
    loadAll();
    refreshTelegramBadge();
    if (!window.__klinyxPoll) {
      window.__klinyxPoll = setInterval(loadAll, POLL_MS);
    }
  }

  /* ============ telegram ============ */
  function refreshTelegramBadge() {
    api("GET", "/api/telegram/me").then(function (info) {
      state.telegram = info;
      var badge = document.getElementById("btn-telegram");
      var text = document.getElementById("tg-badge-text");
      badge.classList.toggle("linked", !!info.linked);
      text.textContent = "Telegram: " + (info.linked ? t("підключено") : t("не підключено"));
    }).catch(function () { /* not critical — leave the default label */ });
  }

  function openTelegramModal() {
    var root = document.getElementById("modal-root");
    var info = state.telegram || {};
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + t("Сповіщення в Telegram") + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body" id="tg-modal-body"><p class="auth-sub">' + t("Завантаження...") + '</p></div>' +
        '<div class="modal-foot"><span></span><span></span></div>' +
      '</div></div>';
    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });

    api("GET", "/api/telegram/me").then(function (data) {
      state.telegram = data;
      renderTelegramModalBody(data);
    }).catch(function (err) { toast(err.message, true); closeOverlay(); });
  }

  function renderTelegramModalBody(info, showCodeEvenIfLinked) {
    var body = document.getElementById("tg-modal-body");
    if (!body) return;
    if (!info.configured) {
      body.innerHTML = '<p class="auth-sub">' + t("Telegram-бот ще не налаштований адміністратором сервера. Зверніться до того, хто розгортав CRM.") + '</p>';
      return;
    }
    // A fresh code doesn't unlink the account by itself — telegramChatId
    // only changes once someone actually sends /start <newcode> to the bot.
    // So right after "regenerate", info.linked is still true; without this
    // flag the modal would just show the old "already linked" message again
    // and the person would have no code/link to actually act on.
    if (info.linked && !showCodeEvenIfLinked) {
      body.innerHTML =
        '<p class="auth-sub" style="color:var(--success);">✅ ' + t("Ваш акаунт під'єднано — сповіщення про призначені завдання приходитимуть у Telegram.") + '</p>' +
        '<button class="btn btn-sm" id="tg-relink">' + t("Під'єднати інший Telegram / переприв'язати") + '</button>';
    } else {
      body.innerHTML =
        (info.linked ? '<p class="auth-sub">' + t("Щоб перепідключити на інший Telegram-акаунт, надішліть боту новий код нижче — щойно він це отримає, старий зв'язок заміниться новим.") + '</p>' :
          '<p class="auth-sub">' + t("Натисніть кнопку нижче — відкриється Telegram і бот сам вас під'єднає.") + '</p>') +
        (info.deepLink ? '<a class="btn btn-primary btn-block" href="' + info.deepLink + '" target="_blank" rel="noopener">' + t("Під'єднати Telegram") + '</a>' : '') +
        '<p class="auth-sub" style="margin-top:14px;">' + t("Або вручну: напишіть боту") + (info.botUsername ? ' <b>@' + escapeHtml(info.botUsername) + '</b>' : '') + t(" команду:") + '</p>' +
        '<div class="kv-row"><div class="v mono" style="font-size:18px;">/start ' + escapeHtml(info.linkCode || "") + '</div></div>' +
        '<button class="btn btn-sm" id="tg-regen" style="margin-top:12px;">' + t("Новий код") + '</button>';
    }
    var relink = document.getElementById("tg-relink");
    if (relink) relink.addEventListener("click", function () { renderTelegramModalBody(state.telegram || {}, true); });
    var regen = document.getElementById("tg-regen");
    if (regen) regen.addEventListener("click", function () { regenerateTelegramCode(); });
  }

  function regenerateTelegramCode() {
    api("POST", "/api/telegram/regenerate").then(function () {
      return api("GET", "/api/telegram/me");
    }).then(function (data) {
      state.telegram = data;
      renderTelegramModalBody(data, true);
      toast("Новий код згенеровано — надішліть його боту в Telegram");
    }).catch(function (err) { toast(err.message, true); });
  }

  document.getElementById("btn-telegram").addEventListener("click", function () { closeMobileMenu(); openTelegramModal(); });

  document.getElementById("setup-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var errEl = document.getElementById("setup-error");
    errEl.hidden = true;
    api("POST", "/api/auth/setup", {
      name: document.getElementById("su-name").value.trim(),
      username: document.getElementById("su-username").value.trim(),
      password: document.getElementById("su-password").value
    }).then(function (data) {
      enterApp(data.user);
    }).catch(function (err) {
      errEl.textContent = err.message || t("Не вдалося створити акаунт");
      errEl.hidden = false;
    });
  });

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var errEl = document.getElementById("login-error");
    errEl.hidden = true;
    api("POST", "/api/auth/login", {
      username: document.getElementById("li-username").value.trim(),
      password: document.getElementById("li-password").value
    }).then(function (data) {
      enterApp(data.user);
    }).catch(function (err) {
      errEl.textContent = err.message || t("Не вдалося увійти");
      errEl.hidden = false;
    });
  });

  document.getElementById("btn-logout").addEventListener("click", function () {
    closeMobileMenu();
    api("POST", "/api/auth/logout").then(function () {
      if (window.__klinyxPoll) { clearInterval(window.__klinyxPoll); window.__klinyxPoll = null; }
      showLogin();
    });
  });

  /* ============ data loading ============ */
  function loadAll() {
    return Promise.all([
      api("GET", "/api/clients"),
      api("GET", "/api/jobs"),
      api("GET", "/api/invoices"),
      state.me && state.me.role === "admin" ? api("GET", "/api/users") : Promise.resolve(null),
      api("GET", "/api/users/roster"),
      state.me && state.me.role === "admin" ? api("GET", "/api/inventory") : Promise.resolve(null),
      api("GET", "/api/roadmap"),
      api("GET", "/api/platforms"),
      state.me && state.me.role === "admin" ? api("GET", "/api/dayplans") : Promise.resolve(null)
    ]).then(function (res) {
      state.clients = new Map(res[0].map(function (c) { return [c.id, c]; }));
      state.jobs = new Map(res[1].map(function (j) { return [j.id, j]; }));
      state.invoices = new Map(res[2].map(function (i) { return [i.id, i]; }));
      if (res[3]) state.users = res[3];
      state.roster = res[4] || [];
      if (res[5]) state.inventory = new Map(res[5].map(function (it) { return [it.id, it]; }));
      state.roadmap = new Map((res[6] || []).map(function (r) { return [r.id, r]; }));
      state.platforms = new Map((res[7] || []).map(function (p) { return [p.id, p]; }));
      if (res[8]) state.dayPlans = new Map(res[8].map(function (d) { return [d.id, d]; }));
      render();
    }).catch(function (err) {
      if (err && err.code !== "not_authenticated") toast(err.message || t("Не вдалося оновити дані"), true);
    });
  }

  /* ============ navigation ============ */
  function setView(v) {
    state.view = v;
    document.querySelectorAll(".view").forEach(function (el) { el.classList.remove("active"); });
    document.getElementById("view-" + v).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-view") === v);
    });
    render();
  }

  /* ============ derived data ============ */
  function clientName(id) {
    var c = state.clients.get(id);
    return c ? c.name : t("(клієнт видалений)");
  }
  function jobsSorted() {
    return Array.from(state.jobs.values()).slice().sort(function (a, b) { return (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")); });
  }
  function invoicesList() { return Array.from(state.invoices.values()); }
  function inventoryList() { return Array.from(state.inventory.values()); }
  function roadmapList() { return Array.from(state.roadmap.values()); }
  function platformsList() { return Array.from(state.platforms.values()); }
  function widgetColor(name) {
    var palette = ["#2F9EFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#F472B6", "#38BDF8", "#FB923C"];
    var s = String(name || "");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }
  function clientsList() { return Array.from(state.clients.values()); }
  function isOverdue(inv) { return inv.status === "unpaid" && inv.dueDate && inv.dueDate < todayStr(); }
  function nextJobForClient(clientId) {
    var today = todayStr();
    var upcoming = jobsSorted().filter(function (j) { return j.clientId === clientId && j.status === "scheduled" && j.date >= today; });
    return upcoming[0] || null;
  }
  function statusLabelJob(s) { return { scheduled: t("заплановано"), done: t("виконано"), cancelled: t("скасовано") }[s] || s; }
  function statusLabelClient(s) { return { lead: t("лід"), active: t("активний"), inactive: t("неактивний") }[s] || s; }
  function statusLabelInvoice(inv) {
    if (isOverdue(inv)) return t("прострочено");
    return { unpaid: t("неоплачено"), paid: t("оплачено") }[inv.status] || inv.status;
  }

  /* ============ render: dashboard ============ */
  function renderDashboard() {
    var today = new Date();
    var todayLocale = state.lang === "de" ? "de-DE" : state.lang === "ar" ? "ar-SA-u-nu-latn" : "uk-UA";
    document.getElementById("today-label").textContent = today.toLocaleDateString(todayLocale, { weekday: "long", day: "numeric", month: "long" });

    var jobs = jobsSorted();
    var todayS = todayStr();
    var weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
    var weekEndS = fmtDate(weekEnd);

    var weekJobs = jobs.filter(function (j) { return j.status === "scheduled" && j.date >= todayS && j.date <= weekEndS; });
    var todayJobs = jobs.filter(function (j) { return j.date === todayS && j.status !== "cancelled"; });
    var unpaidSum = invoicesList().filter(function (i) { return i.status === "unpaid"; }).reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0);

    document.getElementById("stat-clients").textContent = state.clients.size;
    document.getElementById("stat-week-jobs").textContent = weekJobs.length;
    document.getElementById("stat-today").textContent = todayJobs.length;
    document.getElementById("stat-unpaid").textContent = fmtMoney(unpaidSum);

    var wr = weekRange(today), mr = monthRange(today);
    var weekJobsF = jobs.filter(function (j) { return j.status !== "cancelled" && j.date >= wr.start && j.date <= wr.end; });
    var monthJobsF = jobs.filter(function (j) { return j.status !== "cancelled" && j.date >= mr.start && j.date <= mr.end; });
    function sumPrice(list) { return list.reduce(function (s, j) { return s + (Number(j.price) || 0); }, 0); }
    var weekTotal = sumPrice(weekJobsF), weekPaid = sumPrice(weekJobsF.filter(function (j) { return j.paid; }));
    var monthTotal = sumPrice(monthJobsF), monthPaid = sumPrice(monthJobsF.filter(function (j) { return j.paid; }));
    document.getElementById("fin-week").textContent = fmtMoney(weekTotal) + t(" (оплачено ") + fmtMoney(weekPaid) + ")";
    document.getElementById("fin-month").textContent = fmtMoney(monthTotal) + t(" (оплачено ") + fmtMoney(monthPaid) + ")";
    var statMonthIncome = document.getElementById("stat-month-income");
    if (statMonthIncome) statMonthIncome.textContent = fmtMoney(monthTotal);

    renderCalendar();
    renderAgenda();
    renderReminders();
    renderDayPlan();
  }

  function renderCalendar() {
    document.getElementById("cal-month-label").textContent = MONTHS[state.lang][state.calMonth] + " " + state.calYear;
    var dowRow = document.getElementById("cal-dow-row");
    dowRow.innerHTML = DOW[state.lang].map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join("");

    var first = new Date(state.calYear, state.calMonth, 1);
    var startOffset = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    var prevDays = new Date(state.calYear, state.calMonth, 0).getDate();

    var jobsByDate = {};
    jobsSorted().forEach(function (j) { (jobsByDate[j.date] = jobsByDate[j.date] || []).push(j); });

    var todayS = todayStr();
    var cells = [];
    var totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    for (var i = 0; i < totalCells; i++) {
      var dayNum, monthOffset = 0, muted = false;
      if (i < startOffset) { dayNum = prevDays - startOffset + i + 1; muted = true; monthOffset = -1; }
      else if (i >= startOffset + daysInMonth) { dayNum = i - startOffset - daysInMonth + 1; muted = true; monthOffset = 1; }
      else { dayNum = i - startOffset + 1; }

      var cellMonth = state.calMonth + monthOffset;
      var cellYear = state.calYear;
      if (cellMonth < 0) { cellMonth = 11; cellYear--; }
      if (cellMonth > 11) { cellMonth = 0; cellYear++; }
      var dateStr = cellYear + "-" + pad2(cellMonth + 1) + "-" + pad2(dayNum);

      var dayJobs = jobsByDate[dateStr] || [];
      var dots = dayJobs.slice(0, 4).map(function (j) {
        return '<span class="cal-dot ' + (j.status === "done" ? "done" : j.status === "cancelled" ? "cancelled" : "") + '"></span>';
      }).join("");
      var more = dayJobs.length > 4 ? '<span class="cal-more">+' + (dayJobs.length - 4) + '</span>' : "";

      var cls = "cal-cell" + (muted ? " muted" : "") + (dateStr === todayS ? " today" : "") + (dateStr === state.selectedDay ? " selected" : "");
      cells.push('<div class="' + cls + '" data-date="' + dateStr + '"><div class="cal-daynum">' + dayNum + '</div><div class="cal-dots">' + dots + more + '</div></div>');
    }
    document.getElementById("cal-grid").innerHTML = cells.join("");

    document.querySelectorAll(".cal-cell").forEach(function (el) {
      el.addEventListener("click", function () {
        var d = el.getAttribute("data-date");
        state.selectedDay = (state.selectedDay === d) ? null : d;
        renderCalendar();
        renderAgenda();
        renderDayPlan();
      });
    });
  }

  /* ============ dashboard: day plan (admin-only, per-date to-dos) ============ */
  // General plan items for a day — "подзвонити постачальнику", "забрати
  // інвентар зі складу" — separate from the cleaning jobs on the calendar.
  // Admin-only, both in the UI and on the backend.
  function dayPlanDate() { return state.selectedDay || todayStr(); }

  function dayPlansForDate(date) {
    return Array.from(state.dayPlans.values())
      .filter(function (d) { return d.date === date; })
      .sort(function (a, b) { return (a.createdAt || "").localeCompare(b.createdAt || ""); });
  }

  function renderDayPlanList(items) {
    if (!items.length) return '<div class="empty-note">' + t("На цей день ще немає пунктів плану.") + '</div>';
    return items.map(function (d) {
      return '<div class="platform-task-row">' +
        '<button class="platform-task-check' + (d.done ? ' done' : '') + '" data-toggle-dayplan="' + d.id + '" title="' + (d.done ? t("Позначити не виконано") : t("Позначити виконано")) + '">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></button>' +
        '<div class="platform-task-title' + (d.done ? ' done' : '') + '">' + autoTranslateHtml(d.text) + '</div>' +
        '<button class="icon-btn platform-task-remove" data-remove-dayplan="' + d.id + '" title="' + t("Видалити пункт") + '">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</div>';
    }).join("");
  }

  function wireDayPlanList() {
    var list = document.getElementById("dayplan-list");
    if (!list) return;
    list.querySelectorAll("[data-toggle-dayplan]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-toggle-dayplan");
        var item = state.dayPlans.get(id);
        api("PATCH", "/api/dayplans/" + id, { done: !(item && item.done) })
          .then(function (updated) { state.dayPlans.set(id, updated); renderDayPlan(); })
          .catch(function (err) { toast(err.message, true); });
      });
    });
    list.querySelectorAll("[data-remove-dayplan]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-remove-dayplan");
        api("DELETE", "/api/dayplans/" + id)
          .then(function () { state.dayPlans.delete(id); renderDayPlan(); })
          .catch(function (err) { toast(err.message, true); });
      });
    });
  }

  function renderDayPlan() {
    var panel = document.getElementById("dayplan-panel");
    if (!panel) return;
    var isAdmin = !!(state.me && state.me.role === "admin");
    panel.hidden = !isAdmin;
    if (!isAdmin) return;

    var date = dayPlanDate();
    var title = document.getElementById("dayplan-title");
    if (title) title.textContent = t("План на ") + fmtDateHuman(date) + (date === todayStr() ? t(" (сьогодні)") : "");

    var list = document.getElementById("dayplan-list");
    if (list) {
      list.innerHTML = renderDayPlanList(dayPlansForDate(date));
      wireDayPlanList();
    }

    var input = document.getElementById("dayplan-new-input");
    var addBtn = document.getElementById("dayplan-add-btn");
    if (addBtn && !addBtn.dataset.wired) {
      addBtn.dataset.wired = "1";
      var doAdd = function () {
        var el = document.getElementById("dayplan-new-input");
        var text = el ? el.value.trim() : "";
        if (!text) return;
        api("POST", "/api/dayplans", { date: dayPlanDate(), text: text }).then(function (created) {
          state.dayPlans.set(created.id, created);
          if (el) el.value = "";
          renderDayPlan();
        }).catch(function (err) { toast(err.message, true); });
      };
      addBtn.addEventListener("click", doAdd);
      document.getElementById("dayplan-panel").addEventListener("keydown", function (e) {
        if (e.key === "Enter" && e.target && e.target.id === "dayplan-new-input") { e.preventDefault(); doAdd(); }
      });
    }
  }

  function assigneeName(id) {
    if (!id) return "";
    var u = state.roster.find(function (x) { return x.id === id; });
    return u ? u.name : "";
  }

  function renderAgenda() {
    var listEl = document.getElementById("agenda-list");
    var titleEl = document.getElementById("agenda-title");
    var jobs = jobsSorted().filter(function (j) { return j.status !== "cancelled"; });
    var items;
    if (state.selectedDay) {
      titleEl.textContent = fmtDateHuman(state.selectedDay) + t(" — завдання");
      items = jobs.filter(function (j) { return j.date === state.selectedDay; });
    } else {
      titleEl.textContent = t("Найближчі завдання");
      var todayS = todayStr();
      items = jobs.filter(function (j) { return j.date >= todayS; }).slice(0, 8);
    }
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-note">' + t("Немає запланованих завдань") + (state.selectedDay ? t(" на цей день") : "") + '.</div>';
      return;
    }
    listEl.innerHTML = items.map(function (j) {
      var repeatIcon = j.seriesId ? '🔁 ' : '';
      return '<div class="agenda-item clickable" data-job="' + j.id + '" style="cursor:pointer;">' +
        '<div class="agenda-date">' + fmtDateHuman(j.date) + (j.time ? '<b>' + j.time + '</b>' : "") + '</div>' +
        '<div class="agenda-main"><div class="title">' + repeatIcon + escapeHtml(clientName(j.clientId)) + '</div>' +
        '<div class="meta">' + escapeHtml(j.service ? t(j.service) : "") + (j.address ? " · " + escapeHtml(j.address) : "") + (assigneeName(j.assignedTo) ? " · 👤 " + escapeHtml(assigneeName(j.assignedTo)) : "") + '</div></div>' +
        '<div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">' +
          '<span class="pill ' + j.status + '"><span class="pill-dot"></span>' + statusLabelJob(j.status) + '</span>' +
          '<span class="pill ' + (j.paid ? "paid" : "unpaid") + '"><span class="pill-dot"></span>' + (j.paid ? t("оплачено") : t("не оплачено")) + '</span>' +
        '</div></div>';
    }).join("");
    listEl.querySelectorAll("[data-job]").forEach(function (el) {
      el.addEventListener("click", function () { openJobModal(el.getAttribute("data-job")); });
    });
  }

  function renderReminders() {
    var el = document.getElementById("reminders-list");
    var todayS = todayStr();
    var soon = new Date(); soon.setDate(soon.getDate() + 2);
    var soonS = fmtDate(soon);
    var items = [];
    jobsSorted().forEach(function (j) {
      if (j.status === "scheduled" && j.date >= todayS && j.date <= soonS) {
        items.push({ date: j.date, label: escapeHtml(clientName(j.clientId)) + " — " + escapeHtml(j.service ? t(j.service) : t("завдання")), tone: "accent" });
      }
    });
    invoicesList().forEach(function (i) {
      if (isOverdue(i)) items.push({ date: i.dueDate, label: t("Прострочено: ") + escapeHtml(clientName(i.clientId)) + " · " + fmtMoney(i.amount), tone: "danger" });
    });
    items.sort(function (a, b) { return a.date.localeCompare(b.date); });
    if (!items.length) { el.innerHTML = '<div class="empty-note">' + t("Нічого термінового — усе під контролем.") + '</div>'; return; }
    el.innerHTML = items.map(function (it) {
      return '<div class="agenda-item"><div class="agenda-date">' + fmtDateHuman(it.date) + '</div>' +
        '<div class="agenda-main"><div class="title" style="color:' + (it.tone === "danger" ? "var(--danger)" : "var(--text)") + ';">' + it.label + '</div></div></div>';
    }).join("");
  }

  /* ============ render: clients ============ */
  function renderClients() {
    var tbody = document.getElementById("clients-tbody");
    var q = state.clientQuery.trim().toLowerCase();
    var list = clientsList().filter(function (c) {
      if (state.clientFilter !== "all" && c.status !== state.clientFilter) return false;
      if (!q) return true;
      return [c.name, c.phone, c.email, c.address].some(function (f) { return f && f.toLowerCase().indexOf(q) !== -1; });
    }).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });

    document.getElementById("clients-empty").hidden = !!clientsList().length;
    document.querySelector("#view-clients .table-wrap").style.display = clientsList().length ? "" : "none";

    tbody.innerHTML = list.map(function (c) {
      var nj = nextJobForClient(c.id);
      return '<tr class="clickable" data-client="' + c.id + '">' +
        '<td><div class="cell-title">' + escapeHtml(c.name) + '</div>' + (c.address ? '<div class="cell-sub">' + escapeHtml(c.address) + '</div>' : '') + '</td>' +
        '<td><div>' + escapeHtml(c.phone || "—") + '</div><div class="cell-sub">' + escapeHtml(c.email || "") + '</div></td>' +
        '<td><span class="pill ' + c.status + '"><span class="pill-dot"></span>' + statusLabelClient(c.status) + '</span></td>' +
        '<td>' + (nj ? fmtDateHuman(nj.date) + (nj.time ? ", " + nj.time : "") : '<span class="cell-sub">—</span>') + '</td>' +
        '<td><div class="row-actions"><button class="icon-btn" data-edit-client="' + c.id + '" title="' + t("Редагувати") + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button></div></td></tr>';
    }).join("");

    document.getElementById("nav-count-clients").textContent = state.clients.size || "";
    tbody.querySelectorAll("tr[data-client]").forEach(function (row) {
      row.addEventListener("click", function (ev) {
        if (ev.target.closest("[data-edit-client]")) return;
        openClientDrawer(row.getAttribute("data-client"));
      });
    });
    tbody.querySelectorAll("[data-edit-client]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) { ev.stopPropagation(); openClientModal(btn.getAttribute("data-edit-client")); });
    });
  }

  /* ============ render: invoices ============ */
  function renderInvoices() {
    var tbody = document.getElementById("invoices-tbody");
    var list = invoicesList().filter(function (i) {
      if (state.invoiceFilter === "all") return true;
      if (state.invoiceFilter === "overdue") return isOverdue(i);
      return i.status === state.invoiceFilter;
    }).sort(function (a, b) { return (b.issueDate || "").localeCompare(a.issueDate || ""); });

    var all = invoicesList();
    document.getElementById("inv-total").textContent = fmtMoney(all.reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0));
    document.getElementById("inv-unpaid").textContent = fmtMoney(all.filter(function (i) { return i.status === "unpaid"; }).reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0));
    document.getElementById("inv-paid").textContent = fmtMoney(all.filter(function (i) { return i.status === "paid"; }).reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0));

    document.getElementById("invoices-empty").hidden = !!all.length;
    document.querySelector("#view-invoices .table-wrap").style.display = all.length ? "" : "none";

    tbody.innerHTML = list.map(function (inv) {
      var overdue = isOverdue(inv);
      var statusClass = overdue ? "overdue" : inv.status;
      return '<tr>' +
        '<td class="cell-title">' + escapeHtml(clientName(inv.clientId)) + '</td>' +
        '<td>' + escapeHtml(inv.note || "—") + '</td>' +
        '<td class="num">' + fmtMoney(inv.amount) + '</td>' +
        '<td>' + fmtDateHuman(inv.dueDate) + '</td>' +
        '<td><span class="pill ' + statusClass + '"><span class="pill-dot"></span>' + statusLabelInvoice(inv) + '</span></td>' +
        '<td><div class="row-actions">' +
          (inv.status === "unpaid" ? '<button class="btn btn-sm" data-mark-paid="' + inv.id + '">' + t("Позначити оплаченим") + '</button>' : '<button class="btn btn-sm btn-ghost" data-mark-unpaid="' + inv.id + '">' + t("Скасувати оплату") + '</button>') +
          '<button class="icon-btn" data-edit-invoice="' + inv.id + '" title="' + t("Редагувати") + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
          '<button class="icon-btn" data-del-invoice="' + inv.id + '" title="' + t("Видалити") + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg></button></div></td></tr>';
    }).join("");

    document.getElementById("nav-count-invoices").textContent = all.filter(function (i) { return i.status === "unpaid"; }).length || "";

    tbody.querySelectorAll("[data-mark-paid]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("PATCH", "/api/invoices/" + btn.getAttribute("data-mark-paid"), { status: "paid" }).then(function () { toast("Рахунок позначено оплаченим"); loadAll(); });
      });
    });
    tbody.querySelectorAll("[data-mark-unpaid]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("PATCH", "/api/invoices/" + btn.getAttribute("data-mark-unpaid"), { status: "unpaid" }).then(function () { loadAll(); });
      });
    });
    tbody.querySelectorAll("[data-edit-invoice]").forEach(function (btn) {
      btn.addEventListener("click", function () { openInvoiceModal(btn.getAttribute("data-edit-invoice")); });
    });
    tbody.querySelectorAll("[data-del-invoice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!confirm(t("Видалити цей рахунок?"))) return;
        api("DELETE", "/api/invoices/" + btn.getAttribute("data-del-invoice")).then(function () { toast("Рахунок видалено"); loadAll(); });
      });
    });
  }

  function exportInvoicesCsv() {
    var rows = [[t("Клієнт"), t("Опис"), t("Сума"), t("Термін оплати"), t("Статус"), t("Дата створення")]];
    invoicesList().slice().sort(function (a, b) { return (a.issueDate || "").localeCompare(b.issueDate || ""); }).forEach(function (inv) {
      rows.push([
        clientName(inv.clientId),
        inv.note || "",
        String(inv.amount || 0).replace(".", ","),
        inv.dueDate || "",
        statusLabelInvoice(inv),
        inv.issueDate || ""
      ]);
    });
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? "" : cell);
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(";");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "rahunky_" + todayStr() + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ============ render: team (admin) ============ */
  function renderTeam() {
    if (!state.me || state.me.role !== "admin") return;
    var tbody = document.getElementById("users-tbody");
    tbody.innerHTML = state.users.map(function (u) {
      return '<tr>' +
        '<td class="cell-title">' + escapeHtml(u.name) + (u.id === state.me.id ? ' <span class="cell-sub">' + t("(ви)") + '</span>' : '') + '</td>' +
        '<td class="mono">' + escapeHtml(u.username) + '</td>' +
        '<td><span class="pill ' + u.role + '"><span class="pill-dot"></span>' + (u.role === "admin" ? t("адмін") : t("співробітник")) + '</span></td>' +
        '<td><span class="pill ' + (u.active ? "active" : "inactive") + '"><span class="pill-dot"></span>' + (u.active ? t("активний") : t("вимкнено")) + '</span></td>' +
        '<td>' + (u.telegramLinked ? '<span class="pill active"><span class="pill-dot"></span>' + t("підключено") + '</span>' : '<span class="pill lead"><span class="pill-dot"></span>—</span>') + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-sm" data-reset-pw="' + u.id + '">' + t("Скинути пароль") + '</button>' +
          '<button class="btn btn-sm btn-ghost" data-toggle-role="' + u.id + '">' + (u.role === "admin" ? t("Прибрати адміна") : t("Зробити адміном")) + '</button>' +
          '<button class="btn btn-sm btn-ghost" data-toggle-active="' + u.id + '">' + (u.active ? t("Вимкнути") : t("Увімкнути")) + '</button>' +
          (u.id === state.me.id ? '' : '<button class="icon-btn" data-del-user="' + u.id + '" title="' + t("Видалити") + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg></button>') +
        '</div></td></tr>';
    }).join("");

    tbody.querySelectorAll("[data-reset-pw]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pw = prompt("Новий пароль для цього співробітника (мінімум 8 символів):");
        if (!pw) return;
        api("PATCH", "/api/users/" + btn.getAttribute("data-reset-pw"), { password: pw }).then(function () { toast("Пароль оновлено"); }).catch(function (err) { toast(err.message, true); });
      });
    });
    tbody.querySelectorAll("[data-toggle-role]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-toggle-role");
        var u = state.users.find(function (x) { return x.id === id; });
        var nextRole = u.role === "admin" ? "employee" : "admin";
        var msg = nextRole === "admin"
          ? t("Призначити ") + u.name + t(" адміністратором?")
          : t("Прибрати права адміністратора в ") + u.name + t("?");
        if (!confirm(msg)) return;
        api("PATCH", "/api/users/" + id, { role: nextRole }).then(function () { toast("Роль оновлено"); loadAll(); }).catch(function (err) { toast(err.message, true); });
      });
    });
    tbody.querySelectorAll("[data-toggle-active]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-toggle-active");
        var u = state.users.find(function (x) { return x.id === id; });
        api("PATCH", "/api/users/" + id, { active: !u.active }).then(function () { toast("Статус оновлено"); loadAll(); }).catch(function (err) { toast(err.message, true); });
      });
    });
    tbody.querySelectorAll("[data-del-user]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!confirm(t("Видалити цей обліковий запис?"))) return;
        api("DELETE", "/api/users/" + btn.getAttribute("data-del-user")).then(function () { toast("Акаунт видалено"); loadAll(); }).catch(function (err) { toast(err.message, true); });
      });
    });
  }

  /* ============ render: development plan ============ */
  function statusLabelRoadmap(s) { return { backlog: t("заплановано"), in_progress: t("в процесі"), done: t("готово") }[s] || s; }

  function renderRoadmap() {
    var items = roadmapList();
    var groups = { backlog: [], in_progress: [], done: [] };
    items.forEach(function (r) { (groups[r.status] || groups.backlog).push(r); });
    var isAdmin = !!(state.me && state.me.role === "admin");
    var adminActions = document.getElementById("roadmap-admin-actions");
    if (adminActions) adminActions.hidden = !isAdmin;

    ["backlog", "in_progress", "done"].forEach(function (status) {
      var list = groups[status].slice().sort(function (a, b) { return (a.createdAt || "").localeCompare(b.createdAt || ""); });
      var countEl = document.getElementById("roadmap-count-" + status);
      if (countEl) countEl.textContent = list.length || "";
      var host = document.getElementById("roadmap-list-" + status);
      if (!host) return;
      if (!list.length) {
        host.innerHTML = '<div class="empty-note">—</div>';
        return;
      }
      host.innerHTML = list.map(function (r) {
        return '<div class="roadmap-card">' +
          '<div class="roadmap-card-title">' + escapeHtml(r.title) + '</div>' +
          (r.description ? '<div class="roadmap-card-desc">' + renderDescLines(r.description) + '</div>' : '') +
          (isAdmin ? '<div class="roadmap-card-actions">' +
            (status !== "backlog" ? '<button class="btn-chip" data-move="backlog" data-id="' + r.id + '">' + t("← заплановано") + '</button>' : '') +
            (status !== "in_progress" ? '<button class="btn-chip" data-move="in_progress" data-id="' + r.id + '">' + t("в процесі") + '</button>' : '') +
            (status !== "done" ? '<button class="btn-chip" data-move="done" data-id="' + r.id + '">' + t("готово →") + '</button>' : '') +
            '<button class="icon-btn" data-edit-roadmap="' + r.id + '" title="' + t("Редагувати") + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
          '</div>' : '') +
        '</div>';
      }).join("");
    });

    var emptyNote = document.getElementById("roadmap-empty");
    if (emptyNote) emptyNote.hidden = items.length > 0;

    document.querySelectorAll("#view-roadmap [data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("PATCH", "/api/roadmap/" + btn.getAttribute("data-id"), { status: btn.getAttribute("data-move") })
          .then(function () { loadAll(); })
          .catch(function (err) { toast(err.message, true); });
      });
    });
    document.querySelectorAll("#view-roadmap [data-edit-roadmap]").forEach(function (btn) {
      btn.addEventListener("click", function () { openRoadmapModal(btn.getAttribute("data-edit-roadmap")); });
    });
  }

  function openRoadmapModal(id) {
    var r = id ? state.roadmap.get(id) : null;
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (r ? t("Редагувати пункт") : t("Новий пункт плану")) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Назва *") + '</label><input type="text" id="f-title" value="' + (r ? escapeHtml(r.title) : "") + '" placeholder="' + t("Напр. Клієнтський портал") + '"></div>' +
          '<div class="field"><label>' + t("Опис") + '</label><textarea id="f-desc" placeholder="' + t("Коротко, що це і навіщо") + '">' + (r ? escapeHtml(r.description || "") : "") + '</textarea></div>' +
          '<div class="field"><label>' + t("Статус") + '</label><select id="f-status">' +
            '<option value="backlog"' + (!r || r.status === "backlog" ? " selected" : "") + '>' + t("Заплановано") + '</option>' +
            '<option value="in_progress"' + (r && r.status === "in_progress" ? " selected" : "") + '>' + t("В процесі") + '</option>' +
            '<option value="done"' + (r && r.status === "done" ? " selected" : "") + '>' + t("Готово") + '</option>' +
          '</select></div>' +
        '</div>' +
        '<div class="modal-foot">' + (r ? '<button class="btn btn-danger-text" id="ov-delete">' + t("Видалити") + '</button>' : '<span></span>') + '<button class="btn btn-primary" id="ov-save">' + t("Зберегти") + '</button></div>' +
      '</div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var title = document.getElementById("f-title").value.trim();
      if (!title) { toast("Вкажіть назву", true); return; }
      var data = {
        title: title,
        description: document.getElementById("f-desc").value.trim(),
        status: document.getElementById("f-status").value
      };
      var req = r ? api("PATCH", "/api/roadmap/" + r.id, data) : api("POST", "/api/roadmap", data);
      req.then(function () { toast(r ? t("Пункт оновлено") : t("Пункт додано")); closeOverlay(); loadAll(); })
        .catch(function (err) { toast(err.message, true); });
    });
    if (r) {
      document.getElementById("ov-delete").addEventListener("click", function () {
        if (!confirm(t("Видалити пункт \"") + r.title + t("\" з плану розвитку?"))) return;
        api("DELETE", "/api/roadmap/" + r.id).then(function () { toast("Пункт видалено"); closeOverlay(); loadAll(); });
      });
    }
  }

  /* ============ orders: platform quick-access widgets ============ */
  function renderOrders() {
    var all = platformsList().sort(function (a, b) { return (a.createdAt || "").localeCompare(b.createdAt || ""); });
    var isAdmin = !!(state.me && state.me.role === "admin");
    var adminActions = document.getElementById("orders-admin-actions");
    if (adminActions) adminActions.hidden = !isAdmin || state.ordersTab !== "manual";

    var tabsWrap = document.getElementById("orders-tabs");
    if (tabsWrap) {
      tabsWrap.querySelectorAll("[data-orders-tab]").forEach(function (chip) {
        chip.classList.toggle("active", chip.getAttribute("data-orders-tab") === state.ordersTab);
      });
      if (!tabsWrap.dataset.wired) {
        tabsWrap.dataset.wired = "1";
        tabsWrap.querySelectorAll("[data-orders-tab]").forEach(function (chip) {
          chip.addEventListener("click", function () {
            state.ordersTab = chip.getAttribute("data-orders-tab");
            renderOrders();
          });
        });
      }
    }

    var items = all.filter(function (p) { return (p.source || "manual") === state.ordersTab; });

    var grid = document.getElementById("orders-grid");
    var emptyNote = document.getElementById("orders-empty");
    if (emptyNote) {
      emptyNote.hidden = items.length > 0 || (state.ordersTab === "manual" && isAdmin);
      emptyNote.textContent = state.ordersTab === "auto"
        ? t("Рекомендованих платформ ще немає.")
        : t("Платформ ще немає — додай першу кнопкою вище.");
    }

    var html = items.map(function (p) {
      var initial = (p.title || t("?")).trim().charAt(0).toUpperCase();
      return '<a class="widget-card' + (p.done ? ' is-done' : '') + '" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer">' +
        (isAdmin ? '<button class="icon-btn widget-edit" data-edit-platform="' + p.id + '" title="' + t("Редагувати") + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' : '') +
        '<div class="widget-badge" style="background:' + widgetColor(p.title) + '">' + escapeHtml(initial) + '</div>' +
        '<div class="widget-title">' + escapeHtml(p.title) + '</div>' +
        '<' + (isAdmin ? 'button' : 'span') + ' class="widget-status' + (p.done ? ' done' : '') + '"' +
          (isAdmin ? ' data-toggle-platform="' + p.id + '" title="' + (p.done ? t("Позначити не виконано") : t("Позначити виконано")) + '"' : '') + '>' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>' +
          (p.done ? t("Виконано") : t("Не виконано")) +
        '</' + (isAdmin ? 'button' : 'span') + '>' +
        (isAdmin
          ? '<input type="text" class="widget-personal-note" data-note-input="' + p.id + '" value="' + escapeHtml(p.note || "") + '" placeholder="' + t("Нотатка для себе...") + '">'
          : (p.note ? '<div class="widget-personal-note is-readonly">' + autoTranslateHtml(p.note) + '</div>' : '')) +
        (isAdmin
          ? '<button class="widget-tasks-toggle" data-toggle-tasks="' + p.id + '" type="button">' + tasksToggleLabel(p) + '</button>' +
            '<div class="widget-tasks-panel" id="widget-tasks-panel-' + p.id + '" hidden>' +
              '<div class="platform-tasks" id="widget-tasks-list-' + p.id + '">' + renderPlatformTasks(p, "card-" + p.id + "-") + '</div>' +
              '<div class="platform-notes-add">' +
                '<input type="text" id="widget-new-task-' + p.id + '" placeholder="' + t("Нове завдання...") + '">' +
                '<button class="btn btn-sm" data-add-card-task="' + p.id + '" type="button">' + t("Додати") + '</button>' +
              '</div>' +
            '</div>'
          : '') +
        '<div class="widget-open">' + t("Відкрити") + ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M9 7h8v8"/></svg></div>' +
      '</a>';
    }).join("");

    if (isAdmin && state.ordersTab === "manual") {
      html += '<button class="widget-card-add" id="btn-new-order-tile">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>' + t("Додати платформу") + '</button>';
    }
    grid.innerHTML = html;

    grid.querySelectorAll("[data-edit-platform]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        openPlatformModal(btn.getAttribute("data-edit-platform"));
      });
    });
    grid.querySelectorAll("[data-toggle-platform]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        var pid = btn.getAttribute("data-toggle-platform");
        var current = state.platforms.get(pid);
        api("PATCH", "/api/platforms/" + pid, { done: !(current && current.done) })
          .then(function (updated) {
            state.platforms.set(pid, updated);
            btn.classList.toggle("done", !!updated.done);
            btn.title = t("Позначити ") + (updated.done ? "не виконано" : t("виконано"));
            btn.closest(".widget-card").classList.toggle("is-done", !!updated.done);
            var label = updated.done ? t("Виконано") : t("Не виконано");
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>' + label;
          })
          .catch(function (err) { toast(err.message, true); });
      });
    });
    var addTile = document.getElementById("btn-new-order-tile");
    if (addTile) addTile.addEventListener("click", function () { openPlatformModal(null); });

    // Personal status note, editable right on the tile — no need to open
    // the edit modal. It lives inside the <a> card, so clicks/typing must
    // not bubble up and trigger the card's own link navigation.
    grid.querySelectorAll("[data-note-input]").forEach(function (input) {
      input.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      input.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); });
      input.addEventListener("keydown", function (e) {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      });
      input.addEventListener("blur", function () {
        var pid = input.getAttribute("data-note-input");
        var current = state.platforms.get(pid);
        var value = input.value.trim();
        if (current && (current.note || "") === value) return;
        api("PATCH", "/api/platforms/" + pid, { note: value })
          .then(function (updated) { state.platforms.set(pid, updated); })
          .catch(function (err) { toast(err.message, true); input.value = (current && current.note) || ""; });
      });
    });

    // Tasks tab right on the tile — expandable, no need to open the edit
    // modal. Same task list/history logic as the modal, just scoped to
    // this card's own element ids so several cards can be open at once.
    grid.querySelectorAll("[data-toggle-tasks]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      btn.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        var pid = btn.getAttribute("data-toggle-tasks");
        var panel = document.getElementById("widget-tasks-panel-" + pid);
        if (panel) panel.hidden = !panel.hidden;
      });
    });
    items.forEach(function (p) {
      if (!isAdmin) return;
      wirePlatformTasks(p.id, "widget-tasks-list-" + p.id, "card-" + p.id + "-");
    });
    grid.querySelectorAll(".widget-tasks-panel").forEach(function (panel) {
      panel.addEventListener("click", function (e) { e.stopPropagation(); });
      panel.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    });
    grid.querySelectorAll("[data-add-card-task]").forEach(function (btn) {
      var pid = btn.getAttribute("data-add-card-task");
      var input = document.getElementById("widget-new-task-" + pid);
      var doAdd = function () {
        if (!input) return;
        var title = input.value.trim();
        if (!title) return;
        api("POST", "/api/platforms/" + pid + "/tasks", { title: title }).then(function (updated) {
          input.value = "";
          onPlatformTasksUpdated(pid, updated, "widget-tasks-list-" + pid, "card-" + pid + "-");
        }).catch(function (err) { toast(err.message, true); });
      };
      btn.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      btn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); doAdd(); });
      if (input) {
        input.addEventListener("mousedown", function (e) { e.stopPropagation(); });
        input.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); });
        input.addEventListener("keydown", function (e) {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); doAdd(); }
        });
      }
    });
  }

  function renderPlatformNotes(p) {
    var notes = Array.isArray(p.notes) ? p.notes.slice() : [];
    if (p.note && p.note.trim()) notes.unshift({ id: "__legacy", text: p.note, createdAt: p.createdAt });
    if (!notes.length) return '<div class="empty-note">' + t("Записів ще немає.") + '</div>';
    return notes.map(function (n) {
      return '<div class="platform-note-row">' +
        '<div class="platform-note-text">' + autoTranslateHtml(n.text) +
          '<span class="platform-note-meta">' + fmtDateHuman((n.createdAt || "").slice(0, 10)) + '</span></div>' +
        '<button class="icon-btn platform-note-remove" data-remove-note="' + escapeHtml(n.id) + '" title="' + t("Видалити запис") + '">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</div>';
    }).join("");
  }

  function wirePlatformNoteRemoveButtons(pid) {
    var list = document.getElementById("platform-notes-list");
    if (!list) return;
    list.querySelectorAll("[data-remove-note]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var noteId = btn.getAttribute("data-remove-note");
        var req = noteId === "__legacy"
          ? api("PATCH", "/api/platforms/" + pid, { note: "" })
          : api("DELETE", "/api/platforms/" + pid + "/notes/" + noteId);
        req.then(function (updated) {
          state.platforms.set(pid, updated);
          list.innerHTML = renderPlatformNotes(updated);
          wirePlatformNoteRemoveButtons(pid);
        }).catch(function (err) { toast(err.message, true); });
      });
    });
  }

  function renderTaskHistory(task) {
    var hist = Array.isArray(task.history) ? task.history.slice().reverse() : [];
    if (!hist.length) return '<div class="empty-note">' + t("Немає історії.") + '</div>';
    return hist.map(function (h) {
      var d = h.changedAt || "";
      return '<div class="platform-task-history-row"><span>' + (h.done ? t("Виконано") : t("Не виконано")) + '</span>' +
        '<span class="platform-note-meta">' + fmtDateHuman(d.slice(0, 10)) + (d.length >= 16 ? " " + d.slice(11, 16) : "") + '</span></div>';
    }).join("");
  }

  // idPrefix keeps history-panel element ids unique when the same task list
  // is rendered in more than one place at once (the edit modal and a
  // widget-card panel both use this, each with their own prefix).
  function renderPlatformTasks(p, idPrefix) {
    idPrefix = idPrefix || "task-history-";
    var tasks = Array.isArray(p.tasks) ? p.tasks : [];
    if (!tasks.length) return '<div class="empty-note">' + t("Завдань ще немає.") + '</div>';
    return tasks.map(function (tk) {
      return '<div class="platform-task-row">' +
        '<button class="platform-task-check' + (tk.done ? ' done' : '') + '" data-toggle-task="' + escapeHtml(tk.id) + '" title="' + (tk.done ? t("Позначити не виконано") : t("Позначити виконано")) + '">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></button>' +
        '<div class="platform-task-title' + (tk.done ? ' done' : '') + '">' + autoTranslateHtml(tk.title) + '</div>' +
        '<button class="icon-btn platform-task-history" data-history-task="' + escapeHtml(tk.id) + '" title="' + t("Історія статусу") + '">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg></button>' +
        '<button class="icon-btn platform-task-remove" data-remove-task="' + escapeHtml(tk.id) + '" title="' + t("Видалити завдання") + '">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<div class="platform-task-history-panel" id="' + idPrefix + escapeHtml(tk.id) + '" hidden></div>' +
      '</div>';
    }).join("");
  }

  function taskCounts(p) {
    var tasks = Array.isArray(p.tasks) ? p.tasks : [];
    return { done: tasks.filter(function (t) { return t.done; }).length, total: tasks.length };
  }

  function wirePlatformTasks(pid, listElId, idPrefix) {
    listElId = listElId || "platform-tasks-list";
    idPrefix = idPrefix || "task-history-";
    var list = document.getElementById(listElId);
    if (!list) return;
    function currentTask(tid) {
      var p = state.platforms.get(pid);
      return p && Array.isArray(p.tasks) ? p.tasks.find(function (t) { return t.id === tid; }) : null;
    }
    function stop(el) {
      el.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      el.addEventListener("click", function (e) { e.stopPropagation(); });
    }
    list.querySelectorAll("[data-toggle-task]").forEach(function (btn) {
      stop(btn);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var tid = btn.getAttribute("data-toggle-task");
        var task = currentTask(tid);
        api("PATCH", "/api/platforms/" + pid + "/tasks/" + tid, { done: !(task && task.done) })
          .then(function (updated) { onPlatformTasksUpdated(pid, updated, listElId, idPrefix); })
          .catch(function (err) { toast(err.message, true); });
      });
    });
    list.querySelectorAll("[data-remove-task]").forEach(function (btn) {
      stop(btn);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var tid = btn.getAttribute("data-remove-task");
        api("DELETE", "/api/platforms/" + pid + "/tasks/" + tid)
          .then(function (updated) { onPlatformTasksUpdated(pid, updated, listElId, idPrefix); })
          .catch(function (err) { toast(err.message, true); });
      });
    });
    list.querySelectorAll("[data-history-task]").forEach(function (btn) {
      stop(btn);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var tid = btn.getAttribute("data-history-task");
        var panel = document.getElementById(idPrefix + tid);
        if (!panel) return;
        if (!panel.hidden) { panel.hidden = true; return; }
        var task = currentTask(tid);
        panel.innerHTML = task ? renderTaskHistory(task) : "";
        panel.hidden = false;
      });
    });
  }

  function onPlatformTasksUpdated(pid, updated, listElId, idPrefix) {
    state.platforms.set(pid, updated);
    var list = document.getElementById(listElId);
    if (list) {
      list.innerHTML = renderPlatformTasks(updated, idPrefix);
      wirePlatformTasks(pid, listElId, idPrefix);
    }
    var toggleBtn = document.querySelector('[data-toggle-tasks="' + pid + '"]');
    if (toggleBtn) toggleBtn.innerHTML = tasksToggleLabel(updated);
  }

  function tasksToggleLabel(p) {
    var c = taskCounts(p);
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
      t(" Завдання") + (c.total ? ' (' + c.done + '/' + c.total + ')' : '');
  }

  function openPlatformModal(id) {
    var p = id ? state.platforms.get(id) : null;
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (p ? t("Редагувати платформу") : t("Нова платформа")) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Назва *") + '</label><input type="text" id="f-title" value="' + (p ? escapeHtml(p.title) : "") + '" placeholder="' + t("Напр. Helpling") + '"></div>' +
          '<div class="field"><label>' + t("Посилання *") + '</label><input type="text" id="f-url" value="' + (p ? escapeHtml(p.url) : "") + '" placeholder="https://..."></div>' +
          (p ?
            '<div class="field"><label>' + t("Завдання") + '</label>' +
              '<div class="platform-tasks" id="platform-tasks-list">' + renderPlatformTasks(p) + '</div>' +
              '<div class="platform-notes-add"><input type="text" id="f-new-task" placeholder="' + t("Нове завдання, напр. «Реєстрація»") + '"><button class="btn btn-sm" id="ov-add-task" type="button">' + t("Додати") + '</button></div>' +
            '</div>'
            : '') +
          (p ?
            '<div class="field"><label>' + t("Нотатки") + '</label>' +
              '<div class="platform-notes" id="platform-notes-list">' + renderPlatformNotes(p) + '</div>' +
              '<div class="platform-notes-add"><input type="text" id="f-new-note" placeholder="' + t("Додати запис, напр. «Зареєструвався», «3 замовлення»") + '"><button class="btn btn-sm" id="ov-add-note" type="button">' + t("Додати") + '</button></div>' +
            '</div>'
            : '<div class="field"><label>' + t("Нотатка") + '</label><input type="text" id="f-note" placeholder="' + t("Коротко, навіщо (необов'язково)") + '"></div>') +
          '<label class="checkbox-field"><input type="checkbox" id="f-done"' + (p && p.done ? " checked" : "") + '> ' + t("Реєстрацію вже виконано") + '</label>' +
        '</div>' +
        '<div class="modal-foot">' + (p ? '<button class="btn btn-danger-text" id="ov-delete">' + t("Видалити") + '</button>' : '<span></span>') + '<button class="btn btn-primary" id="ov-save">' + t("Зберегти") + '</button></div>' +
      '</div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var title = document.getElementById("f-title").value.trim();
      var url = document.getElementById("f-url").value.trim();
      if (!title) { toast("Вкажіть назву", true); return; }
      if (!url) { toast("Вкажіть посилання", true); return; }
      var data = { title: title, url: url, done: document.getElementById("f-done").checked };
      if (!p) data.note = document.getElementById("f-note").value.trim();
      var req = p ? api("PATCH", "/api/platforms/" + p.id, data) : api("POST", "/api/platforms", data);
      req.then(function () { toast(p ? t("Платформу оновлено") : t("Платформу додано")); closeOverlay(); loadAll(); })
        .catch(function (err) { toast(err.message, true); });
    });
    if (p) {
      document.getElementById("ov-delete").addEventListener("click", function () {
        if (!confirm(t("Видалити") + t(" віджет \"") + p.title + '"?')) return;
        api("DELETE", "/api/platforms/" + p.id).then(function () { toast("Платформу видалено"); closeOverlay(); loadAll(); });
      });
      wirePlatformTasks(p.id);
      var addTask = function () {
        var input = document.getElementById("f-new-task");
        var title = input.value.trim();
        if (!title) return;
        api("POST", "/api/platforms/" + p.id + "/tasks", { title: title }).then(function (updated) {
          state.platforms.set(p.id, updated);
          input.value = "";
          var list = document.getElementById("platform-tasks-list");
          if (list) { list.innerHTML = renderPlatformTasks(updated); wirePlatformTasks(p.id); }
        }).catch(function (err) { toast(err.message, true); });
      };
      document.getElementById("ov-add-task").addEventListener("click", addTask);
      document.getElementById("f-new-task").addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addTask(); }
      });
      wirePlatformNoteRemoveButtons(p.id);
      var addNote = function () {
        var input = document.getElementById("f-new-note");
        var text = input.value.trim();
        if (!text) return;
        api("POST", "/api/platforms/" + p.id + "/notes", { text: text }).then(function (updated) {
          state.platforms.set(p.id, updated);
          input.value = "";
          var list = document.getElementById("platform-notes-list");
          if (list) { list.innerHTML = renderPlatformNotes(updated); wirePlatformNoteRemoveButtons(p.id); }
        }).catch(function (err) { toast(err.message, true); });
      };
      document.getElementById("ov-add-note").addEventListener("click", addNote);
      document.getElementById("f-new-note").addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addNote(); }
      });
    }
  }

  /* ============ modals: client ============ */
  function clientOptionsHtml(selectedId) {
    return clientsList().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }).map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selectedId ? " selected" : "") + '>' + escapeHtml(c.name) + '</option>';
    }).join("");
  }

  function closeOverlay() { document.getElementById("modal-root").innerHTML = ""; }

  function openClientModal(id) {
    var c = id ? state.clients.get(id) : { name: "", phone: "", email: "", address: "", status: "lead", notes: "" };
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (id ? t("Редагувати клієнта") : t("Новий клієнт")) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Ім'я / назва *") + '</label><input type="text" id="f-name" value="' + escapeHtml(c.name) + '" placeholder="' + t("Напр. Анна Шмідт") + '"></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Телефон") + '</label><input type="tel" id="f-phone" value="' + escapeHtml(c.phone) + '" placeholder="+49 ..."></div>' +
            '<div class="field"><label>Email</label><input type="email" id="f-email" value="' + escapeHtml(c.email) + '"></div>' +
          '</div>' +
          '<div class="field"><label>' + t("Адреса") + '</label><input type="text" id="f-address" value="' + escapeHtml(c.address) + '" placeholder="' + t("Вулиця, місто") + '"></div>' +
          '<div class="field"><label>' + t("Статус") + '</label><select id="f-status">' +
            ["lead", "active", "inactive"].map(function (s) { return '<option value="' + s + '"' + (c.status === s ? " selected" : "") + '>' + statusLabelClient(s) + '</option>'; }).join("") +
          '</select></div>' +
          '<div class="field"><label>' + t("Нотатки") + '</label><textarea id="f-notes" placeholder="' + t("Особливості об'єкта, домовленості...") + '">' + escapeHtml(c.notes) + '</textarea></div>' +
        '</div>' +
        '<div class="modal-foot">' +
          (id ? '<button class="btn btn-danger-text" id="ov-delete">' + t("Видалити клієнта") + '</button>' : '<span></span>') +
          '<button class="btn btn-primary" id="ov-save">' + t("Зберегти") + '</button>' +
        '</div></div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var name = document.getElementById("f-name").value.trim();
      if (!name) { toast("Вкажіть ім'я клієнта", true); return; }
      var data = {
        name: name,
        phone: document.getElementById("f-phone").value.trim(),
        email: document.getElementById("f-email").value.trim(),
        address: document.getElementById("f-address").value.trim(),
        status: document.getElementById("f-status").value,
        notes: document.getElementById("f-notes").value.trim()
      };
      var req = id ? api("PATCH", "/api/clients/" + id, data) : api("POST", "/api/clients", data);
      req.then(function () { toast(id ? t("Клієнта оновлено") : t("Клієнта додано")); closeOverlay(); loadAll(); })
         .catch(function (err) { toast(err.message, true); });
    });
    if (id) {
      document.getElementById("ov-delete").addEventListener("click", function () {
        if (!confirm(t("Видалити клієнта \"") + c.name + t("\"? Пов'язані завдання й рахунки залишаться в системі."))) return;
        api("DELETE", "/api/clients/" + id).then(function () { toast("Клієнта видалено"); closeOverlay(); loadAll(); });
      });
    }
  }

  function openClientDrawer(id) {
    var c = state.clients.get(id);
    if (!c) return;
    var root = document.getElementById("drawer-root");
    var history = jobsSorted().filter(function (j) { return j.clientId === id; }).reverse();
    var invs = invoicesList().filter(function (i) { return i.clientId === id; });

    root.innerHTML =
      '<div class="drawer-backdrop" id="dr-backdrop"></div><div class="drawer">' +
        '<div class="drawer-head"><div><h3>' + escapeHtml(c.name) + '</h3><span class="pill ' + c.status + '" style="margin-top:6px;"><span class="pill-dot"></span>' + statusLabelClient(c.status) + '</span></div>' +
          '<button class="icon-btn" id="dr-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="drawer-body">' +
          '<div class="drawer-section"><h4>' + t("Контакти") + '</h4><div class="kv">' +
            '<div class="kv-row"><div class="k">' + t("Телефон") + '</div><div class="v">' + escapeHtml(c.phone || "—") + '</div></div>' +
            '<div class="kv-row"><div class="k">Email</div><div class="v">' + escapeHtml(c.email || "—") + '</div></div>' +
            '<div class="kv-row"><div class="k">' + t("Адреса") + '</div><div class="v">' + escapeHtml(c.address || "—") + '</div></div></div></div>' +
          (c.notes ? '<div class="drawer-section"><h4>' + t("Нотатки") + '</h4><div style="font-size:13px;">' + autoTranslateHtml(c.notes) + '</div></div>' : '') +
          '<div class="drawer-section"><h4 style="display:flex; justify-content:space-between; align-items:center;">' + t("Завдання") + ' <button class="btn btn-sm" id="dr-add-job">' + t("+ Додати") + '</button></h4>' +
            (history.length ? history.map(function (j) {
              var repeatIcon = j.seriesId ? '🔁 ' : '';
              return '<div class="job-row"><div class="agenda-date">' + fmtDateHuman(j.date) + '</div><div class="agenda-main"><div class="title">' + repeatIcon + escapeHtml(j.service ? t(j.service) : "") + '</div></div>' +
                '<div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">' +
                  '<span class="pill ' + j.status + '"><span class="pill-dot"></span>' + statusLabelJob(j.status) + '</span>' +
                  '<span class="pill ' + (j.paid ? "paid" : "unpaid") + '"><span class="pill-dot"></span>' + (j.paid ? t("оплачено") : t("не оплачено")) + '</span>' +
                '</div></div>';
            }).join("") : '<div class="empty-note">' + t("Ще немає завдань") + '</div>') + '</div>' +
          '<div class="drawer-section"><h4 style="display:flex; justify-content:space-between; align-items:center;">' + t("Рахунки") + ' <button class="btn btn-sm" id="dr-add-invoice">' + t("+ Додати") + '</button></h4>' +
            (invs.length ? invs.map(function (i) {
              return '<div class="job-row"><div class="agenda-main"><div class="title">' + fmtMoney(i.amount) + '</div><div class="meta">' + escapeHtml(i.note || "") + '</div></div><span class="pill ' + (isOverdue(i) ? "overdue" : i.status) + '"><span class="pill-dot"></span>' + statusLabelInvoice(i) + '</span></div>';
            }).join("") : '<div class="empty-note">' + t("Ще немає рахунків") + '</div>') + '</div>' +
        '</div></div>';

    function close() { root.innerHTML = ""; }
    document.getElementById("dr-close").addEventListener("click", close);
    document.getElementById("dr-backdrop").addEventListener("click", close);
    document.getElementById("dr-add-job").addEventListener("click", function () { close(); openJobModal(null, { clientId: id }); });
    document.getElementById("dr-add-invoice").addEventListener("click", function () { close(); openInvoiceModal(null, { clientId: id }); });
  }

  /* ============ modals: job ============ */
  function openJobModal(id, presets) {
    presets = presets || {};
    if (!clientsList().length) { toast("Спершу додайте хоча б одного клієнта", true); return; }
    var j = id ? state.jobs.get(id) : {
      clientId: presets.clientId || (clientsList()[0] && clientsList()[0].id) || "",
      date: presets.date || state.selectedDay || todayStr(),
      time: "10:00", service: SERVICE_TYPES[0], address: "", price: "", status: "scheduled", notes: "", assignedTo: null,
      paid: false, recurrence: null
    };
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (id ? t("Редагувати завдання") : t("Нове завдання")) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Клієнт *") + '</label><select id="f-client">' + clientOptionsHtml(j.clientId) + '</select></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Дата *") + '</label><input type="date" id="f-date" value="' + j.date + '"></div>' +
            '<div class="field"><label>' + t("Час") + '</label><input type="time" id="f-time" value="' + (j.time || "") + '"></div></div>' +
          '<div class="field"><label>' + t("Тип послуги") + '</label><select id="f-service">' +
            SERVICE_TYPES.map(function (s) { return '<option value="' + escapeHtml(s) + '"' + (j.service === s ? " selected" : "") + '>' + escapeHtml(t(s)) + '</option>'; }).join("") + '</select></div>' +
          '<div class="field"><label>' + t("Адреса об'єкта") + '</label><input type="text" id="f-address" value="' + escapeHtml(j.address) + '"></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Вартість, €") + '</label><input type="number" id="f-price" value="' + escapeHtml(j.price) + '" min="0" step="1"></div>' +
            '<div class="field"><label>' + t("Статус") + '</label><select id="f-status">' +
              ["scheduled", "done", "cancelled"].map(function (s) { return '<option value="' + s + '"' + (j.status === s ? " selected" : "") + '>' + statusLabelJob(s) + '</option>'; }).join("") + '</select></div></div>' +
          '<div class="field"><label>' + t("Виконавець") + '</label><select id="f-assignee"><option value="">' + t("— не призначено —") + '</option>' +
            state.roster.map(function (u) {
              var tag = (u.role === "admin" ? t(" (адмін)") : "") + (u.telegramLinked ? " · Telegram ✓" : t(" · без Telegram"));
              return '<option value="' + u.id + '"' + (j.assignedTo === u.id ? " selected" : "") + '>' + escapeHtml(u.name) + tag + '</option>';
            }).join("") +
          '</select>' +
          '<p class="auth-sub" style="margin-top:6px;">' + t("\"· без Telegram\" — сповіщення про призначення не дійде, доки людина не під'єднає бота.") + '</p></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Оплата") + '</label><select id="f-paid">' +
              '<option value="false"' + (!j.paid ? " selected" : "") + '>' + t("не оплачено") + '</option>' +
              '<option value="true"' + (j.paid ? " selected" : "") + '>' + t("оплачено") + '</option>' +
            '</select></div>' +
            '<div class="field"><label>' + t("Повторення") + '</label><select id="f-recur-freq">' +
              '<option value="">' + t("не повторюється") + '</option>' +
              '<option value="weekly"' + (j.recurrence && j.recurrence.freq === "weekly" ? " selected" : "") + '>' + t("щотижня") + '</option>' +
              '<option value="biweekly"' + (j.recurrence && j.recurrence.freq === "biweekly" ? " selected" : "") + '>' + t("що 2 тижні") + '</option>' +
              '<option value="monthly"' + (j.recurrence && j.recurrence.freq === "monthly" ? " selected" : "") + '>' + t("щомісяця") + '</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="field" id="f-recur-until-wrap" style="' + (j.recurrence ? '' : 'display:none;') + '">' +
            '<label>' + t("Повторювати до (необов'язково)") + '</label>' +
            '<input type="date" id="f-recur-until" value="' + ((j.recurrence && j.recurrence.until) || "") + '">' +
            '<p class="auth-sub" style="margin-top:6px;">' + t("Наступні дати з'являться автоматично (наперед приблизно на 2 місяці). Про кожну згенеровану дату Telegram-сповіщення не надсилається — тільки про перше створене завдання.") + '</p>' +
          '</div>' +
          '<div class="field"><label>' + t("Нотатки") + '</label><textarea id="f-notes">' + escapeHtml(j.notes) + '</textarea></div>' +
        '</div>' +
        '<div class="modal-foot">' + (id ? '<button class="btn btn-danger-text" id="ov-delete">' + t("Видалити") + '</button>' : '<span></span>') +
          '<button class="btn btn-primary" id="ov-save">' + t("Зберегти") + '</button></div></div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var date = document.getElementById("f-date").value;
      if (!date) { toast("Вкажіть дату", true); return; }
      var data = {
        clientId: document.getElementById("f-client").value,
        date: date,
        time: document.getElementById("f-time").value,
        service: document.getElementById("f-service").value,
        address: document.getElementById("f-address").value.trim(),
        price: document.getElementById("f-price").value ? Number(document.getElementById("f-price").value) : null,
        status: document.getElementById("f-status").value,
        notes: document.getElementById("f-notes").value.trim(),
        assignedTo: document.getElementById("f-assignee").value || null,
        paid: document.getElementById("f-paid").value === "true"
      };
      var recurFreq = document.getElementById("f-recur-freq").value;
      data.recurrence = recurFreq ? { freq: recurFreq, until: document.getElementById("f-recur-until").value || null } : null;
      var req = id ? api("PATCH", "/api/jobs/" + id, data) : api("POST", "/api/jobs", data);
      req.then(function () { toast(id ? t("Завдання оновлено") : t("Завдання заплановано")); closeOverlay(); loadAll(); })
         .catch(function (err) { toast(err.message, true); });
    });
    if (id) {
      document.getElementById("ov-delete").addEventListener("click", function () {
        if (!confirm(t("Видалити це завдання?"))) return;
        api("DELETE", "/api/jobs/" + id).then(function () { toast("Завдання видалено"); closeOverlay(); loadAll(); });
      });
    }
    document.getElementById("f-client").addEventListener("change", function (e) {
      var c = state.clients.get(e.target.value);
      if (c && c.address && !document.getElementById("f-address").value) document.getElementById("f-address").value = c.address;
    });
    document.getElementById("f-recur-freq").addEventListener("change", function (e) {
      document.getElementById("f-recur-until-wrap").style.display = e.target.value ? "" : "none";
    });
  }

  /* ============ modals: invoice ============ */
  function openInvoiceModal(id, presets) {
    presets = presets || {};
    if (!clientsList().length) { toast("Спершу додайте хоча б одного клієнта", true); return; }
    var i = id ? state.invoices.get(id) : {
      clientId: presets.clientId || (clientsList()[0] && clientsList()[0].id) || "",
      amount: "", issueDate: todayStr(), dueDate: todayStr(), status: "unpaid", note: ""
    };
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (id ? t("Редагувати рахунок") : t("Новий рахунок")) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Клієнт *") + '</label><select id="f-client">' + clientOptionsHtml(i.clientId) + '</select></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Сума, € *") + '</label><input type="number" id="f-amount" value="' + escapeHtml(i.amount) + '" min="0" step="1"></div>' +
            '<div class="field"><label>' + t("Статус") + '</label><select id="f-status">' +
              ["unpaid", "paid"].map(function (s) { return '<option value="' + s + '"' + (i.status === s ? " selected" : "") + '>' + (s === "unpaid" ? t("неоплачено") : t("оплачено")) + '</option>'; }).join("") + '</select></div></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Дата виставлення") + '</label><input type="date" id="f-issue" value="' + i.issueDate + '"></div>' +
            '<div class="field"><label>' + t("Термін оплати") + '</label><input type="date" id="f-due" value="' + i.dueDate + '"></div></div>' +
          '<div class="field"><label>' + t("Опис") + '</label><input type="text" id="f-note" value="' + escapeHtml(i.note) + '" placeholder="' + t("Напр. Генеральне прибирання, вул. ...") + '"></div>' +
        '</div>' +
        '<div class="modal-foot">' + (id ? '<button class="btn btn-danger-text" id="ov-delete">' + t("Видалити") + '</button>' : '<span></span>') +
          '<button class="btn btn-primary" id="ov-save">' + t("Зберегти") + '</button></div></div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var amount = Number(document.getElementById("f-amount").value);
      if (!amount) { toast("Вкажіть суму", true); return; }
      var data = {
        clientId: document.getElementById("f-client").value,
        amount: amount,
        issueDate: document.getElementById("f-issue").value,
        dueDate: document.getElementById("f-due").value,
        status: document.getElementById("f-status").value,
        note: document.getElementById("f-note").value.trim()
      };
      var req = id ? api("PATCH", "/api/invoices/" + id, data) : api("POST", "/api/invoices", data);
      req.then(function () { toast(id ? t("Рахунок оновлено") : t("Рахунок створено")); closeOverlay(); loadAll(); })
         .catch(function (err) { toast(err.message, true); });
    });
    if (id) {
      document.getElementById("ov-delete").addEventListener("click", function () {
        if (!confirm(t("Видалити цей рахунок?"))) return;
        api("DELETE", "/api/invoices/" + id).then(function () { toast("Рахунок видалено"); closeOverlay(); loadAll(); });
      });
    }
  }

  /* ============ render: inventory (admin) ============ */
  function renderInventory() {
    if (!state.me || state.me.role !== "admin") return;
    var tbody = document.getElementById("inventory-tbody");
    var list = inventoryList().sort(function (a, b) { return (a.name || "").localeCompare(b.name || "", "uk"); });

    document.getElementById("inventory-empty").hidden = !!list.length;
    document.querySelector("#view-inventory .table-wrap").style.display = list.length ? "" : "none";

    tbody.innerHTML = list.map(function (it) {
      var stockPill = '<span class="pill ' + (it.low ? "overdue" : "active") + '"><span class="pill-dot"></span>' + Number(it.quantity) + " " + escapeHtml(t(it.unit)) + '</span>';
      var thumb = it.photo
        ? '<img src="' + it.photo + '" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover;flex-shrink:0;">'
        : '<div style="width:34px;height:34px;border-radius:8px;background:var(--surface-3);flex-shrink:0;"></div>';
      return '<tr class="clickable" data-item="' + it.id + '">' +
        '<td><div style="display:flex;align-items:center;gap:10px;">' + thumb +
          '<div><div class="cell-title" style="margin:0;">' + escapeHtml(it.name) + '</div>' +
          (it.code ? '<div class="cell-sub">№ ' + escapeHtml(it.code) + '</div>' : '') + '</div></div></td>' +
        '<td>' + stockPill + '</td>' +
        '<td class="cell-sub">' + Number(it.minQuantity || 0) + ' ' + escapeHtml(t(it.unit)) + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-sm" data-log-usage="' + it.id + '">' + t("Списати") + '</button>' +
          '<button class="btn btn-sm btn-ghost" data-log-restock="' + it.id + '">' + t("Поповнити") + '</button>' +
          '<button class="icon-btn" data-edit-item="' + it.id + '" title="' + t("Редагувати") + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
        '</div></td></tr>';
    }).join("");

    document.getElementById("nav-count-inventory").textContent = list.filter(function (it) { return it.low; }).length || "";

    tbody.querySelectorAll("tr[data-item]").forEach(function (row) {
      row.addEventListener("click", function (ev) {
        if (ev.target.closest("button")) return;
        openInventoryDrawer(row.getAttribute("data-item"));
      });
    });
    tbody.querySelectorAll("[data-log-usage]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) { ev.stopPropagation(); openInventoryLogModal(btn.getAttribute("data-log-usage"), "usage"); });
    });
    tbody.querySelectorAll("[data-log-restock]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) { ev.stopPropagation(); openInventoryLogModal(btn.getAttribute("data-log-restock"), "restock"); });
    });
    tbody.querySelectorAll("[data-edit-item]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) { ev.stopPropagation(); openInventoryItemModal(btn.getAttribute("data-edit-item")); });
    });
  }

  /* ============ modal: inventory item (create/edit) ============ */
  // Photos are stored as compressed data: URLs right on the item record (no
  // separate file/blob storage in this app), so we resize+recompress client
  // side before ever sending anything — keeps records small regardless of
  // the original photo's size.
  function resizeImageFile(file, maxDim, quality, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var cw = Math.max(1, Math.round(img.width * scale));
        var ch = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        cb(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = function () { toast("Не вдалося прочитати зображення", true); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function photoPreviewHtml(photo) {
    return photo ? '<img id="photo-preview" src="' + photo + '" style="width:80px;height:80px;border-radius:10px;object-fit:cover;">' : '';
  }

  function openInventoryItemModal(id) {
    var it = id ? state.inventory.get(id) : { name: "", unit: t("л"), quantity: 0, minQuantity: 0, code: "", photo: null };
    var photoValue = it.photo || null;
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (id ? t("Редагувати товар") : t("Новий товар")) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Назва *") + '</label><input type="text" id="f-name" value="' + escapeHtml(it.name) + '" placeholder="' + t("Напр. Засіб для скла") + '"></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>' + t("Одиниця виміру") + '</label><select id="f-unit">' +
              UNITS.map(function (u) { return '<option value="' + u + '"' + (it.unit === u ? " selected" : "") + '>' + escapeHtml(t(u)) + '</option>'; }).join("") +
            '</select></div>' +
            (id ? '' : '<div class="field"><label>' + t("Початковий залишок") + '</label><input type="number" id="f-qty" value="' + it.quantity + '" min="0" step="0.1"></div>') +
          '</div>' +
          '<div class="field"><label>' + t("Мінімальний залишок (поріг попередження)") + '</label><input type="number" id="f-min" value="' + (it.minQuantity || 0) + '" min="0" step="0.1"></div>' +
          '<div class="field"><label>' + t("Інвентарний номер") + '</label><input type="text" id="f-code" value="' + escapeHtml(it.code || "") + '" placeholder="' + t("Напр. INV-001") + '"></div>' +
          '<div class="field"><label>' + t("Фото товару") + '</label>' +
            '<div id="photo-preview-wrap" style="margin-bottom:8px;">' + photoPreviewHtml(photoValue) + '</div>' +
            '<input type="file" id="f-photo" accept="image/*">' +
            '<button type="button" class="btn btn-sm btn-ghost" id="photo-remove" style="margin-top:6px;' + (photoValue ? '' : 'display:none;') + '">' + t("Видалити фото") + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-foot">' + (id ? '<button class="btn btn-danger-text" id="ov-delete">' + t("Видалити") + '</button>' : '<span></span>') +
          '<button class="btn btn-primary" id="ov-save">' + t("Зберегти") + '</button></div></div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });

    document.getElementById("f-photo").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      resizeImageFile(file, 640, 0.72, function (dataUrl) {
        photoValue = dataUrl;
        document.getElementById("photo-preview-wrap").innerHTML = photoPreviewHtml(photoValue);
        document.getElementById("photo-remove").style.display = "";
      });
    });
    document.getElementById("photo-remove").addEventListener("click", function () {
      photoValue = null;
      document.getElementById("f-photo").value = "";
      document.getElementById("photo-preview-wrap").innerHTML = "";
      document.getElementById("photo-remove").style.display = "none";
    });

    document.getElementById("ov-save").addEventListener("click", function () {
      var name = document.getElementById("f-name").value.trim();
      if (!name) { toast("Вкажіть назву товару", true); return; }
      var data = {
        name: name,
        unit: document.getElementById("f-unit").value,
        minQuantity: document.getElementById("f-min").value ? Number(document.getElementById("f-min").value) : 0,
        code: document.getElementById("f-code").value.trim(),
        photo: photoValue
      };
      if (!id) data.quantity = document.getElementById("f-qty").value ? Number(document.getElementById("f-qty").value) : 0;
      var req = id ? api("PATCH", "/api/inventory/" + id, data) : api("POST", "/api/inventory", data);
      req.then(function () { toast(id ? t("Товар оновлено") : t("Товар додано")); closeOverlay(); loadAll(); })
         .catch(function (err) { toast(err.message, true); });
    });
    if (id) {
      document.getElementById("ov-delete").addEventListener("click", function () {
        if (!confirm(t("Видалити товар \"") + it.name + t("\" зі складу? Історію списань буде збережено."))) return;
        api("DELETE", "/api/inventory/" + id).then(function () { toast("Товар видалено"); closeOverlay(); loadAll(); });
      });
    }
  }

  /* ============ modal: log usage / restock ============ */
  function inventoryJobOptionsHtml() {
    var jobs = jobsSorted().slice().reverse();
    return '<option value="">' + t("— не пов'язано із завданням —") + '</option>' + jobs.map(function (j) {
      return '<option value="' + j.id + '">' + fmtDateHuman(j.date) + " · " + escapeHtml(clientName(j.clientId)) + (j.service ? " · " + escapeHtml(t(j.service)) : "") + '</option>';
    }).join("");
  }

  function openInventoryLogModal(itemId, type) {
    var it = state.inventory.get(itemId);
    if (!it) return;
    var isUsage = type === "usage";
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + (isUsage ? t("Списати: ") : t("Поповнити: ")) + escapeHtml(it.name) + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<p class="auth-sub">' + t("Поточний залишок: ") + Number(it.quantity) + " " + escapeHtml(t(it.unit)) + '</p>' +
          '<div class="field"><label>' + t("Кількість (") + escapeHtml(t(it.unit)) + ') *</label><input type="number" id="f-qty" min="0.01" step="0.1" autofocus></div>' +
          (isUsage ? '<div class="field"><label>' + t("Завдання") + '</label><select id="f-job">' + inventoryJobOptionsHtml() + '</select></div>' : '') +
          '<div class="field"><label>' + t("Нотатка") + '</label><input type="text" id="f-note" placeholder="' + t("Напр. причина, партія...") + '"></div>' +
        '</div>' +
        '<div class="modal-foot"><span></span><button class="btn btn-primary" id="ov-save">' + (isUsage ? t("Списати") : t("Додати на склад")) + '</button></div></div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var qty = Number(document.getElementById("f-qty").value);
      if (!qty || qty <= 0) { toast("Вкажіть кількість більше нуля", true); return; }
      var data = {
        type: type,
        quantity: qty,
        note: document.getElementById("f-note").value.trim()
      };
      if (isUsage) {
        var jobId = document.getElementById("f-job").value;
        if (jobId) data.jobId = jobId;
      }
      api("POST", "/api/inventory/" + itemId + "/log", data).then(function () {
        toast(isUsage ? t("Списано зі складу") : t("Склад поповнено"));
        closeOverlay(); loadAll();
      }).catch(function (err) { toast(err.message, true); });
    });
  }

  /* ============ drawer: inventory item history ============ */
  function openInventoryDrawer(id) {
    var it = state.inventory.get(id);
    if (!it) return;
    var root = document.getElementById("drawer-root");
    root.innerHTML =
      '<div class="drawer-backdrop" id="dr-backdrop"></div><div class="drawer">' +
        '<div class="drawer-head"><div><h3>' + escapeHtml(it.name) + '</h3><span class="pill ' + (it.low ? "overdue" : "active") + '" style="margin-top:6px;"><span class="pill-dot"></span>' + Number(it.quantity) + ' ' + escapeHtml(t(it.unit)) + '</span></div>' +
          '<button class="icon-btn" id="dr-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="drawer-body">' +
          '<div class="drawer-section"><h4>' + t("Інформація") + '</h4>' +
            (it.photo ? '<img src="' + it.photo + '" alt="" style="width:100%;max-width:220px;border-radius:12px;object-fit:cover;display:block;margin-bottom:12px;">' : '') +
            '<div class="kv">' +
            (it.code ? '<div class="kv-row"><div class="k">' + t("Інв. номер") + '</div><div class="v">' + escapeHtml(it.code) + '</div></div>' : '') +
            '<div class="kv-row"><div class="k">' + t("Залишок") + '</div><div class="v">' + Number(it.quantity) + ' ' + escapeHtml(t(it.unit)) + '</div></div>' +
            '<div class="kv-row"><div class="k">' + t("Мінімальний залишок") + '</div><div class="v">' + Number(it.minQuantity || 0) + ' ' + escapeHtml(t(it.unit)) + '</div></div></div></div>' +
          '<div class="drawer-section"><h4>' + t("Історія") + '</h4><div id="inv-log-list"><div class="empty-note">' + t("Завантаження...") + '</div></div></div>' +
        '</div></div>';

    function close() { root.innerHTML = ""; }
    document.getElementById("dr-close").addEventListener("click", close);
    document.getElementById("dr-backdrop").addEventListener("click", close);

    api("GET", "/api/inventory/logs?itemId=" + id).then(function (logs) {
      var el = document.getElementById("inv-log-list");
      if (!el) return; // drawer already closed
      if (!logs.length) { el.innerHTML = '<div class="empty-note">' + t("Ще немає записів.") + '</div>'; return; }
      el.innerHTML = logs.map(function (l) {
        var typeLabel = l.type === "usage" ? t("Списано") : l.type === "restock" ? t("Поповнено") : t("Коригування");
        var sign = l.type === "usage" ? "−" : l.type === "restock" ? "+" : "";
        return '<div class="job-row"><div class="agenda-date">' + fmtDateHuman((l.createdAt || "").slice(0, 10)) + '</div>' +
          '<div class="agenda-main"><div class="title">' + typeLabel + ": " + sign + Number(l.quantity) + " " + escapeHtml(l.unit || "") + '</div>' +
          '<div class="meta">' + (l.jobLabel ? escapeHtml(l.jobLabel) + " · " : "") + escapeHtml(l.userName || "") + (l.note ? " · " + autoTranslateHtml(l.note) : "") + '</div></div></div>';
      }).join("");
    }).catch(function () {
      var el = document.getElementById("inv-log-list");
      if (el) el.innerHTML = '<div class="empty-note">' + t("Не вдалося завантажити історію.") + '</div>';
    });
  }

  /* ============ modal: new employee ============ */
  function openUserModal() {
    var root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" id="ov-backdrop"><div class="modal">' +
        '<div class="modal-head"><h3>' + t("Новий співробітник") + '</h3>' +
          '<button class="icon-btn" id="ov-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>' + t("Ім'я") + '</label><input type="text" id="f-name" placeholder="' + t("Напр. Марія") + '"></div>' +
          '<div class="field"><label>' + t("Логін *") + '</label><input type="text" id="f-username" placeholder="maria"></div>' +
          '<div class="field"><label>' + t("Пароль *") + '</label><input type="password" id="f-password" placeholder="' + t("Мінімум 8 символів") + '"></div>' +
          '<div class="field"><label>' + t("Роль") + '</label><select id="f-role"><option value="employee">' + t("Співробітник") + '</option><option value="admin">' + t("Адміністратор") + '</option></select></div>' +
        '</div>' +
        '<div class="modal-foot"><span></span><button class="btn btn-primary" id="ov-save">' + t("Створити") + '</button></div></div></div>';

    document.getElementById("ov-close").addEventListener("click", closeOverlay);
    document.getElementById("ov-backdrop").addEventListener("click", function (e) { if (e.target.id === "ov-backdrop") closeOverlay(); });
    document.getElementById("ov-save").addEventListener("click", function () {
      var data = {
        name: document.getElementById("f-name").value.trim(),
        username: document.getElementById("f-username").value.trim(),
        password: document.getElementById("f-password").value,
        role: document.getElementById("f-role").value
      };
      if (!data.username || !data.password) { toast("Заповніть логін і пароль", true); return; }
      api("POST", "/api/users", data).then(function () { toast("Співробітника додано"); closeOverlay(); loadAll(); })
        .catch(function (err) { toast(err.message, true); });
    });
  }

  /* ============ master render ============ */
  function render() {
    if (!state.me) return;
    if (state.view === "dashboard") renderDashboard();
    if (state.view === "clients") renderClients();
    if (state.view === "invoices") renderInvoices();
    if (state.view === "inventory") renderInventory();
    if (state.view === "team") renderTeam();
    if (state.view === "roadmap") renderRoadmap();
    if (state.view === "orders") renderOrders();
    document.getElementById("nav-count-clients").textContent = state.clients.size || "";
    document.getElementById("nav-count-invoices").textContent = invoicesList().filter(function (i) { return i.status === "unpaid"; }).length || "";
    if (state.me.role === "admin") {
      document.getElementById("nav-count-inventory").textContent = inventoryList().filter(function (it) { return it.low; }).length || "";
    }
  }

  /* ============ mobile menu (hamburger) ============ */
  function openMobileMenu() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebar-backdrop").classList.add("open");
  }
  function closeMobileMenu() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-backdrop").classList.remove("open");
  }
  var btnMenuOpen = document.getElementById("btn-menu-open");
  if (btnMenuOpen) btnMenuOpen.addEventListener("click", openMobileMenu);
  var btnMenuClose = document.getElementById("btn-menu-close");
  if (btnMenuClose) btnMenuClose.addEventListener("click", closeMobileMenu);
  var sidebarBackdrop = document.getElementById("sidebar-backdrop");
  if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileMenu);

  /* ============ static wiring ============ */
  document.querySelectorAll(".nav-item").forEach(function (el) {
    el.addEventListener("click", function () { setView(el.getAttribute("data-view")); closeMobileMenu(); });
  });
  document.getElementById("btn-new-client").addEventListener("click", function () { openClientModal(null); });
  document.getElementById("btn-new-client-dash").addEventListener("click", function () { openClientModal(null); });
  document.getElementById("btn-new-job-dash").addEventListener("click", function () { openJobModal(null); });
  document.getElementById("btn-new-invoice").addEventListener("click", function () { openInvoiceModal(null); });
  document.getElementById("btn-new-user").addEventListener("click", function () { openUserModal(); });
  document.getElementById("btn-new-inventory-item").addEventListener("click", function () { openInventoryItemModal(null); });
  document.getElementById("btn-new-roadmap").addEventListener("click", function () { openRoadmapModal(null); });
  document.getElementById("btn-new-order").addEventListener("click", function () { openPlatformModal(null); });
  var btnExportInvoices = document.getElementById("btn-export-invoices");
  if (btnExportInvoices) btnExportInvoices.addEventListener("click", exportInvoicesCsv);

  document.getElementById("cal-prev").addEventListener("click", function () {
    state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderCalendar();
  });
  document.getElementById("cal-next").addEventListener("click", function () {
    state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    renderCalendar();
  });

  document.getElementById("client-search").addEventListener("input", function (e) { state.clientQuery = e.target.value; renderClients(); });
  document.querySelectorAll("#view-clients .filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll("#view-clients .filter-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      state.clientFilter = chip.getAttribute("data-status");
      renderClients();
    });
  });
  document.querySelectorAll("#view-invoices .filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll("#view-invoices .filter-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      state.invoiceFilter = chip.getAttribute("data-inv-status");
      renderInvoices();
    });
  });

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
  });

  boot();
})();
