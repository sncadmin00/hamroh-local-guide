import * as React from 'react'
import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName, siteUrl, recipient, confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Подтвердите email для {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Подтвердите ваш email</Heading>
        <Text style={styles.text}>
          Добро пожаловать в{' '}
          <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>!
          Подтвердите адрес{' '}
          <Link href={`mailto:${recipient}`} style={styles.link}>{recipient}</Link>,
          нажав на кнопку ниже:
        </Text>
        <Link href={confirmationUrl} style={styles.button}>Подтвердить email</Link>
        <Text style={styles.footer}>
          Если вы не регистрировались — просто проигнорируйте это письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
