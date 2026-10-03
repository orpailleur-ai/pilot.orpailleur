'use client'

import type { ReactNode } from 'react'
import { usePermission } from '../providers/permission-context'

interface PermissionGateProps {
  /**
   * Permission required to render children.
   * Supports ':' notation ('billing:write') or '_' notation ('BILLING_WRITE').
   */
  permission: string
  children: ReactNode
  /**
   * If true, renders children but adds `aria-disabled` and `pointer-events: none`
   * instead of hiding them completely. Use for buttons that should be visible
   * but not actionable.
   */
  disableInsteadOfHide?: boolean
}

/**
 * Conditionally renders children based on the user's permissions.
 * Uses the `usePermission` hook — must be used inside an `AuthProvider`.
 */
export function PermissionGate({
  permission,
  children,
  disableInsteadOfHide = false,
}: PermissionGateProps) {
  const { has } = usePermission()

  if (has(permission)) {
    return <>{children}</>
  }

  if (disableInsteadOfHide) {
    return (
      <div
        aria-disabled="true"
        style={{ pointerEvents: 'none', opacity: 0.45 }}
      >
        {children}
      </div>
    )
  }

  return null
}
