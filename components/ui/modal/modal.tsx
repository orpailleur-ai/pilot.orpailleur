'use client'

import { useCallback, useId, type ReactNode } from 'react'
import {
  Button,
  Dialog,
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core'

const SIZE_MAX_WIDTH: Record<string, number> = {
  sm: 448,
  md: 512,
  lg: 576,
  xl: 672,
  '2xl': 792,
  full: 9999,
}

export interface ModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
  preventClose?: boolean
  headerStart?: ReactNode
}

function getWidth(size: string | undefined): number {
  if (!size || size === 'xl') return 672
  return SIZE_MAX_WIDTH[size] ?? 672
}

export function Modal({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  children,
  size = 'xl',
  className,
  preventClose,
  headerStart,
}: ModalProps) {
  const titleId = useId()
  const descId = useId()

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const width = getWidth(size)

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={width}
      purpose={preventClose ? 'required' : 'form'}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? descId : undefined}
      className={className}
    >
      <Layout height="fill">
        <LayoutFooter>
          <div className="flex items-center gap-3">
            {headerStart && <div className="flex-shrink-0">{headerStart}</div>}
            <div className="flex-1 min-w-0">
              <h2
                id={titleId}
                className="text-[15px] font-semibold text-foreground truncate"
              >
                {title}
              </h2>
              {subtitle && (
                <p id={descId} className="text-xs text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {!preventClose && (
              <Button
                label="Fermer"
                variant="ghost"
                size="sm"
                isIconOnly
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                }
                onClick={handleClose}
              />
            )}
          </div>
        </LayoutFooter>

        <LayoutContent className="overflow-y-auto">
          <div className="px-5 py-4">{children}</div>
        </LayoutContent>
      </Layout>
    </Dialog>
  )
}

export interface ModalSectionProps {
  title: string
  description?: string
  children: ReactNode
  start?: ReactNode
}

export function ModalSection({ title, description, children, start }: ModalSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {start && <div className="text-muted-foreground">{start}</div>}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export interface FieldGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function FieldGrid({ children, columns = 2, className = '' }: FieldGridProps) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' }
  return (
    <div className={`grid ${cols[columns]} gap-3 ${className}`}>
      {children}
    </div>
  )
}

Modal.Section = ModalSection
Modal.FieldGrid = FieldGrid
Modal.Footer = ModalSection
