import * as React from 'react'
import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ссылка для входа в {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Ссылка для входа</Heading>
        <Text style={styles.text}>
          Нажмите кнопку ниже, чтобы войти в {siteName}. Ссылка действует ограниченное время.
        </Text>
        <Link href={confirmationUrl} style={styles.button}>Войти</Link>
        <Text style={styles.footer}>
          Если вы не запрашивали вход — просто проигнорируйте это письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
