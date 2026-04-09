import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const { title, body } = await req.json()
  const supabase = await createClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        },
        JSON.stringify({ title, body })
      )
    )
  )

  const expired = results
    .map((result, i) => ({ result, sub: subscriptions[i] }))
    .filter(({ result }) => result.status === 'rejected')

  if (expired.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expired.map(({ sub }) => sub.endpoint))
  }

  return NextResponse.json({ message: 'Notifications sent' })
}