import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: Locale | string
}

const T = {
  preview: { ru: (s: string) => `Ссылка для входа в ${s}`, uz: (s: string) => `${s} ga kirish havolasi`, en: (s: string) => `Sign-in link for ${s}` },
  heading: { ru: 'Ссылка для входа', uz: 'Kirish havolasi', en: 'Sign-in link' },
  body: {
    ru: (s: string) => `Нажмите кнопку ниже, чтобы войти в ${s}. Ссылка действует ограниченное время.`,
    uz: (s: string) => `${s} ga kirish uchun quyidagi tugmani bosing. Havola cheklangan vaqt ichida amal qiladi.`,
    en: (s: string) => `Click the button below to sign in to ${s}. The link is valid for a limited time.`,
  },
  cta: { ru: 'Войти', uz: 'Kirish', en: 'Sign in' },
  footer: { ru: 'Если вы не запрашивали вход — просто проигнорируйте это письмо.', uz: 'Agar siz kirishni so‘ramagan bo‘lsangiz — bu xatni e’tiborsiz qoldiring.', en: "If you didn't request a sign-in — just ignore this email." },
}

export const MagicLinkEmail = ({ siteName, confirmationUrl, locale }: MagicLinkEmailProps) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)(siteName)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>{pick(T.body, L)(siteName)}</Text>
          <Link href={confirmationUrl} style={styles.button}>{pick(T.cta, L)}</Link>
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
