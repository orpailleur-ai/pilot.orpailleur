'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTokenValue } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const token = getTokenValue()
    if (token) {
      router.replace('/tenants')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
      <Spinner size={8} />
    </div>
  )
}
