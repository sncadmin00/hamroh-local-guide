import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: Locale | string
}

const T = {
  preview: { ru: (s: string) => `Сброс пароля для ${s}`, uz: (s: string) => `${s} uchun parolni tiklash`, en: (s: string) => `Reset your password for ${s}` },
  heading: { ru: 'Сброс пароля', uz: 'Parolni tiklash', en: 'Reset password' },
  body: {
    ru: (s: string) => `Мы получили запрос на сброс пароля для ${s}. Нажмите кнопку ниже, чтобы задать новый пароль.`,
    uz: (s: string) => `${s} uchun parolni tiklash so‘rovini oldik. Yangi parol o‘rnatish uchun quyidagi tugmani bosing.`,
    en: (s: string) => `We received a password reset request for ${s}. Click the button below to set a new password.`,
  },
  cta: { ru: 'Сбросить пароль', uz: 'Parolni tiklash', en: 'Reset password' },
  footer: { ru: 'Если вы не запрашивали сброс пароля — проигнорируйте это письмо. Пароль останется прежним.', uz: 'Agar siz parolni tiklashni so‘ramagan bo‘lsangiz — bu xatni e’tiborsiz qoldiring. Parol o‘zgarmaydi.', en: "If you didn't request a password reset, ignore this email. Your password will stay the same." },
}

export const RecoveryEmail = ({ siteName, confirmationUrl, locale }: RecoveryEmailProps) => {
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

export default RecoveryEmail
