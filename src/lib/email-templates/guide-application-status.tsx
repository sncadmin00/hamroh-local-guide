import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'

type Status = 'approved' | 'rejected'

interface Props {
  fullName?: string
  status?: Status | string
  portalUrl?: string
  locale?: Locale | string
}

const T = {
  previewApproved: {
    ru: 'Ваша заявка гида одобрена',
    uz: 'Yo‘lboshchi arizangiz tasdiqlandi',
    en: 'Your guide application is approved',
  },
  previewRejected: {
    ru: 'Решение по вашей заявке гида',
    uz: 'Yo‘lboshchi arizangiz bo‘yicha qaror',
    en: 'Update on your guide application',
  },
  headingApproved: {
    ru: 'Поздравляем — заявка одобрена!',
    uz: 'Tabriklaymiz — arizangiz tasdiqlandi!',
    en: 'Congrats — you’re approved!',
  },
  headingRejected: {
    ru: 'К сожалению, в этот раз не подошло',
    uz: 'Afsuski, bu safar mos kelmadi',
    en: 'Not a fit this time',
  },
  greet: {
    ru: (n?: string) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    uz: (n?: string) => (n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!'),
    en: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
  },
  bodyApproved: {
    ru: 'Ваша заявка успешно прошла модерацию. Войдите в кабинет гида, заполните профиль и опубликуйте свободные слоты — путешественники смогут забронировать вас.',
    uz: 'Arizangiz muvaffaqiyatli moderatsiyadan o‘tdi. Yo‘lboshchi kabinetiga kiring, profilni to‘ldiring va bo‘sh vaqtlarni e’lon qiling — sayyohlar sizni band qila boshlaydi.',
    en: 'Your application passed review. Sign in to the guide portal, complete your profile, and publish your available slots — travelers can start booking you.',
  },
  bodyRejected: {
    ru: 'Спасибо за интерес к Hamroh. К сожалению, на этом этапе мы не можем одобрить вашу заявку. Вы можете обновить анкету (опыт, портфолио, видео) и отправить её повторно — мы будем рады пересмотреть.',
    uz: 'Hamroh’ga qiziqqaningiz uchun rahmat. Afsuski, hozircha arizangizni tasdiqlay olmadik. Anketani (tajriba, portfolio, video) yangilab, qayta yuborishingiz mumkin — biz qayta ko‘rib chiqamiz.',
    en: 'Thanks for your interest in Hamroh. We’re unable to approve your application right now. Feel free to update your profile (experience, portfolio, video) and resubmit — we’ll happily review again.',
  },
  ctaApproved: { ru: 'Открыть кабинет гида', uz: 'Yo‘lboshchi kabineti', en: 'Open guide portal' },
  ctaRejected: { ru: 'Обновить заявку', uz: 'Arizani yangilash', en: 'Update application' },
  footer: { ru: 'Команда Hamroh', uz: 'Hamroh jamoasi', en: 'The Hamroh team' },
  subjectApproved: {
    ru: 'Ваша заявка гида одобрена — Hamroh',
    uz: 'Yo‘lboshchi arizangiz tasdiqlandi — Hamroh',
    en: 'Your guide application is approved — Hamroh',
  },
  subjectRejected: {
    ru: 'Решение по вашей заявке гида — Hamroh',
    uz: 'Yo‘lboshchi arizangiz bo‘yicha qaror — Hamroh',
    en: 'Update on your guide application — Hamroh',
  },
}

const Email = ({ fullName, status, portalUrl, locale }: Props) => {
  const L = normalizeLocale(locale)
  const approved = status === 'approved'
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{pick(approved ? T.previewApproved : T.previewRejected, L)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>
            {pick(approved ? T.headingApproved : T.headingRejected, L)}
          </Heading>
          <Text style={styles.text}>{pick(T.greet, L)(fullName)}</Text>
          <Text style={styles.text}>
            {pick(approved ? T.bodyApproved : T.bodyRejected, L)}
          </Text>
          {portalUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={portalUrl} style={styles.button}>
                {pick(approved ? T.ctaApproved : T.ctaRejected, L)}
              </Button>
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
  subject: (d: Record<string, any>) =>
    pick(
      d?.status === 'approved' ? T.subjectApproved : T.subjectRejected,
      normalizeLocale(d?.locale),
    ),
  displayName: 'Guide application status',
  previewData: {
    fullName: 'Мария Каримова',
    status: 'approved',
    portalUrl: 'https://hamrohim.com/guide',
    locale: 'ru',
  },
} satisfies TemplateEntry
