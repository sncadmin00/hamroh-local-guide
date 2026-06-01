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
  guests?: number
  total?: number
  bookingUrl?: string
  status?: 'confirmed' | 'pending'
}

const Email = ({
  customerName, guideName, experience, date, startTime, guests, total, bookingUrl, status,
}: Props) => {
  const isConfirmed = status === 'confirmed'
  return (
    <Html lang="ru" dir="ltr">
      <Head />
      <Preview>
        {isConfirmed ? 'Ваше бронирование подтверждено' : 'Ваша заявка отправлена гиду'}
      </Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>
            {isConfirmed ? 'Бронирование подтверждено' : 'Заявка отправлена'}
          </Heading>
          <Text style={styles.text}>
            {customerName ? `Здравствуйте, ${customerName}!` : 'Здравствуйте!'}{' '}
            {isConfirmed
              ? 'Ваше бронирование на Hamroh подтверждено.'
              : 'Мы получили вашу заявку и передали её гиду. Он подтвердит её в ближайшее время.'}
          </Text>
          <Section style={card}>
            {experience && <Text style={row}><b>Опыт:</b> {experience}</Text>}
            {guideName && <Text style={row}><b>Гид:</b> {guideName}</Text>}
            {date && <Text style={row}><b>Дата:</b> {date}{startTime ? ` в ${startTime}` : ''}</Text>}
            {guests != null && <Text style={row}><b>Гостей:</b> {guests}</Text>}
            {total != null && <Text style={row}><b>Сумма:</b> {total} TJS</Text>}
          </Section>
          {bookingUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={bookingUrl} style={styles.button}>Посмотреть бронирование</Button>
            </Section>
          )}
          <Text style={styles.footer}>
            Если у вас вопросы — напишите гиду в чате бронирования.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const card = { ...styles.text, background: '#ffffff', border: `1px solid ${BRAND.border}`, borderRadius: '10px', padding: '16px 20px', margin: '8px 0 24px' } as const
const row = { margin: '4px 0', fontSize: '14px', color: BRAND.text, lineHeight: '1.6' } as const

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d?.status === 'confirmed' ? 'Бронирование подтверждено — Hamroh' : 'Заявка отправлена — Hamroh',
  displayName: 'Booking confirmation (client)',
  previewData: {
    customerName: 'Алексей', guideName: 'Мария', experience: 'Прогулка по Старому городу',
    date: '2026-06-15', startTime: '10:00', guests: 2, total: 240,
    bookingUrl: 'https://hamrohim.com/my-bookings', status: 'confirmed',
  },
} satisfies TemplateEntry
