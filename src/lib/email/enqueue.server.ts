import * as React from 'react'
import { render } from '@react-email/components'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Hamroh'
const SENDER_DOMAIN = 'notify.hamrohim.com'
const FROM_DOMAIN = 'hamrohim.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getOrCreateUnsubToken(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.toLowerCase()
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalized)
    .maybeSingle()

  if (existing && !existing.used_at) return existing.token as string
  if (existing && existing.used_at) return null

  const token = generateToken()
  await supabase
    .from('email_unsubscribe_tokens')
    .upsert({ token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })

  const { data: stored } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .maybeSingle()
  return (stored?.token as string) ?? token
}

export interface EnqueueOptions {
  supabase: SupabaseClient
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey: string
}

/**
 * Renders a template and enqueues it for delivery. Performs suppression check
 * and per-recipient unsubscribe-token handling. Returns true if enqueued.
 */
export async function enqueueTransactionalEmail(opts: EnqueueOptions): Promise<boolean> {
  const { supabase, templateName, recipientEmail, templateData = {}, idempotencyKey } = opts

  const tpl = TEMPLATES[templateName]
  if (!tpl) {
    console.error('Template not found', templateName)
    return false
  }

  const normalized = recipientEmail.toLowerCase()

  // Suppression
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (suppressed) return false

  const unsubscribeToken = await getOrCreateUnsubToken(supabase, recipientEmail)
  if (!unsubscribeToken) return false

  const element = React.createElement(tpl.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject
  const messageId = crypto.randomUUID()

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientEmail,
    status: 'pending',
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    console.error('Failed to enqueue email', templateName, error)
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipientEmail,
      status: 'failed',
      error_message: error.message,
    })
    return false
  }
  return true
}
