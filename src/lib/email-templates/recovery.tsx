import * as React from 'react'
import {
  Body, Img, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles, BRAND } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Сброс пароля для {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Сброс пароля</Heading>
        <Text style={styles.text}>
          Мы получили запрос на сброс пароля для {siteName}. Нажмите кнопку ниже,
          чтобы задать новый пароль.
        </Text>
        <Link href={confirmationUrl} style={styles.button}>Сбросить пароль</Link>
        <Text style={styles.footer}>
          Если вы не запрашивали сброс пароля — проигнорируйте это письмо.
          Пароль останется прежним.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
