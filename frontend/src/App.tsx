import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { I18nProvider } from './i18n/context'
import CreatePage from './pages/CreatePage'
import ReadPage from './pages/ReadPage'
import ViewPage from './pages/ViewPage'
import Layout from './components/Layout'
import './styles.css'

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/create" replace />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/read/:id" element={<ReadPage />} />
            <Route path="/view/:id" element={<ViewPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </I18nProvider>
  )
}
