import * as React from 'react'
import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Подтвердите смену email для {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Подтвердите смену email</Heading>
        <Text style={styles.text}>
          Вы запросили смену email для {siteName} с{' '}
          <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link>{' '}
          на{' '}
          <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
        </Text>
        <Text style={styles.text}>Нажмите кнопку ниже, чтобы подтвердить смену:</Text>
        <Link href={confirmationUrl} style={styles.button}>Подтвердить смену email</Link>
        <Text style={styles.footer}>
          Если вы не запрашивали смену — срочно защитите свой аккаунт.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
