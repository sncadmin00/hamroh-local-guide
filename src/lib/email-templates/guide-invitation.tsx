import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'
import type { TemplateEntry } from './registry'

interface Props {
  recipientName?: string
  inviteUrl: string
  siteUrl?: string
}

const Email = ({ recipientName, inviteUrl, siteUrl = 'https://hamrohim.com' }: Props) => {
  const hi = recipientName ? `Здравствуйте, ${recipientName}!` : 'Здравствуйте!'
  return (
    <Html lang="ru" dir="ltr">
      <Head />
      <Preview>Приглашаем вас стать гидом на Hamroh</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>Приглашение присоединиться к Hamroh</Heading>
          <Text style={styles.text}>{hi}</Text>
          <Text style={styles.text}>
            Мы — <Link href={siteUrl} style={styles.link}>Hamroh</Link>, платформа,
            которая соединяет путешественников с проверенными местными гидами в Узбекистане.
            Мы нашли вас как опытного гида и хотели бы пригласить вас зарегистрироваться
            на платформе бесплатно.
          </Text>
          <Text style={styles.text}>
            Что вы получите:
            <br />— Поток клиентов со всего мира
            <br />— Профиль с отзывами и портфолио
            <br />— Удобный календарь и оплату онлайн
            <br />— Поддержку 24/7
          </Text>
          <Link href={inviteUrl} style={styles.button}>Принять приглашение</Link>
          <Text style={styles.text}>
            Или скопируйте ссылку: <Link href={inviteUrl} style={styles.link}>{inviteUrl}</Link>
          </Text>
          <Text style={styles.footer}>
            Если вы получили это письмо по ошибке — просто проигнорируйте его.
            С вопросами пишите на hello@hamrohim.com.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Приглашение стать гидом на Hamroh',
  displayName: 'Guide invitation',
  previewData: { recipientName: 'Гулнора', inviteUrl: 'https://hamrohim.com/invite/sample' },
} satisfies TemplateEntry

export default Email
