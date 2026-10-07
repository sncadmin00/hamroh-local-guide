import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  locale?: Locale | string
}

const T = {
  preview: { ru: (s: string) => `Подтвердите email для ${s}`, uz: (s: string) => `${s} uchun emailni tasdiqlang`, en: (s: string) => `Confirm your email for ${s}` },
  heading: { ru: 'Подтвердите ваш email', uz: 'Emailingizni tasdiqlang', en: 'Confirm your email' },
  body: {
    ru: 'Добро пожаловать в',
    uz: 'Xush kelibsiz —',
    en: 'Welcome to',
  },
  body2: {
    ru: 'Подтвердите адрес',
    uz: 'Manzilni tasdiqlang:',
    en: 'Confirm the address',
  },
  body3: {
    ru: ', нажав на кнопку ниже:',
    uz: ', quyidagi tugmani bosing:',
    en: ' by clicking the button below:',
  },
  cta: { ru: 'Подтвердить email', uz: 'Emailni tasdiqlash', en: 'Confirm email' },
  footer: { ru: 'Если вы не регистрировались — просто проигнорируйте это письмо.', uz: 'Agar siz ro‘yxatdan o‘tmagan bo‘lsangiz — bu xatni e’tiborsiz qoldiring.', en: "If you didn't sign up — just ignore this email." },
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl, locale }: SignupEmailProps) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)(siteName)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>
            {pick(T.body, L)}{' '}
            <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>!{' '}
            {pick(T.body2, L)}{' '}
            <Link href={`mailto:${recipient}`} style={styles.link}>{recipient}</Link>
            {pick(T.body3, L)}
          </Text>
          <Link href={confirmationUrl} style={styles.button}>{pick(T.cta, L)}</Link>
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail
