'use client'

import { useCallback } from 'react'
import { useAuth } from './auth-context'

/**
 * Returns a stable `has(permission)` function derived from the current user.
 * Checks direct permissions AND role-based permissions.
 * super_admin (role code) or '*' permission = all permissions granted.
 */
export function usePermission() {
  const { user } = useAuth()

  const has = useCallback(
    (permission: string): boolean => {
      if (!user) return false

      // Wildcard covers everything
      if (
        user.permissions.includes('*') ||
        user.roles.some((r) => r === '*' || r === 'super_admin')
      ) {
        return true
      }

      // Normalize: 'ai:write' → 'AI_WRITE'
      const normalized = permission.replace(':', '_').toUpperCase()
      return user.permissions.some(
        (p) => p === normalized || p === permission,
      )
    },
    [user],
  )

  return { has }
}
