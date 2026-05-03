import { Toaster } from 'sonner'
import { useTheme } from '../../context/ThemeContext'

export function AppToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-right" richColors closeButton theme={theme} duration={4000} />
}
