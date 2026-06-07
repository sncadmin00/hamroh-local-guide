import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

type Status = 'confirmed' | 'declined' | 'cancelled' | 'rescheduled'

interface Props {
  customerName?: string
  guideName?: string
  experience?: string
  date?: string
  startTime?: string
  newDate?: string
  newStartTime?: string
  reason?: string
  bookingUrl?: string
  pdfUrl?: string
  status: Status
  locale?: Locale | string
}

const T = {
  preview: {
    confirmed: { ru: 'Гид подтвердил ваше бронирование', uz: 'Yo‘lboshchi bronni tasdiqladi', en: 'Your booking has been confirmed' },
    declined: { ru: 'Гид отклонил вашу заявку', uz: 'Yo‘lboshchi arizani rad etdi', en: 'Your request was declined' },
    cancelled: { ru: 'Гид отменил бронирование', uz: 'Yo‘lboshchi bronni bekor qildi', en: 'Your booking was cancelled' },
    rescheduled: { ru: 'Изменилось время вашей экскурсии', uz: 'Sayohat vaqti o‘zgardi', en: 'Your tour time changed' },
  },
  heading: {
    confirmed: { ru: 'Бронирование подтверждено', uz: 'Bron tasdiqlandi', en: 'Booking confirmed' },
    declined: { ru: 'Заявка отклонена', uz: 'Ariza rad etildi', en: 'Request declined' },
    cancelled: { ru: 'Бронирование отменено', uz: 'Bron bekor qilindi', en: 'Booking cancelled' },
    rescheduled: { ru: 'Время экскурсии изменено', uz: 'Vaqt o‘zgardi', en: 'Tour time updated' },
  },
  intro: {
    confirmed: { ru: (g?: string) => `${g ?? 'Гид'} подтвердил ваше бронирование. До встречи!`, uz: (g?: string) => `${g ?? 'Yo‘lboshchi'} bronni tasdiqladi. Ko‘rishguncha!`, en: (g?: string) => `${g ?? 'Your guide'} confirmed your booking. See you soon!` },
    declined: { ru: (g?: string) => `К сожалению, ${g ?? 'гид'} не смог принять заявку. Попробуйте другого гида или другую дату.`, uz: (g?: string) => `Afsus, ${g ?? 'yo‘lboshchi'} arizangizni qabul qila olmadi. Boshqa yo‘lboshchi yoki sanani sinab ko‘ring.`, en: (g?: string) => `Unfortunately ${g ?? 'the guide'} can’t take this request. Please try a different guide or date.` },
    cancelled: { ru: (g?: string) => `${g ?? 'Гид'} был вынужден отменить ваше бронирование.`, uz: (g?: string) => `${g ?? 'Yo‘lboshchi'} bronni bekor qilishga majbur bo‘ldi.`, en: (g?: string) => `${g ?? 'Your guide'} had to cancel this booking.` },
    rescheduled: { ru: (g?: string) => `${g ?? 'Гид'} предлагает новое время — пожалуйста, подтвердите его в чате.`, uz: (g?: string) => `${g ?? 'Yo‘lboshchi'} yangi vaqt taklif qilmoqda — chatda tasdiqlang.`, en: (g?: string) => `${g ?? 'Your guide'} proposes a new time — please confirm in chat.` },
  },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  experience: { ru: 'Опыт', uz: 'Sayohat', en: 'Experience' },
  date: { ru: 'Дата', uz: 'Sana', en: 'Date' },
  newDate: { ru: 'Новая дата', uz: 'Yangi sana', en: 'New date' },
  at: { ru: 'в', uz: 'da', en: 'at' },
  reason: { ru: 'Причина', uz: 'Sabab', en: 'Reason' },
  ctaOpen: { ru: 'Открыть бронирование', uz: 'Bronni ochish', en: 'Open booking' },
  ctaBrowse: { ru: 'Найти другого гида', uz: 'Boshqa yo‘lboshchi topish', en: 'Find another guide' },
  ctaPdf: { ru: 'Скачать PDF-подтверждение', uz: 'PDF tasdiqni yuklab olish', en: 'Download PDF confirmation' },
  thanks: { ru: 'Спасибо, что пользуетесь Hamroh.', uz: 'Hamroh’dan foydalanganingiz uchun rahmat.', en: 'Thanks for using Hamroh.' },
  subject: {
    confirmed: { ru: 'Бронирование подтверждено — Hamroh', uz: 'Bron tasdiqlandi — Hamroh', en: 'Booking confirmed — Hamroh' },
    declined: { ru: 'Заявка отклонена — Hamroh', uz: 'Ariza rad etildi — Hamroh', en: 'Request declined — Hamroh' },
    cancelled: { ru: 'Бронирование отменено — Hamroh', uz: 'Bron bekor qilindi — Hamroh', en: 'Booking cancelled — Hamroh' },
    rescheduled: { ru: 'Изменилось время экскурсии — Hamroh', uz: 'Sayohat vaqti o‘zgardi — Hamroh', en: 'Tour time updated — Hamroh' },
  },
}

const Email = ({
  customerName, guideName, experience, date, startTime,
  newDate, newStartTime, reason, bookingUrl, pdfUrl, status, locale,
}: Props) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview[status], L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading[status], L)}</Heading>
          <Text style={styles.text}>
            {pick(T.greet, L)(customerName)} {pick(T.intro[status], L)(guideName)}
          </Text>
          <Section style={card}>
            {experience && <Text style={row}><b>{pick(T.experience, L)}:</b> {experience}</Text>}
            {date && <Text style={row}><b>{pick(T.date, L)}:</b> {date}{startTime ? ` ${pick(T.at, L)} ${startTime}` : ''}</Text>}
            {newDate && status === 'rescheduled' && (
              <Text style={row}><b>{pick(T.newDate, L)}:</b> {newDate}{newStartTime ? ` ${pick(T.at, L)} ${newStartTime}` : ''}</Text>
            )}
            {reason && <Text style={row}><b>{pick(T.reason, L)}:</b> {reason}</Text>}
          </Section>
          {bookingUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={bookingUrl} style={styles.button}>
                {pick(status === 'declined' || status === 'cancelled' ? T.ctaBrowse : T.ctaOpen, L)}
              </Button>
            </Section>
          )}
          {pdfUrl && status === 'confirmed' && (
            <Section style={{ textAlign: 'center', marginTop: '12px' }}>
              <Button href={pdfUrl} style={{ ...styles.button, background: '#ffffff', color: BRAND.text, border: `1px solid ${BRAND.border}` }}>
                {pick(T.ctaPdf, L)}
              </Button>
            </Section>
          )}
          <Text style={styles.footer}>{pick(T.thanks, L)}</Text>
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
    const status = (d?.status as Status) ?? 'confirmed'
    return pick(T.subject[status], L)
  },
  displayName: 'Booking status update (client)',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария',
    experience: 'Прогулка по Старому городу', date: '2026-06-15', startTime: '10:00',
    bookingUrl: 'https://hamrohim.com/my-bookings', status: 'confirmed', locale: 'ru',
  },
} satisfies TemplateEntry
