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
  guests?: number
  total?: number
  bookingUrl?: string
  status?: 'confirmed' | 'pending'
  locale?: Locale | string
}

const T = {
  previewConfirmed: { ru: 'Ваше бронирование подтверждено', uz: 'Bronyangiz tasdiqlandi', en: 'Your booking is confirmed' },
  previewPending: { ru: 'Ваша заявка отправлена гиду', uz: 'Arizangiz yo‘lboshchiga yuborildi', en: 'Your request has been sent to the guide' },
  headingConfirmed: { ru: 'Бронирование подтверждено', uz: 'Bron tasdiqlandi', en: 'Booking confirmed' },
  headingPending: { ru: 'Заявка отправлена', uz: 'Ariza yuborildi', en: 'Request sent' },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  introConfirmed: { ru: 'Ваше бронирование на Hamroh подтверждено.', uz: 'Hamroh’dagi bronyangiz tasdiqlandi.', en: 'Your Hamroh booking is confirmed.' },
  introPending: { ru: 'Мы получили вашу заявку и передали её гиду. Он подтвердит её в ближайшее время.', uz: 'Arizangizni qabul qildik va yo‘lboshchiga yubordik. Yaqin orada tasdiqlaydi.', en: 'We received your request and forwarded it to the guide. They will confirm shortly.' },
  experience: { ru: 'Опыт', uz: 'Sayohat', en: 'Experience' },
  guide: { ru: 'Гид', uz: 'Yo‘lboshchi', en: 'Guide' },
  date: { ru: 'Дата', uz: 'Sana', en: 'Date' },
  at: { ru: 'в', uz: 'da', en: 'at' },
  guests: { ru: 'Гостей', uz: 'Mehmonlar', en: 'Guests' },
  total: { ru: 'Сумма', uz: 'Jami', en: 'Total' },
  cta: { ru: 'Посмотреть бронирование', uz: 'Bronni ko‘rish', en: 'View booking' },
  footer: { ru: 'Если у вас вопросы — напишите гиду в чате бронирования.', uz: 'Savollar bo‘lsa, yo‘lboshchiga bron chatida yozing.', en: 'Questions? Message your guide in the booking chat.' },
  subjectConfirmed: { ru: 'Бронирование подтверждено — Hamroh', uz: 'Bron tasdiqlandi — Hamroh', en: 'Booking confirmed — Hamroh' },
  subjectPending: { ru: 'Заявка отправлена — Hamroh', uz: 'Ariza yuborildi — Hamroh', en: 'Request sent — Hamroh' },
}

const Email = ({
  customerName, guideName, experience, date, startTime, guests, total, bookingUrl, status, locale,
}: Props) => {
  const L = normalizeLocale(locale)
  const isConfirmed = status === 'confirmed'
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(isConfirmed ? T.previewConfirmed : T.previewPending, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(isConfirmed ? T.headingConfirmed : T.headingPending, L)}</Heading>
          <Text style={styles.text}>
            {pick(T.greet, L)(customerName)} {pick(isConfirmed ? T.introConfirmed : T.introPending, L)}
          </Text>
          <Section style={card}>
            {experience && <Text style={row}><b>{pick(T.experience, L)}:</b> {experience}</Text>}
            {guideName && <Text style={row}><b>{pick(T.guide, L)}:</b> {guideName}</Text>}
            {date && <Text style={row}><b>{pick(T.date, L)}:</b> {date}{startTime ? ` ${pick(T.at, L)} ${startTime}` : ''}</Text>}
            {guests != null && <Text style={row}><b>{pick(T.guests, L)}:</b> {guests}</Text>}
            {total != null && <Text style={row}><b>{pick(T.total, L)}:</b> {total} TJS</Text>}
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
  displayName: 'Booking confirmation (client)',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария', experience: 'Прогулка по Старому городу',
    date: '2026-06-15', startTime: '10:00', guests: 2, total: 240,
    bookingUrl: 'https://hamrohim.com/my-bookings', status: 'confirmed', locale: 'ru',
  },
} satisfies TemplateEntry
