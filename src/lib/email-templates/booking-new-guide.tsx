import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface Props {
  guideName?: string
  customerName?: string
  customerEmail?: string
  experience?: string
  date?: string
  startTime?: string
  guests?: number
  total?: number
  notes?: string
  bookingUrl?: string
  status?: 'confirmed' | 'pending'
  locale?: Locale | string
}

const T = {
  previewPending: { ru: 'Новая заявка на бронирование', uz: 'Yangi bron arizasi', en: 'New booking request' },
  previewConfirmed: { ru: 'Новое подтверждённое бронирование', uz: 'Yangi tasdiqlangan bron', en: 'New confirmed booking' },
  headingPending: { ru: 'Новая заявка', uz: 'Yangi ariza', en: 'New request' },
  headingConfirmed: { ru: 'Новое бронирование', uz: 'Yangi bron', en: 'New booking' },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  introPending: { ru: 'Поступила новая заявка — пожалуйста, подтвердите или отклоните её.', uz: 'Yangi ariza keldi — iltimos, tasdiqlang yoki rad eting.', en: 'A new request came in — please confirm or decline it.' },
  introConfirmed: { ru: 'У вас новое подтверждённое бронирование.', uz: 'Sizda yangi tasdiqlangan bron bor.', en: 'You have a new confirmed booking.' },
  experience: { ru: 'Опыт', uz: 'Sayohat', en: 'Experience' },
  client: { ru: 'Клиент', uz: 'Mijoz', en: 'Customer' },
  email: { ru: 'Email', uz: 'Email', en: 'Email' },
  date: { ru: 'Дата', uz: 'Sana', en: 'Date' },
  at: { ru: 'в', uz: 'da', en: 'at' },
  guests: { ru: 'Гостей', uz: 'Mehmonlar', en: 'Guests' },
  total: { ru: 'Сумма', uz: 'Jami', en: 'Total' },
  notes: { ru: 'Заметки', uz: 'Izohlar', en: 'Notes' },
  cta: { ru: 'Открыть в кабинете гида', uz: 'Yo‘lboshchi kabinetida ochish', en: 'Open in guide dashboard' },
  footer: { ru: 'Отвечайте быстро — это повышает шанс, что клиент придёт.', uz: 'Tez javob bering — bu mijozning kelishi ehtimolini oshiradi.', en: 'Reply quickly — it improves the chance the customer shows up.' },
  subjectConfirmed: { ru: 'Новое бронирование — Hamroh', uz: 'Yangi bron — Hamroh', en: 'New booking — Hamroh' },
  subjectPending: { ru: 'Новая заявка на бронирование — Hamroh', uz: 'Yangi bron arizasi — Hamroh', en: 'New booking request — Hamroh' },
}

const Email = ({
  guideName, customerName, customerEmail, experience, date, startTime,
  guests, total, notes, bookingUrl, status, locale,
}: Props) => {
  const L = normalizeLocale(locale)
  const isPending = status !== 'confirmed'
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(isPending ? T.previewPending : T.previewConfirmed, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(isPending ? T.headingPending : T.headingConfirmed, L)}</Heading>
          <Text style={styles.text}>
            {pick(T.greet, L)(guideName)} {pick(isPending ? T.introPending : T.introConfirmed, L)}
          </Text>
          <Section style={card}>
            {experience && <Text style={row}><b>{pick(T.experience, L)}:</b> {experience}</Text>}
            {customerName && <Text style={row}><b>{pick(T.client, L)}:</b> {customerName}</Text>}
            {customerEmail && <Text style={row}><b>{pick(T.email, L)}:</b> {customerEmail}</Text>}
            {date && <Text style={row}><b>{pick(T.date, L)}:</b> {date}{startTime ? ` ${pick(T.at, L)} ${startTime}` : ''}</Text>}
            {guests != null && <Text style={row}><b>{pick(T.guests, L)}:</b> {guests}</Text>}
            {total != null && <Text style={row}><b>{pick(T.total, L)}:</b> {total} TJS</Text>}
            {notes && <Text style={row}><b>{pick(T.notes, L)}:</b> {notes}</Text>}
          </Section>
          {bookingUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={bookingUrl} style={styles.button}>{pick(T.cta, L)}</Button>
            </Section>
          )}
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const card = { ...styles.text, background: '#ffffff', border: `1px solid ${BRAND.border}`, borderRadius: '10px', padding: '16px 20px', margin: '8px 0 24px' } as const
const row = { margin: '4px 0', fontSize: '14px', color: BRAND.text, lineHeight: '1.6' } as const

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const L = normalizeLocale(d?.locale)
    return d?.status === 'confirmed' ? pick(T.subjectConfirmed, L) : pick(T.subjectPending, L)
  },
  displayName: 'New booking (guide)',
  previewData: {
    guideName: 'Мария', customerName: 'Алексей', customerEmail: 'a@example.com',
    experience: 'Прогулка по Старому городу', date: '2026-06-15', startTime: '10:00',
    guests: 2, total: 240, notes: 'Будем с ребёнком',
    bookingUrl: 'https://hamrohim.com/guide', status: 'pending', locale: 'ru',
  },
} satisfies TemplateEntry
