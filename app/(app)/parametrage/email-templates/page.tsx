'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Mail, Pencil, Plus } from 'lucide-react'
import { Badge, Button, useToast } from '@astryxdesign/core'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import {
  listEmailTemplatesAdmin,
  type EmailTemplate,
} from '@/lib/email-client'

const SCOPE_LABELS: Record<string, string> = {
  commande_envoyee: 'email_scope_commande_envoyee',
  facture_impayee: 'email_scope_facture_impayee',
  reception_validated: 'email_scope_reception_validated',
  stock_bas: 'email_scope_stock_bas',
  abonnement_renouvele: 'email_scope_abonnement_renouvele',
  notif_generic: 'email_scope_notif_generic',
}

const STATUS_BADGE: Record<string, 'success' | 'neutral' | 'error' | 'warning' | 'info'> = {
  true: 'success',
  false: 'neutral',
}

export default function EmailTemplatesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ajout, setAjout] = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listEmailTemplatesAdmin()
      setTemplates(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void charger() }, [charger])

  /**
   * Scopes sans configuration.
   *
   * « Ajouter » ne peut créer que ce qui n'existe pas : la liste porte un
   * modèle par scope du registre, et un scope déjà configuré n'a pas de
   * « nouvelle » version — l'éditer se fait sur sa ligne.
   */
  const scopesAConfigurer = useMemo(
    () => templates.filter((tpl) => !tpl.exists),
    [templates],
  )

  const columns: Column<EmailTemplate>[] = [
    {
      key: 'scope',
      header: t('email_templates_scope'),
      mobile: 'primary',
      render: (row) => (
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {t(SCOPE_LABELS[row.scope] ?? row.scope)}
          </span>
          <code
            className="rounded px-1 py-0.5 text-[11px]"
            style={{
              backgroundColor: 'var(--color-background-muted)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {row.scope}
          </code>
        </span>
      ),
    },
    {
      key: 'name',
      header: t('email_templates_name'),
      mobile: 'inline',
      render: (row) => (
        <span className="truncate block max-w-xs" title={row.name}>
          {row.name || '—'}
        </span>
      ),
    },
    {
      key: 'subject',
      header: t('email_templates_subject'),
      render: (row) => (
        <span className="truncate max-w-xs block" title={row.subject}>
          {row.subject || '—'}
        </span>
      ),
    },
    {
      // Un scope peut exister sans etre active : c'est un template prepare
      // mais desactive. Les deux etats meritent d'etre distingues.
      key: 'etat',
      header: t('email_templates_state'),
      align: 'end',
      mobile: 'inline',
      render: (row) => (
        <Badge
          variant={!row.exists ? 'warning' : STATUS_BADGE[String(row.actif)]}
          label={
            !row.exists
              ? t('email_templates_not_configured')
              : row.actif
                ? t('active')
                : t('inactive')
          }
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      noRowClick: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            label={t('email_templates_view')}
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Eye size={13} />}
            onClick={() => router.push(`/parametrage/email-templates/${row.scope}?mode=read`)}
          />
          <Button
            label={t('edit')}
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Pencil size={13} />}
            onClick={() => router.push(`/parametrage/email-templates/${row.scope}`)}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('email_templates_title')}
        icon={<Mail size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <Button
            label={t('email_templates_add')}
            variant="primary"
            icon={<Plus size={15} />}
            isDisabled={scopesAConfigurer.length === 0}
            tooltip={scopesAConfigurer.length === 0 ? t('email_templates_add_none') : undefined}
            onClick={() => setAjout(true)}
          />
        }
      />

      {error && <InlineError message={error} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={16} />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Mail size={32} />}
          title={t('email_templates_empty')}
          description={t('email_templates_empty_desc')}
        />
      ) : (
        <DataTable columns={columns} rows={templates} rowKey={(row) => row.scope} />
      )}

      {/* Choix du scope à configurer */}
      <Modal
        isOpen={ajout}
        onOpenChange={setAjout}
        title={t('email_templates_add')}
        size="md"
      >
        <ModalSection title={t('email_templates_add_choose')}>
          <FieldGrid columns={1}>
            {scopesAConfigurer.map((row) => (
              <button
                key={row.scope}
                type="button"
                onClick={() => {
                  setAjout(false)
                  router.push(`/parametrage/email-templates/${row.scope}`)
                }}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-background-muted)] focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {t(SCOPE_LABELS[row.scope] ?? row.scope)}
                </span>
                <code
                  className="rounded px-1.5 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: 'var(--color-background-muted)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {row.scope}
                </code>
              </button>
            ))}
          </FieldGrid>
        </ModalSection>
      </Modal>
    </>
  )
}
