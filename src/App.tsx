import AppRoutes from './routes'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from './components/ui/toaster'
import { SessionWatcher } from './features/auth/SessionWatcher'

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
      <SessionWatcher />
      <Toaster />
    </ThemeProvider>
  )
}

export default App
