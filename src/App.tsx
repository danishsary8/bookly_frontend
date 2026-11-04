import { LazyMotion } from 'motion/react'
import AppRoutes from './routes'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from './components/ui/toaster'
import { SessionWatcher } from './features/auth/SessionWatcher'
import { StagingBanner } from './components/StagingBanner'
import { VisitorAnalytics } from './components/VisitorAnalytics'

const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default)

function App() {
  return (
    <LazyMotion features={loadMotionFeatures}>
      <ThemeProvider>
        <StagingBanner />
        <AppRoutes />
        <SessionWatcher />
        <Toaster />
        <VisitorAnalytics />
      </ThemeProvider>
    </LazyMotion>
  )
}

export default App
