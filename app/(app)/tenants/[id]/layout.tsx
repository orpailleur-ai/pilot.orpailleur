import { TenantDetailProvider } from '@/components/composite/tenant-detail-context'
import { TenantDetailShell } from './tenant-detail-shell'

export default async function TenantDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <TenantDetailProvider tenantId={id}>
      <TenantDetailShell>{children}</TenantDetailShell>
    </TenantDetailProvider>
  )
}
