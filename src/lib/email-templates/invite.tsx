import * as React from 'react'
import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Вас приглашают присоединиться к {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Вас пригласили</Heading>
        <Text style={styles.text}>
          Вас приглашают присоединиться к{' '}
          <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>.
          Нажмите кнопку ниже, чтобы принять приглашение и создать аккаунт.
        </Text>
        <Link href={confirmationUrl} style={styles.button}>Принять приглашение</Link>
        <Text style={styles.footer}>
          Если вы не ожидали этого приглашения — можете проигнорировать письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
