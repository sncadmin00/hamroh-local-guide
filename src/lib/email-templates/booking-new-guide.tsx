import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'

interface Props {
  guideName?: string
  customerName?: string
  customerEmail?: string
  experience?: string
  date?: string
  startTime?: string
  guests?: number
  total?: number
  notes?: string
  bookingUrl?: string
  status?: 'confirmed' | 'pending'
}

const Email = ({
  guideName, customerName, customerEmail, experience, date, startTime,
  guests, total, notes, bookingUrl, status,
}: Props) => {
  const isPending = status !== 'confirmed'
  return (
    <Html lang="ru" dir="ltr">
      <Head />
      <Preview>
        {isPending ? 'Новая заявка на бронирование' : 'Новое подтверждённое бронирование'}
      </Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
          <Heading style={styles.h1}>
            {isPending ? 'Новая заявка' : 'Новое бронирование'}
          </Heading>
          <Text style={styles.text}>
            {guideName ? `Здравствуйте, ${guideName}!` : 'Здравствуйте!'}{' '}
            {isPending
              ? 'Поступила новая заявка — пожалуйста, подтвердите или отклоните её.'
              : 'У вас новое подтверждённое бронирование.'}
          </Text>
          <Section style={card}>
            {experience && <Text style={row}><b>Опыт:</b> {experience}</Text>}
            {customerName && <Text style={row}><b>Клиент:</b> {customerName}</Text>}
            {customerEmail && <Text style={row}><b>Email:</b> {customerEmail}</Text>}
            {date && <Text style={row}><b>Дата:</b> {date}{startTime ? ` в ${startTime}` : ''}</Text>}
            {guests != null && <Text style={row}><b>Гостей:</b> {guests}</Text>}
            {total != null && <Text style={row}><b>Сумма:</b> {total} TJS</Text>}
            {notes && <Text style={row}><b>Заметки:</b> {notes}</Text>}
          </Section>
          {bookingUrl && (
            <Section style={{ textAlign: 'center' }}>
              <Button href={bookingUrl} style={styles.button}>Открыть в кабинете гида</Button>
            </Section>
          )}
          <Text style={styles.footer}>
            Отвечайте быстро — это повышает шанс, что клиент придёт.
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
    d?.status === 'confirmed' ? 'Новое бронирование — Hamroh' : 'Новая заявка на бронирование — Hamroh',
  displayName: 'New booking (guide)',
  previewData: {
    guideName: 'Мария', customerName: 'Алексей', customerEmail: 'a@example.com',
    experience: 'Прогулка по Старому городу', date: '2026-06-15', startTime: '10:00',
    guests: 2, total: 240, notes: 'Будем с ребёнком',
    bookingUrl: 'https://hamrohim.com/guide', status: 'pending',
  },
} satisfies TemplateEntry
