'use client'

import { AlertDialog } from '@astryxdesign/core/AlertDialog'

interface ConfirmDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'destructive'
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  confirmVariant = 'primary',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description ?? ''}
      cancelLabel="Annuler"
      actionLabel={confirmLabel}
      actionVariant={confirmVariant}
      onAction={onConfirm}
      isActionLoading={isLoading}
    />
  )
}
