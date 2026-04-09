import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { endpoint, keys } = await req.json()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Already subscribed' })
  }

  const { error } = await supabase.from('push_subscriptions').insert({
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Subscribed successfully' })
}