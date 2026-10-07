import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'
import { normalizeLocale, type Locale } from '@/lib/email-templates/_i18n'

// Configuration
const SITE_NAME = "Hamroh"
const SENDER_DOMAIN = "notify.hamrohim.com"
const ROOT_DOMAIN = "hamrohim.com"
const FROM_DOMAIN = "hamrohim.com"
const SITE_URL = `https://${ROOT_DOMAIN}`

const EMAIL_SUBJECTS: Record<string, Record<Locale, string>> = {
  signup: { ru: 'Подтвердите ваш email — Hamroh', uz: 'Emailingizni tasdiqlang — Hamroh', en: 'Confirm your email — Hamroh' },
  invite: { ru: 'Вас пригласили в Hamroh', uz: 'Sizni Hamroh ga taklif qilishdi', en: "You've been invited to Hamroh" },
  magiclink: { ru: 'Ваша ссылка для входа — Hamroh', uz: 'Kirish havolangiz — Hamroh', en: 'Your sign-in link — Hamroh' },
  recovery: { ru: 'Сброс пароля — Hamroh', uz: 'Parolni tiklash — Hamroh', en: 'Reset your password — Hamroh' },
  email_change: { ru: 'Подтвердите смену email — Hamroh', uz: 'Email o‘zgarishini tasdiqlang — Hamroh', en: 'Confirm your new email — Hamroh' },
  reauthentication: { ru: 'Ваш код подтверждения — Hamroh', uz: 'Tasdiqlash kodingiz — Hamroh', en: 'Your verification code — Hamroh' },
}

function extractLocale(payloadData: any): Locale {
  return normalizeLocale(
    payloadData?.user_metadata?.locale ??
      payloadData?.user?.user_metadata?.locale ??
      payloadData?.metadata?.locale ??
      payloadData?.locale,
  )
}

// Shared per-email props, including the recipient's language.
function baseProps(data: any) {
  return {
    siteName: SITE_NAME,
    siteUrl: SITE_URL,
    recipient: data.email,
    confirmationUrl: data.url,
    token: data.token ?? '',
    email: data.email,
    oldEmail: data.old_email ?? '',
    newEmail: data.new_email ?? '',
    locale: extractLocale(data),
  }
}

function localized(type: string, Component: React.ComponentType<any>) {
  return (data: any) => {
    const props = baseProps(data)
    return { subject: EMAIL_SUBJECTS[type][props.locale], element: React.createElement(Component, props) }
  }
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const handler = createAuthEmailHandler({
          apiKey: process.env['LOVABLE_API_KEY']!,
          from: { name: SITE_NAME, address: `noreply@${FROM_DOMAIN}` },
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env['LOVABLE_SEND_URL'],
          emails: {
            signup: localized('signup', SignupEmail),
            invite: localized('invite', InviteEmail),
            magiclink: localized('magiclink', MagicLinkEmail),
            recovery: localized('recovery', RecoveryEmail),
            email_change: localized('email_change', EmailChangeEmail),
            reauthentication: localized('reauthentication', ReauthenticationEmail),
          },
        })
        return handler(request)
      },
    },
  },
})
