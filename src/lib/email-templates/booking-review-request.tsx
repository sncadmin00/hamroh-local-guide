import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'

interface Props {
  customerName?: string
  guideName?: string
  experience?: string
  reviewUrl?: string
}

const Email = ({ customerName, guideName, experience, reviewUrl }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Как прошёл ваш тур? Поделитесь впечатлениями</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Как всё прошло?</Heading>
        <Text style={styles.text}>
          {customerName ? `Здравствуйте, ${customerName}!` : 'Здравствуйте!'}{' '}
          Надеемся, ваш опыт{experience ? ` «${experience}»` : ''}
          {guideName ? ` с гидом ${guideName}` : ''} был незабываемым.
        </Text>
        <Text style={styles.text}>
          Поделитесь впечатлениями — ваш отзыв поможет другим путешественникам
          и поддержит гида.
        </Text>
        {reviewUrl && (
          <Section style={{ textAlign: 'center' }}>
            <Button href={reviewUrl} style={styles.button}>Оставить отзыв</Button>
          </Section>
        )}
        <Text style={styles.footer}>
          Спасибо, что выбрали Hamroh.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Как прошёл ваш тур? — Hamroh',
  displayName: 'Booking review request',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария',
    experience: 'Прогулка по Старому городу',
    reviewUrl: 'https://hamrohim.com/my-bookings',
  },
} satisfies TemplateEntry
