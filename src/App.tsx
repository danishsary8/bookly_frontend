import { LazyMotion } from 'motion/react'
import AppRoutes from './routes'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from './components/ui/toaster'
import { SessionWatcher } from './features/auth/SessionWatcher'

const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default)

function App() {
  return (
    <LazyMotion features={loadMotionFeatures}>
      <ThemeProvider>
        <AppRoutes />
        <SessionWatcher />
        <Toaster />
      </ThemeProvider>
    </LazyMotion>
  )
}

export default App
