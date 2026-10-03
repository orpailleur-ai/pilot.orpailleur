import { RoleDetailShell } from './role-detail-shell'

export default function RoleDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleDetailShell>{children}</RoleDetailShell>
}
