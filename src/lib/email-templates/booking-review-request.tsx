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
  reviewUrl?: string
  locale?: Locale | string
}

const T = {
  preview: { ru: 'Как прошёл ваш тур? Поделитесь впечатлениями', uz: 'Sayohatingiz qanday o‘tdi? Taassurotlaringiz bilan bo‘lishing', en: 'How was your tour? Share your impressions' },
  heading: { ru: 'Как всё прошло?', uz: 'Hammasi qanday o‘tdi?', en: 'How did it go?' },
  greet: { ru: (n?: string) => n ? `Здравствуйте, ${n}!` : 'Здравствуйте!', uz: (n?: string) => n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!', en: (n?: string) => n ? `Hi ${n},` : 'Hi,' },
  body1: {
    ru: (exp?: string, g?: string) => `Надеемся, ваш опыт${exp ? ` «${exp}»` : ''}${g ? ` с гидом ${g}` : ''} был незабываемым.`,
    uz: (exp?: string, g?: string) => `Sayohatingiz${exp ? ` «${exp}»` : ''}${g ? ` ${g} bilan` : ''} unutilmas bo‘lganiga umid qilamiz.`,
    en: (exp?: string, g?: string) => `We hope your${exp ? ` "${exp}"` : ''} experience${g ? ` with ${g}` : ''} was unforgettable.`,
  },
  body2: { ru: 'Поделитесь впечатлениями — ваш отзыв поможет другим путешественникам и поддержит гида.', uz: 'Taassurotlaringiz bilan bo‘lishing — sharhingiz boshqa sayyohlarga yordam beradi va yo‘lboshchini qo‘llab-quvvatlaydi.', en: 'Share your experience — your review helps other travelers and supports the guide.' },
  cta: { ru: 'Оставить отзыв', uz: 'Sharh qoldirish', en: 'Leave a review' },
  footer: { ru: 'Спасибо, что выбрали Hamroh.', uz: 'Hamroh’ni tanlaganingiz uchun rahmat.', en: 'Thanks for choosing Hamroh.' },
  subject: { ru: 'Как прошёл ваш тур? — Hamroh', uz: 'Sayohatingiz qanday o‘tdi? — Hamroh', en: 'How was your tour? — Hamroh' },
}

const Email = ({ customerName, guideName, experience, reviewUrl, locale }: Props) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>{pick(T.greet, L)(customerName)} {pick(T.body1, L)(experience, guideName)}</Text>
          <Text style={styles.text}>{pick(T.body2, L)}</Text>
          {reviewUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={reviewUrl} style={styles.button}>{pick(T.cta, L)}</Button>
            </Section>
          )}
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => pick(T.subject, normalizeLocale(d?.locale)),
  displayName: 'Booking review request',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария',
    experience: 'Прогулка по Старому городу',
    reviewUrl: 'https://hamrohim.com/my-bookings', locale: 'ru',
  },
} satisfies TemplateEntry
