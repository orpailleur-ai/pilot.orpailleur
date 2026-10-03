'use client'

import { useCallback, type ReactNode } from 'react'
import { Button } from '@astryxdesign/core'

export interface WizardStep {
  id: string
  label: string
  icon?: ReactNode
}

export interface ModalWizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  children: ReactNode
  onFinish?: () => void
  onBack?: () => void
  finishLabel?: string
  nextLabel?: string
  backLabel?: string
  isLoading?: boolean
  hideBackOnFirst?: boolean
  canAdvance?: boolean
}

export function ModalWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onFinish,
  onBack,
  finishLabel = 'Terminer',
  nextLabel = 'Suivant',
  backLabel = 'Retour',
  isLoading,
  hideBackOnFirst = true,
  canAdvance = true,
}: ModalWizardProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  const handleBack = useCallback(() => {
    if (isFirst) return
    onBack?.()
    onStepChange(currentStep - 1)
  }, [isFirst, currentStep, onBack, onStepChange])

  const handleNext = useCallback(() => {
    if (isLast) {
      onFinish?.()
    } else {
      onStepChange(currentStep + 1)
    }
  }, [isLast, currentStep, onFinish, onStepChange])

  return (
    <div className="space-y-5">
      {/* ── Step progress ── */}
      <div className="flex items-center justify-center gap-0 px-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = index <= currentStep

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepChange(index)}
                className={`
                  flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors
                  ${isClickable ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}
                  ${isCurrent ? 'bg-primary/10' : ''}
                `}
              >
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                    transition-all duration-200
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </button>

              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 -mx-0.5 ${index < currentStep ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step content ── */}
      <div className="min-h-0">
        {children}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div>
          {!isFirst && !hideBackOnFirst && (
            <Button
              label={backLabel}
              variant="ghost"
              onClick={handleBack}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            label={isLast ? finishLabel : nextLabel}
            variant="primary"
            onClick={handleNext}
            isLoading={isLoading}
            isDisabled={!canAdvance}
            endContent={
              !isLast ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}

export function useWizard(steps: WizardStep[]) {
  // Implemented in the page that uses the wizard
}
