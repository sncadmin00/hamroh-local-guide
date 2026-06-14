## Модуль Earnings & Reports

Реализуем MVP по ТЗ: дашборд доходов, история транзакций и выплат, месячный/годовой PDF-отчёт, CSV-экспорт, отображение ИНН самозанятого, доступ из админки.

### Решения, которые нужно подтвердить

1. **Комиссия Hamroh** — в системе сейчас её нет. Предлагаю: единый процент в `app_settings` (по умолчанию **15%**), редактируется в админке, применяется к завершённым (`completed`) бронированиям. Net = total × (1 − commission). Подтвердите ставку или скажите «оставь 15%».
2. **Выплаты** — реально интеграции банка нет. Сделаю CRUD выплат в админке (admin создаёт запись «выплачено N сум гиду X», метод: Bank / Click / Payme / Cash; статусы Scheduled / Processing / Paid / Failed; номер `PAY-YYYY-000001`). Гид видит только список. ОК?
3. **Статус самозанятого/ИП** — добавлю поле `tax_status` на `guides` (`self_employed` / `ip` / `none`) + `tax_id` (мигрируется из `guide_application.tax_id` при finalize, плюс гид может отредактировать в Profile).
4. **Phase 2** (XLSX, email-рассылка, Soliq) — НЕ делаем в этом подходе, только заглушки/пометки.

### Что строим

**База данных (1 миграция):**
- `app_settings` (key/value JSON) — для `hamroh_commission_rate`.
- `payouts` (id, guide_id, payout_number, amount, currency, method, status, scheduled_at, paid_at, reference, notes).
- `payout_items` (payout_id, booking_id, gross_amount, commission_amount, net_amount) — связь выплаты с конкретными бронированиями.
- `guides.tax_status`, `guides.tax_id` (+ перенос из `guide_applications` при finalize).
- RLS: гид видит свои выплаты/items; admin — все. GRANT соответственно.

**Server functions (`src/lib/earnings.functions.ts`):**
- `getMyEarningsSummary({ period })` — KPI + статистика за период.
- `listMyTransactions({ from, to, status?, tour_id? })` — постранично, с расчётом fee/net.
- `listMyPayouts()` / `getMyPayout(id)`.
- `getEarningsReportData({ kind: 'month'|'year'|'tax', from, to })` — единый источник данных для PDF/CSV.
- Admin-версии: `adminListGuideEarnings`, `adminListGuidePayouts`, `adminCreatePayout`, `adminUpdatePayoutStatus`.

**Server routes (PDF):**
- `src/routes/api/guide/reports/monthly.pdf.ts` (auth via `requireSupabaseAuth`-эквивалент в route — проверка сессии и принадлежности данных).
- `…/annual.pdf.ts`, `…/tax-summary.pdf.ts`.
- CSV: тот же путь, расширение `.csv` — генерируется на лету.
- PDF собирается через `pdf-lib` (уже используется в `booking-pdf.server.ts`) с шапкой «Hamroh», блоком гид/ИНН/статус, сводкой и таблицей.

**Кабинет гида (`/guide`):**
- Новый таб **Earnings** (иконка `Wallet`).
- Компонент `src/components/guide/EarningsPanel.tsx`:
  - 4 KPI-карточки (This Month).
  - Селектор периода (Today/Week/Month/Year/Custom) + блок Gross/Commission/Net/AvgBooking.
  - Подразделы-табы внутри: **Transactions**, **Payouts**, **Reports**.
  - Reports: кнопки «Monthly Report», «Annual Report», «Tax Summary» (PDF + CSV), селектор месяца/года.

**Админка (`/admin`):**
- Новый таб **Earnings** (`src/components/admin/EarningsAdminPanel.tsx`):
  - Список гидов с агрегатами (всего заработано, к выплате, выплачено).
  - На карточке гида: ФИО, ИНН, статус, кнопки «Открыть отчёты», «Создать выплату».
  - Форма создания выплаты: выбор неоплаченных bookings → расчёт суммы → создать запись.
  - Изменение статуса выплаты.
- Настройка комиссии в общем разделе admin settings (или внутри панели Earnings).

**i18n:** все строки в RU/UZ/EN через существующие `i18n`, `guide-i18n`, `admin-i18n`.

### Технические детали

- Net расчёт делается в SQL view или в server fn (выбираю server fn для гибкости — `bookings.status='completed'` × `(1 − rate)`).
- Номер выплаты `PAY-YYYY-NNNNNN` — sequence + триггер.
- PDF — pdf-lib, шрифт NotoSans уже подгружен в проекте (см. `src/assets/fonts/`).
- CSV — простой генератор строк (без зависимостей), UTF-8 BOM для Excel.
- Phase 2 элементы (XLSX, авто-email, Soliq) — оставляю в коде TODO-комменты, кнопки скрыты.

### Файлы

```text
supabase/migrations/<ts>_earnings_module.sql      (новая)
src/lib/earnings.functions.ts                     (новая)
src/lib/earnings-report.server.ts                 (PDF/CSV генерация)
src/routes/api/guide/reports/monthly.pdf.ts       (новая)
src/routes/api/guide/reports/annual.pdf.ts        (новая)
src/routes/api/guide/reports/tax-summary.pdf.ts   (новая)
src/routes/api/guide/reports/[kind].csv.ts        (новая)
src/components/guide/EarningsPanel.tsx            (новая)
src/components/admin/EarningsAdminPanel.tsx       (новая)
src/routes/guide.tsx                              (добавить таб)
src/routes/admin.tsx                              (добавить таб)
src/lib/i18n.tsx, guide-i18n.ts, admin-i18n.ts    (строки)
src/components/guide/ProfilePanel.tsx             (поля ИНН/статус)
src/lib/guide-approval.functions.ts               (перенос tax_id из application)
```

### Критерии приёмки

Гид видит KPI, фильтрует транзакции, скачивает PDF/CSV месячного и годового отчёта, видит выплаты со статусами. Админ видит всё то же по любому гиду и заводит выплаты. ИНН/статус самозанятого отображаются и в кабинете гида, и в отчётах, и в админке.

Подтвердите ставку комиссии (15%?) и подход к выплатам — после этого начинаю реализацию.