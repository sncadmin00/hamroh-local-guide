import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  locale?: Locale | string
}

const T = {
  preview: { ru: (s: string) => `Подтвердите смену email для ${s}`, uz: (s: string) => `${s} uchun email o‘zgarishini tasdiqlang`, en: (s: string) => `Confirm your email change for ${s}` },
  heading: { ru: 'Подтвердите смену email', uz: 'Email o‘zgarishini tasdiqlang', en: 'Confirm email change' },
  body1: {
    ru: (s: string) => `Вы запросили смену email для ${s} с`,
    uz: (s: string) => `${s} uchun emailni o‘zgartirishni so‘radingiz:`,
    en: (s: string) => `You requested an email change for ${s} from`,
  },
  on: { ru: 'на', uz: '→', en: 'to' },
  body2: { ru: 'Нажмите кнопку ниже, чтобы подтвердить смену:', uz: 'O‘zgarishni tasdiqlash uchun quyidagi tugmani bosing:', en: 'Click the button below to confirm the change:' },
  cta: { ru: 'Подтвердить смену email', uz: 'Email o‘zgarishini tasdiqlash', en: 'Confirm email change' },
  footer: { ru: 'Если вы не запрашивали смену — срочно защитите свой аккаунт.', uz: 'Agar siz o‘zgartirishni so‘ramagan bo‘lsangiz — zudlik bilan hisobingizni himoya qiling.', en: "If you didn't request this change, secure your account immediately." },
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl, locale,
}: EmailChangeEmailProps) => {
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
            {pick(T.body1, L)(siteName)}{' '}
            <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link>{' '}
            {pick(T.on, L)}{' '}
            <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
          </Text>
          <Text style={styles.text}>{pick(T.body2, L)}</Text>
          <Link href={confirmationUrl} style={styles.button}>{pick(T.cta, L)}</Link>
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail
