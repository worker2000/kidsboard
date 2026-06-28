// Kiosk mode has no app nav/header — standalone full-screen layout, like /wallboard
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
