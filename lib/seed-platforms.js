// One-time (idempotent) seed of recommended lead-generation and tender
// platforms for the "Замовлення" (Orders) view, auto tab. These are
// suggestions curated by the assistant, not entered by an admin by hand —
// hence source: "auto". Safe to run on every boot: it only inserts
// platforms whose title isn't already present with source "auto", so it
// never duplicates and never touches manually-added (source: "manual")
// records.
const store = require("./store");

const AUTO_PLATFORMS = [
  // ---- Платформи з оплатою за лід (pay-per-lead) ----
  {
    title: "MyHammer",
    url: "https://www.myhammer.de",
    note: "Оплата за кожен відкритий контакт (лід), сума залежить від розміру замовлення (від кількох € до 70+ €). Є опція базової підписки."
  },
  {
    title: "CHECK24 Profis",
    url: "https://profis.check24.de",
    note: "Оплата за лід при відкритті заявки клієнта, орієнтовно €50–120 за велике замовлення. Лід надсилається кільком виконавцям одночасно."
  },
  {
    title: "Aroundhome",
    url: "https://www.aroundhome.de",
    note: "Фіксована ціна за якісний лід, без комісії з виручки. Рахунок раз на 2 тижні, можна скасувати щомісяця."
  },
  {
    title: "Fixando",
    url: "https://www.fixando.de",
    note: "Система кредитів: ~€3 за кредит на подання пропозиції клієнту. Без підписки і без комісії з виконаного замовлення."
  },
  {
    title: "Blauarbeit",
    url: "https://www.blauarbeit.de",
    note: "Фіксована місячна плата (орієнтовно €99/міс) за доступ до заявок клієнтів — не класична оплата за лід, а флет-рейт."
  },
  {
    title: "Entscheider.com",
    url: "https://www.entscheider.com",
    note: "Оплата за кожен переданий контакт клієнта (лід). Точні тарифи й наявність категорії клінінгу варто уточнити напряму."
  },
  {
    title: "11880.com",
    url: "https://www.11880.com",
    note: "Безкоштовний базовий запис у каталозі. Платні пакети реклами/сервісу заявок для більшої видимості (орієнтовно від €250/міс)."
  },
  {
    title: "Gelbe Seiten",
    url: "https://www.gelbeseiten.de",
    note: "Безкоштовний базовий запис, платні преміум-пакети для більшої видимості й кількості звернень."
  },
  {
    title: "Das Örtliche",
    url: "https://www.dasoertliche.de",
    note: "Аналогічно Gelbe Seiten: безкоштовний базовий запис + платна реклама для підприємців."
  },
  {
    title: "Das Telefonbuch",
    url: "https://www.dastelefonbuch.de",
    note: "Безкоштовний базовий запис + платні пакети підвищеної видимості."
  },
  {
    title: "Cylex",
    url: "https://www.cylex.de",
    note: "Безкоштовний і платний «Преміум» запис у каталозі для більшої кількості звернень."
  },
  {
    title: "meinestadt.de",
    url: "https://unternehmen.meinestadt.de/werben",
    note: "Міський портал (актуально для Мюнхена): безкоштовні записи + платна реклама для локальних клієнтів."
  },
  {
    title: "Helpling",
    url: "https://www.helpling.de",
    note: "Комісія платформи: 32% з разового замовлення, 39% з перших 3 регулярних візитів, потім 25%. Є напрямок B2B/офісний клінінг."
  },
  {
    title: "Tiger Facility Services (кол. Book a Tiger)",
    url: "https://www.tigerfacilityservices.com",
    note: "Програма партнерства для клінінгових компаній, замовлення через реферальну мережу. Точний % комісії уточнюється при реєстрації."
  },
  {
    title: "Batmaid",
    url: "https://www.batmaid.de",
    note: "Підтверджена робота в Берліні/Франкфурті/Гамбурзі (Мюнхен не підтверджено). Умови для компаній-підрядників варто уточнити напряму."
  },
  {
    title: "sub-reiniger.de",
    url: "https://www.sub-reiniger.de",
    note: "Нішева біржа субпідряду саме для клінінгу. Безкоштовно для пошуку субпідрядників, умови власного розміщення — уточнити на сайті."
  },
  {
    title: "Auftragsbank.de",
    url: "https://www.auftragsbank.de",
    note: "Активні оголошення по клінінгу в Мюнхені. Тарифи: безкоштовний Basis, Premium ~€49.90/міс, Pro ~€69.90/міс (є річні знижки)."
  },
  {
    title: "ProvenExpert",
    url: "https://www.provenexpert.com",
    note: "Платформа відгуків/репутації з платним тарифом «Business» для більшої видимості профілю й вхідних заявок."
  },
  {
    title: "Wer liefert was (wlw.de)",
    url: "https://www.wlw.de",
    note: "B2B-платформа пошуку постачальників; більше орієнтована на товари, ніж клінінгові послуги — актуальність під питанням."
  },
  {
    title: "Europages",
    url: "https://www.europages.com",
    note: "Загальноєвропейський B2B-каталог, платне преміум-членство для більшої видимості. Фокус більше на товарних постачальниках."
  },
  // ---- Платформи з підпискою / реєстрацією на тендери ----
  {
    title: "DTAD (Deutscher Tender- und Ausschreibungsdienst)",
    url: "https://www.dtad.com",
    note: "Загальнонімецький агрегатор тендерів, підписка орієнтовно від €100/міс із ранніми сповіщеннями. Точний тариф — уточнити напряму."
  },
  {
    title: "Vergabe24",
    url: "https://www.vergabe24.de",
    note: "Агрегатор тендерів з тарифними планами для учасників закупівель, орієнтовно від €80/міс."
  },
  {
    title: "subreport ELViS",
    url: "https://www.subreport.de",
    note: "Платформа пошуку тендерів і участі в е-закупівлях, підписка орієнтовно від €50/міс."
  },
  {
    title: "evergabe.de",
    url: "https://www.evergabe.de",
    note: "Приватний агрегатор тендерів з тарифами Basic/Pro/Pro 3+, є окрема сторінка тендерів з клінінгу для Мюнхена."
  },
  {
    title: "Deutsches Ausschreibungsblatt",
    url: "https://www.deutsches-ausschreibungsblatt.de",
    note: "Тривало діючий тендерний вісник Німеччини, доступ за підпискою."
  },
  {
    title: "Tendigo",
    url: "https://www.tendigo.de",
    note: "Спеціалізується саме на тендерах з клінінгу/Gebäudereinigung (моніторить 800+ джерел), є безкоштовний пробний місяць."
  },
  {
    title: "Tendit",
    url: "https://www.usetendit.com",
    note: "AI-підбір тендерів, орієнтовно від €199/міс, є 2-тижневий пробний період."
  },
  {
    title: "Patterno",
    url: "https://www.patterno.de",
    note: "AI-пошук тендерів по 4500+ порталах закупівель, тарифи орієнтовно €99–€2499/міс залежно від плану."
  },
  {
    title: "ibau.de",
    url: "https://www.ibau.de",
    note: "Давній тендерний сервіс з категоріями Gebäudereinigung/Gebäudeservice, підписка/реєстрація — тариф за запитом."
  },
  {
    title: "Vergabepilot.AI",
    url: "https://www.vergabepilot.ai",
    note: "AI-підбір тендерів, є безкоштовний Basic-тариф і платні плани орієнтовно від €60/міс (річна оплата)."
  }
];

async function seedAutoPlatforms() {
  let existing;
  try {
    existing = await store.list("platforms");
  } catch (err) {
    console.error("[seed-platforms] could not read platforms collection:", err.message);
    return;
  }
  const existingAutoTitles = new Set(
    existing.filter((p) => p.source === "auto").map((p) => p.title)
  );
  let added = 0;
  for (const p of AUTO_PLATFORMS) {
    if (existingAutoTitles.has(p.title)) continue;
    try {
      await store.create("platforms", {
        title: p.title,
        url: p.url,
        note: p.note,
        done: false,
        source: "auto",
        tasks: [],
        notes: []
      });
      added++;
    } catch (err) {
      console.error("[seed-platforms] failed to insert " + p.title + ":", err.message);
    }
  }
  if (added) console.log("[seed-platforms] inserted " + added + " recommended platform(s) into Замовлення (auto tab).");
}

module.exports = { seedAutoPlatforms, AUTO_PLATFORMS };
