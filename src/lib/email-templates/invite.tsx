import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  locale?: Locale | string
}

const T = {
  preview: { ru: (s: string) => `Вас приглашают присоединиться к ${s}`, uz: (s: string) => `Sizni ${s} ga taklif qilishyapti`, en: (s: string) => `You're invited to join ${s}` },
  heading: { ru: 'Вас пригласили', uz: 'Sizni taklif qilishdi', en: "You're invited" },
  body: {
    ru: 'Вас приглашают присоединиться к',
    uz: 'Sizni quyidagiga qo‘shilishga taklif qilishyapti:',
    en: "You're invited to join",
  },
  body2: { ru: '. Нажмите кнопку ниже, чтобы принять приглашение и создать аккаунт.', uz: '. Taklifni qabul qilish va hisob yaratish uchun quyidagi tugmani bosing.', en: '. Click the button below to accept the invitation and create an account.' },
  cta: { ru: 'Принять приглашение', uz: 'Taklifni qabul qilish', en: 'Accept invitation' },
  footer: { ru: 'Если вы не ожидали этого приглашения — можете проигнорировать письмо.', uz: 'Agar siz bu taklifni kutmagan bo‘lsangiz — xatni e’tiborsiz qoldirishingiz mumkin.', en: "If you weren't expecting this invitation, you can ignore this email." },
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl, locale }: InviteEmailProps) => {
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
            <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>
            {pick(T.body2, L)}
          </Text>
          <Link href={confirmationUrl} style={styles.button}>{pick(T.cta, L)}</Link>
          <Text style={styles.footer}>{pick(T.footer, L)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail
