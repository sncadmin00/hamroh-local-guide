import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

export interface EnqueueOptions {
  supabase: SupabaseClient
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey: string
}

async function logSend(
  supabase: SupabaseClient,
  row: { template_name: string; recipient_email: string; status: 'sent' | 'suppressed' | 'failed'; error_message?: string },
) {
  const { error } = await supabase.from('email_send_log').insert({ message_id: null, ...row })
  if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
}

/**
 * Sends a registered app email through Lovable's managed delivery and records
 * the outcome in email_send_log. Returns true when the email was sent.
 */
export async function enqueueTransactionalEmail(opts: EnqueueOptions): Promise<boolean> {
  const { supabase, templateName, recipientEmail, templateData = {}, idempotencyKey } = opts
  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, { templateData, idempotencyKey })
    if (!result.sent) {
      await logSend(supabase, { template_name: templateName, recipient_email: recipientEmail, status: 'suppressed' })
      return false
    }
    await logSend(supabase, { template_name: templateName, recipient_email: recipientEmail, status: 'sent' })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to send email', templateName, message)
    await logSend(supabase, { template_name: templateName, recipient_email: recipientEmail, status: 'failed', error_message: message })
    return false
  }
}
