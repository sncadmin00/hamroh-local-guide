import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface Props {
  guideName?: string
  customerName?: string
  experience?: string
  date?: string
  startTime?: string
  reason?: string
  bookingUrl?: string
  locale?: Locale | string
}

const T = {
  preview: { ru: 'Клиент отменил бронирование', uz: 'Mijoz bronni bekor qildi', en: 'A client cancelled a booking' },
  heading: { ru: 'Бронирование отменено клиентом', uz: 'Mijoz bronni bekor qildi', en: 'Booking cancelled by client' },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  intro: { ru: (c?: string) => `${c ?? 'Клиент'} отменил(а) бронирование. Слот снова свободен.`, uz: (c?: string) => `${c ?? 'Mijoz'} bronni bekor qildi. Vaqt yana bo‘sh.`, en: (c?: string) => `${c ?? 'The customer'} cancelled the booking. The slot is free again.` },
  experience: { ru: 'Опыт', uz: 'Sayohat', en: 'Experience' },
  client: { ru: 'Клиент', uz: 'Mijoz', en: 'Customer' },
  date: { ru: 'Дата', uz: 'Sana', en: 'Date' },
  at: { ru: 'в', uz: 'da', en: 'at' },
  reason: { ru: 'Причина', uz: 'Sabab', en: 'Reason' },
  cta: { ru: 'Открыть кабинет гида', uz: 'Kabinetni ochish', en: 'Open guide dashboard' },
  footer: { ru: 'Свободные слоты вновь видны клиентам.', uz: 'Bo‘sh vaqtlar mijozlarga yana ko‘rinadi.', en: 'Open slots are visible to customers again.' },
  subject: { ru: 'Клиент отменил бронирование — Hamroh', uz: 'Mijoz bronni bekor qildi — Hamroh', en: 'A client cancelled — Hamroh' },
}

const Email = ({ guideName, customerName, experience, date, startTime, reason, bookingUrl, locale }: Props) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>
            {pick(T.greet, L)(guideName)} {pick(T.intro, L)(customerName)}
          </Text>
          <Section style={card}>
            {experience && <Text style={row}><b>{pick(T.experience, L)}:</b> {experience}</Text>}
            {customerName && <Text style={row}><b>{pick(T.client, L)}:</b> {customerName}</Text>}
            {date && <Text style={row}><b>{pick(T.date, L)}:</b> {date}{startTime ? ` ${pick(T.at, L)} ${startTime}` : ''}</Text>}
            {reason && <Text style={row}><b>{pick(T.reason, L)}:</b> {reason}</Text>}
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
  subject: (d: Record<string, any>) => pick(T.subject, normalizeLocale(d?.locale)),
  displayName: 'Booking cancelled by client (guide)',
  previewData: {
    guideName: 'Мария', customerName: 'Алексей',
    experience: 'Прогулка по Старому городу', date: '2026-06-15', startTime: '10:00',
    reason: 'Изменились планы', bookingUrl: 'https://hamrohim.com/guide', locale: 'ru',
  },
} satisfies TemplateEntry
