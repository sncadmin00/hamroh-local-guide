import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface Props {
  recipientName?: string
  senderName?: string
  messagePreview?: string
  bookingExperience?: string
  bookingUrl?: string
  locale?: Locale | string
}

const T = {
  previewWith: { ru: (s: string) => `Новое сообщение от ${s}`, uz: (s: string) => `${s} dan yangi xabar`, en: (s: string) => `New message from ${s}` },
  previewNo: { ru: 'У вас новое сообщение', uz: 'Sizda yangi xabar bor', en: 'You have a new message' },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  body: {
    ru: (sender?: string, exp?: string) => `У вас непрочитанное сообщение${sender ? ` от ${sender}` : ''}${exp ? ` по бронированию «${exp}»` : ''}.`,
    uz: (sender?: string, exp?: string) => `Sizda o‘qilmagan xabar bor${sender ? `, ${sender} dan` : ''}${exp ? ` («${exp}» bron bo‘yicha)` : ''}.`,
    en: (sender?: string, exp?: string) => `You have an unread message${sender ? ` from ${sender}` : ''}${exp ? ` about "${exp}"` : ''}.`,
  },
  cta: { ru: 'Открыть переписку', uz: 'Suhbatni ochish', en: 'Open conversation' },
  footer: { ru: 'Вы получили это письмо, потому что в чате бронирования есть непрочитанное сообщение.', uz: 'Bu xatni oldingiz, chunki bron chatida o‘qilmagan xabar bor.', en: "You're receiving this because there's an unread message in your booking chat." },
  subjectWith: { ru: (s: string) => `Новое сообщение от ${s} — Hamroh`, uz: (s: string) => `${s} dan yangi xabar — Hamroh`, en: (s: string) => `New message from ${s} — Hamroh` },
  subjectNo: { ru: 'У вас новое сообщение — Hamroh', uz: 'Sizda yangi xabar bor — Hamroh', en: 'You have a new message — Hamroh' },
}

const Email = ({ recipientName, senderName, messagePreview, bookingExperience, bookingUrl, locale }: Props) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{senderName ? pick(T.previewWith, L)(senderName) : pick(T.previewNo, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.greet, L)(recipientName)}</Heading>
          <Text style={styles.text}>{pick(T.body, L)(senderName, bookingExperience)}</Text>
          {messagePreview && (
            <Section style={quoteBox}>
              <Text style={quoteText}>«{messagePreview}»</Text>
            </Section>
          )}
          {bookingUrl && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={bookingUrl} style={styles.button}>{pick(T.cta, L)}</Button>
            </Section>
          )}
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const quoteBox = { borderLeft: `3px solid ${BRAND.primary}`, background: '#ffffff', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' } as const
const quoteText = { fontSize: '15px', color: BRAND.text, lineHeight: '1.5', margin: 0, fontStyle: 'italic' as const }

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const L = normalizeLocale(d?.locale)
    return d?.senderName ? pick(T.subjectWith, L)(d.senderName) : pick(T.subjectNo, L)
  },
  displayName: 'Unread chat message',
  previewData: {
    recipientName: 'Алексей', senderName: 'Мария',
    messagePreview: 'Здравствуйте! Жду нашу встречу завтра — 10:00 подходит?',
    bookingExperience: 'Прогулка по Старому городу',
    bookingUrl: 'https://hamrohim.com/messages/example', locale: 'ru',
  },
} satisfies TemplateEntry
