import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import { normalizeLocale, pick, type Locale } from './_i18n'
import type { TemplateEntry } from './registry'

interface Props {
  recipientName?: string
  inviteUrl: string
  siteUrl?: string
  locale?: Locale | string
}

const T = {
  preview: {
    ru: 'Приглашаем вас стать гидом на Hamroh',
    uz: 'Sizni Hamrohda hamroh bo‘lishga taklif qilamiz',
    en: 'You are invited to become a guide on Hamroh',
  },
  heading: {
    ru: 'Приглашение присоединиться к Hamroh',
    uz: 'Hamrohga qo‘shilish uchun taklif',
    en: 'Invitation to join Hamroh',
  },
  hello: (n?: string) => ({
    ru: n ? `Здравствуйте, ${n}!` : 'Здравствуйте!',
    uz: n ? `Assalomu alaykum, ${n}!` : 'Assalomu alaykum!',
    en: n ? `Hello, ${n}!` : 'Hello!',
  }),
  intro: (site: string) => ({
    ru: <>
      Мы — <Link href={site} style={styles.link}>Hamroh</Link>, платформа,
      которая соединяет путешественников с проверенными местными гидами в Узбекистане.
      Мы нашли вас как опытного гида и хотели бы пригласить вас зарегистрироваться
      на платформе бесплатно.
    </>,
    uz: <>
      Biz — <Link href={site} style={styles.link}>Hamroh</Link>, sayyohlarni
      O‘zbekistondagi ishonchli mahalliy gidlar bilan bog‘laydigan platforma.
      Sizni tajribali hamroh sifatida topdik va platformaga bepul ro‘yxatdan
      o‘tishga taklif qilmoqchimiz.
    </>,
    en: <>
      We are <Link href={site} style={styles.link}>Hamroh</Link>, a platform that
      connects travelers with verified local guides in Uzbekistan. We found you
      as an experienced guide and would love to invite you to join the platform
      for free.
    </>,
  }),
  benefits: {
    ru: <>Что вы получите:<br />— Поток клиентов со всего мира<br />— Профиль с отзывами и портфолио<br />— Удобный календарь и оплату онлайн<br />— Поддержку 24/7</>,
    uz: <>Sizga nima beradi:<br />— Butun dunyodan mijozlar oqimi<br />— Sharhlar va portfolioli profil<br />— Qulay kalendar va onlayn to‘lov<br />— 24/7 qo‘llab-quvvatlash</>,
    en: <>What you get:<br />— A stream of clients from around the world<br />— Profile with reviews and portfolio<br />— Convenient calendar and online payments<br />— 24/7 support</>,
  },
  cta: {
    ru: 'Принять приглашение',
    uz: 'Taklifni qabul qilish',
    en: 'Accept invitation',
  },
  orCopy: (url: string) => ({
    ru: <>Или скопируйте ссылку: <Link href={url} style={styles.link}>{url}</Link></>,
    uz: <>Yoki havolani nusxalang: <Link href={url} style={styles.link}>{url}</Link></>,
    en: <>Or copy the link: <Link href={url} style={styles.link}>{url}</Link></>,
  }),
  footer: {
    ru: 'Если вы получили это письмо по ошибке — просто проигнорируйте его. С вопросами пишите на hello@hamrohim.com.',
    uz: 'Agar bu xat sizga noto‘g‘ri yuborilgan bo‘lsa, e’tibor bermang. Savollar bo‘lsa hello@hamrohim.com manziliga yozing.',
    en: 'If you received this email by mistake, just ignore it. For questions write to hello@hamrohim.com.',
  },
  subject: {
    ru: 'Приглашение стать гидом на Hamroh',
    uz: 'Hamrohda hamroh bo‘lishga taklif',
    en: 'Invitation to become a guide on Hamroh',
  },
}

const Email = ({ recipientName, inviteUrl, siteUrl = 'https://hamrohim.com', locale }: Props) => {
  const loc = normalizeLocale(locale)
  return (
    <Html lang={loc} dir="ltr">
      <Head />
      <Preview>{pick(T.preview, loc)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>{pick(T.heading, loc)}</Heading>
          <Text style={styles.text}>{pick(T.hello(recipientName), loc)}</Text>
          <Text style={styles.text}>{pick(T.intro(siteUrl), loc)}</Text>
          <Text style={styles.text}>{pick(T.benefits, loc)}</Text>
          <Link href={inviteUrl} style={styles.button}>{pick(T.cta, loc)}</Link>
          <Text style={styles.text}>{pick(T.orCopy(inviteUrl), loc)}</Text>
          <Text style={styles.footer}>{pick(T.footer, loc)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => pick(T.subject, normalizeLocale(data?.locale)),
  displayName: 'Guide invitation',
  previewData: { recipientName: 'Гулнора', inviteUrl: 'https://hamrohim.com/invite/sample', locale: 'ru' },
} satisfies TemplateEntry

export default Email
