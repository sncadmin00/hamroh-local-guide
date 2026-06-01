import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as unreadChatMessage } from './unread-chat-message'
import { template as bookingConfirmationClient } from './booking-confirmation-client'
import { template as bookingNewGuide } from './booking-new-guide'
import { template as bookingReminderClient } from './booking-reminder-client'
import { template as bookingReviewRequest } from './booking-review-request'
import { template as bookingStatusUpdateClient } from './booking-status-update-client'
import { template as bookingCancelledByClient } from './booking-cancelled-by-client'
import { template as guideApplicationAdmin } from './guide-application-admin'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'unread-chat-message': unreadChatMessage,
  'booking-confirmation-client': bookingConfirmationClient,
  'booking-new-guide': bookingNewGuide,
  'booking-reminder-client': bookingReminderClient,
  'booking-review-request': bookingReviewRequest,
  'booking-status-update-client': bookingStatusUpdateClient,
  'booking-cancelled-by-client': bookingCancelledByClient,
  'guide-application-admin': guideApplicationAdmin,
}

