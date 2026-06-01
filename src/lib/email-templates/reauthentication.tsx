import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ваш код подтверждения</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Heading style={styles.brandBar}>Hamroh</Heading>
        <Heading style={styles.h1}>Подтверждение входа</Heading>
        <Text style={styles.text}>Используйте код ниже, чтобы подтвердить вашу личность:</Text>
        <Text style={styles.code}>{token}</Text>
        <Text style={styles.footer}>
          Код действует ограниченное время. Если вы не запрашивали — проигнорируйте письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
