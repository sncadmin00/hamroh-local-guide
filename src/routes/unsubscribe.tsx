import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
})

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [state, setState] = useState<
    'loading' | 'ready' | 'already' | 'invalid' | 'submitting' | 'success' | 'error'
  >('loading')

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) setState('ready')
        else if (data.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [token])

  const confirm = async () => {
    setState('submitting')
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.success) setState('success')
      else if (data.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4 border border-border rounded-lg p-8 bg-card">
        <h1 className="text-2xl font-bold">Unsubscribe</h1>
        {state === 'loading' && <p className="text-muted-foreground">Checking your link…</p>}
        {state === 'ready' && (
          <>
            <p className="text-muted-foreground">
              Click below to stop receiving emails from us.
            </p>
            <button
              onClick={confirm}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:opacity-90"
            >
              Confirm unsubscribe
            </button>
          </>
        )}
        {state === 'submitting' && <p className="text-muted-foreground">Processing…</p>}
        {state === 'success' && (
          <p className="text-foreground">You've been unsubscribed. Sorry to see you go.</p>
        )}
        {state === 'already' && (
          <p className="text-foreground">You're already unsubscribed.</p>
        )}
        {state === 'invalid' && (
          <p className="text-destructive">This unsubscribe link is invalid or expired.</p>
        )}
        {state === 'error' && (
          <p className="text-destructive">Something went wrong. Please try again later.</p>
        )}
      </div>
    </div>
  )
}
