import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Hamroh'

interface UnreadChatMessageProps {
  recipientName?: string
  senderName?: string
  messagePreview?: string
  bookingExperience?: string
  bookingUrl?: string
}

const UnreadChatMessageEmail = ({
  recipientName,
  senderName,
  messagePreview,
  bookingExperience,
  bookingUrl,
}: UnreadChatMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {senderName ? `New message from ${senderName}` : 'You have a new message'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {recipientName ? `Hi ${recipientName},` : 'Hi,'}
        </Heading>
        <Text style={text}>
          You have an unread message
          {senderName ? ` from ${senderName}` : ''}
          {bookingExperience ? ` about "${bookingExperience}"` : ''}.
        </Text>

        {messagePreview ? (
          <Section style={quoteBox}>
            <Text style={quoteText}>"{messagePreview}"</Text>
          </Section>
        ) : null}

        {bookingUrl ? (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={bookingUrl} style={button}>
              Open conversation
            </Button>
          </Section>
        ) : null}

        <Text style={footer}>
          You're receiving this because there's an unread message in your {SITE_NAME} booking chat.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UnreadChatMessageEmail,
  subject: (data: Record<string, any>) =>
    data?.senderName
      ? `New message from ${data.senderName}`
      : 'You have a new message',
  displayName: 'Unread chat message',
  previewData: {
    recipientName: 'Alex',
    senderName: 'Maria',
    messagePreview: 'Hi! Looking forward to our walk tomorrow — is 10am still good?',
    bookingExperience: 'Old Town walking tour',
    bookingUrl: 'https://hamrohim.com/messages/example',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container: React.CSSProperties = {
  padding: '24px',
  maxWidth: '560px',
  margin: '0 auto',
}
const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 16px',
}
const text: React.CSSProperties = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const quoteBox: React.CSSProperties = {
  borderLeft: '3px solid #0f172a',
  background: '#f8fafc',
  padding: '12px 16px',
  margin: '16px 0',
  borderRadius: '4px',
}
const quoteText: React.CSSProperties = {
  fontSize: '15px',
  color: '#0f172a',
  lineHeight: '1.5',
  margin: 0,
  fontStyle: 'italic',
}
const button: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 600,
  display: 'inline-block',
}
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
}
