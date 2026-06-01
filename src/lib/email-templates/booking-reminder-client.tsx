import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface Props {
  customerName?: string
  guideName?: string
  experience?: string
  date?: string
  startTime?: string
  bookingUrl?: string
  locale?: Locale | string
}

const T = {
  preview: { ru: 'Напоминание: ваш тур завтра', uz: 'Eslatma: sayohatingiz ertaga', en: 'Reminder: your tour is tomorrow' },
  heading: { ru: 'Ваш тур уже завтра', uz: 'Sayohatingiz ertaga', en: 'Your tour is tomorrow' },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  intro: { ru: 'Напоминаем о вашем туре с Hamroh.', uz: 'Hamroh bilan sayohatingizni eslatamiz.', en: 'A quick reminder about your Hamroh tour.' },
  experience: { ru: 'Опыт', uz: 'Sayohat', en: 'Experience' },
  guide: { ru: 'Гид', uz: 'Yo‘lboshchi', en: 'Guide' },
  when: { ru: 'Когда', uz: 'Qachon', en: 'When' },
  at: { ru: 'в', uz: 'da', en: 'at' },
  cta: { ru: 'Открыть бронирование', uz: 'Bronni ochish', en: 'Open booking' },
  footer: { ru: 'Если планы изменились — свяжитесь с гидом через чат бронирования.', uz: 'Rejalar o‘zgargan bo‘lsa, yo‘lboshchi bilan bron chatida bog‘laning.', en: 'Plans changed? Reach out to your guide via the booking chat.' },
  subject: { ru: 'Напоминание: ваш тур завтра — Hamroh', uz: 'Eslatma: sayohatingiz ertaga — Hamroh', en: 'Reminder: your tour is tomorrow — Hamroh' },
}

const Email = ({ customerName, guideName, experience, date, startTime, bookingUrl, locale }: Props) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>{pick(T.greet, L)(customerName)} {pick(T.intro, L)}</Text>
          <Section style={card}>
            {experience && <Text style={row}><b>{pick(T.experience, L)}:</b> {experience}</Text>}
            {guideName && <Text style={row}><b>{pick(T.guide, L)}:</b> {guideName}</Text>}
            {date && <Text style={row}><b>{pick(T.when, L)}:</b> {date}{startTime ? ` ${pick(T.at, L)} ${startTime}` : ''}</Text>}
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
  displayName: 'Booking reminder (client)',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария',
    experience: 'Прогулка по Старому городу',
    date: '2026-06-15', startTime: '10:00',
    bookingUrl: 'https://hamrohim.com/my-bookings', locale: 'ru',
  },
} satisfies TemplateEntry
