import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'

interface Props {
  fullName?: string
  email?: string
  phone?: string
  telegram?: string
  city?: string
  languages?: string[]
  specialization?: string
  experienceYears?: number
  about?: string
  reviewUrl?: string
}

const Email = ({
  fullName, email, phone, telegram, city, languages, specialization, experienceYears, about, reviewUrl,
}: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Новая заявка от гида на модерацию</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt="Hamroh" style={styles.logo} />
        <Heading style={styles.h1}>Новая заявка гида</Heading>
        <Text style={styles.text}>
          На модерацию поступила новая анкета. Проверьте профиль и одобрите либо отклоните.
        </Text>
        <Section style={card}>
          {fullName && <Text style={row}><b>Имя:</b> {fullName}</Text>}
          {email && <Text style={row}><b>Email:</b> {email}</Text>}
          {phone && <Text style={row}><b>Телефон:</b> {phone}</Text>}
          {telegram && <Text style={row}><b>Telegram:</b> {telegram}</Text>}
          {city && <Text style={row}><b>Город:</b> {city}</Text>}
          {languages?.length ? <Text style={row}><b>Языки:</b> {languages.join(', ')}</Text> : null}
          {specialization && <Text style={row}><b>Специализация:</b> {specialization}</Text>}
          {experienceYears != null && <Text style={row}><b>Опыт:</b> {experienceYears} лет</Text>}
          {about && <Text style={row}><b>О себе:</b> {about}</Text>}
        </Section>
        {reviewUrl && (
          <Section style={{ textAlign: 'center' }}>
            <Button href={reviewUrl} style={styles.button}>Открыть в админке</Button>
          </Section>
        )}
        <Text style={styles.footer}>Hamroh Admin</Text>
      </Container>
    </Body>
  </Html>
)

const card = { ...styles.text, background: '#ffffff', border: `1px solid ${BRAND.border}`, borderRadius: '10px', padding: '16px 20px', margin: '8px 0 24px' } as const
const row = { margin: '4px 0', fontSize: '14px', color: BRAND.text, lineHeight: '1.6' } as const

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Новая заявка гида: ${d?.fullName ?? 'без имени'}`,
  displayName: 'New guide application (admin)',
  previewData: {
    fullName: 'Мария Каримова', email: 'maria@example.com', phone: '+998 90 123 4567',
    city: 'Самарканд', languages: ['ru', 'en', 'uz'], specialization: 'Старый город, гастро-туры',
    experienceYears: 5, about: 'Гид с 5-летним опытом, выпускник истфака СамГУ.',
    reviewUrl: 'https://hamrohim.com/admin',
  },
} satisfies TemplateEntry
