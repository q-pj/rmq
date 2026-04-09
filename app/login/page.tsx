'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { UAParser } from 'ua-parser-js'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin() {
    setIsLoading(true)
    setError('')
    const supabase = createClient()

    // Try employee account first
    let role = 'employee'
    let result = await supabase.auth.signInWithPassword({
      email: 'quintelapj+employee@gmail.com',
      password
    })

    // If employee login fails, try manager account
    if (result.error) {
      role = 'manager'
      result = await supabase.auth.signInWithPassword({
        email: 'quintelapj+manager@gmail.com',
        password
      })
    }

    // If both fail, show error
    if (result.error) {
      setError('Wrong password')
      setIsLoading(false)
      return
    }

    // Parse device info
    const parser = new UAParser(navigator.userAgent)
    const device = `${parser.getDevice().vendor ?? 'Unknown'} ${parser.getDevice().model ?? 'Unknown'} - ${parser.getBrowser().name ?? 'Unknown'}`

    // Log the login
    await supabase.from('login_logs').insert({
      role,
      device,
      user_agent: navigator.userAgent,
    })

    router.push('/')
  }

  return (
    <main style={{ padding: '16px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>RMQ Staging</h1>

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        disabled={isLoading}
        style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }}
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        onClick={handleLogin}
        disabled={isLoading}
        style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </main>
  )
}