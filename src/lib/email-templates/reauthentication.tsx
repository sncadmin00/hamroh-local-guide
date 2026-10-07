import {
  Body, Img, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface ReauthenticationEmailProps {
  token: string
  locale?: Locale | string
}

const T = {
  preview: { ru: 'Ваш код подтверждения', uz: 'Tasdiqlash kodingiz', en: 'Your verification code' },
  heading: { ru: 'Подтверждение входа', uz: 'Kirishni tasdiqlash', en: 'Confirm sign-in' },
  body: { ru: 'Используйте код ниже, чтобы подтвердить вашу личность:', uz: 'Shaxsingizni tasdiqlash uchun quyidagi koddan foydalaning:', en: 'Use the code below to verify your identity:' },
  footer: { ru: 'Код действует ограниченное время. Если вы не запрашивали — проигнорируйте письмо.', uz: 'Kod cheklangan vaqt amal qiladi. Agar siz so‘ramagan bo‘lsangiz — xatni e’tiborsiz qoldiring.', en: "The code is valid for a limited time. If you didn't request it, ignore this email." },
}

export const ReauthenticationEmail = ({ token, locale }: ReauthenticationEmailProps) => {
  const L = normalizeLocale(locale)
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, L)}</Heading>
          <Text style={styles.text}>{pick(T.body, L)}</Text>
          <Text style={styles.code}>{token}</Text>
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail
