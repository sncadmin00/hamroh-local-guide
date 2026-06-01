import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface Props {
  name?: string
  exploreUrl?: string
  locale?: Locale | string
}

const T = {
  preview: {
    ru: 'Добро пожаловать в Hamroh — найдите своего гида',
    uz: 'Hamroh’ga xush kelibsiz — o‘z yo‘lboshchingizni toping',
    en: 'Welcome to Hamroh — find your local guide',
  },
  heading: {
    ru: 'Добро пожаловать в Hamroh!',
    uz: 'Hamroh’ga xush kelibsiz!',
    en: 'Welcome to Hamroh!',
  },
  greet: {
    ru: (n?: string) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    uz: (n?: string) => (n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!'),
    en: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
  },
  body1: {
    ru: 'Спасибо за регистрацию. Hamroh подбирает проверенных локальных гидов в Узбекистане — от прогулок по Старому городу до гастро-туров и фотосессий.',
    uz: 'Ro‘yxatdan o‘tganingiz uchun rahmat. Hamroh O‘zbekistondagi tasdiqlangan mahalliy yo‘lboshchilarni tanlab beradi — Eski shaharda sayrlardan tortib gastro-turlar va fotosessiyalargacha.',
    en: 'Thanks for signing up. Hamroh matches you with verified local guides across Uzbekistan — from old-town walks to food tours and photoshoots.',
  },
  body2: {
    ru: 'Расскажите AI о своей поездке — и мы найдём идеального гида за секунды.',
    uz: 'AI’ga sayohatingiz haqida ayting — va biz mukammal yo‘lboshchini soniyalarda topib beramiz.',
    en: 'Tell our AI about your trip — and we’ll match you with the perfect guide in seconds.',
  },
  cta: { ru: 'Найти гида', uz: 'Yo‘lboshchi topish', en: 'Find a guide' },
  footer: {
    ru: 'Хорошего путешествия! — команда Hamroh',
    uz: 'Yaxshi sayohat! — Hamroh jamoasi',
    en: 'Safe travels! — The Hamroh team',
  },
  subject: {
    ru: 'Добро пожаловать в Hamroh',
    uz: 'Hamroh’ga xush kelibsiz',
    en: 'Welcome to Hamroh',
  },
}

const Email = ({ name, exploreUrl, locale }: Props) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>{pick(T.greet, L)(name)}</Text>
          <Text style={styles.text}>{pick(T.body1, L)}</Text>
          <Text style={styles.text}>{pick(T.body2, L)}</Text>
          {exploreUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={exploreUrl} style={styles.button}>{pick(T.cta, L)}</Button>
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
  displayName: 'Welcome',
  previewData: {
    name: 'Алексей',
    exploreUrl: 'https://hamrohim.com/',
    locale: 'ru',
  },
} satisfies TemplateEntry
