import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'

interface Props {
  customerName?: string
  guideName?: string
  experience?: string
  date?: string
  startTime?: string
  bookingUrl?: string
}

const Email = ({ customerName, guideName, experience, date, startTime, bookingUrl }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Напоминание: ваш тур завтра</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Ваш тур уже завтра</Heading>
        <Text style={styles.text}>
          {customerName ? `Здравствуйте, ${customerName}!` : 'Здравствуйте!'} Напоминаем о вашем туре с Hamroh.
        </Text>
        <Section style={card}>
          {experience && <Text style={row}><b>Опыт:</b> {experience}</Text>}
          {guideName && <Text style={row}><b>Гид:</b> {guideName}</Text>}
          {date && <Text style={row}><b>Когда:</b> {date}{startTime ? ` в ${startTime}` : ''}</Text>}
        </Section>
        {bookingUrl && (
          <Section style={{ textAlign: 'center' }}>
            <Button href={bookingUrl} style={styles.button}>Открыть бронирование</Button>
          </Section>
        )}
        <Text style={styles.footer}>
          Если планы изменились — свяжитесь с гидом через чат бронирования.
        </Text>
      </Container>
    </Body>
  </Html>
)

const card = { ...styles.text, background: '#ffffff', border: `1px solid ${BRAND.border}`, borderRadius: '10px', padding: '16px 20px', margin: '8px 0 24px' } as const
const row = { margin: '4px 0', fontSize: '14px', color: BRAND.text, lineHeight: '1.6' } as const

export const template = {
  component: Email,
  subject: 'Напоминание: ваш тур завтра — Hamroh',
  displayName: 'Booking reminder (client)',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария',
    experience: 'Прогулка по Старому городу',
    date: '2026-06-15', startTime: '10:00',
    bookingUrl: 'https://hamrohim.com/my-bookings',
  },
} satisfies TemplateEntry
