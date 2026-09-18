import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CalendarPage } from './features/calendar/CalendarPage'
import { PaperworkPage } from './features/care/DocumentsPage'
import { FamilyPage, PersonDetailPage } from './features/care/FamilyPage'
import { HomePage } from './features/care/HomePage'
import { PetDetailPage, PetsPage } from './features/care/PetsPage'
import { NotesPage } from './features/calendar/NotesPage'
import { MealsPage, RecipesPage } from './features/meals/MealsPage'
import { NotificationsPage } from './features/settings/NotificationsPage'
import { PreferencesPage } from './features/settings/PreferencesPage'
import { FinancePage } from './features/finance/FinancePage'
import { FundDetailPage, FundsPage } from './features/finance/FundsPage'
import { InstallmentsPage } from './features/finance/InstallmentsPage'
import { ServicesPage } from './features/finance/ServicesPage'
import { LoginPage } from './features/settings/LoginPage'
import { MorePage } from './features/settings/MorePage'
import { OnboardingPage } from './features/settings/OnboardingPage'
import { SectorsPage } from './features/settings/SectorsPage'
import { ShopModePage } from './features/shopping/ShopModePage'
import { ShoppingPage } from './features/shopping/ShoppingPage'
import { TodayPage } from './features/today/TodayPage'
import { useAuth } from './hooks/useAuth'
import { HouseholdProvider, useHousehold } from './hooks/useHousehold'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <Splash />
  if (!user) return <LoginPage />

  return (
    <HouseholdProvider user={user}>
      <Gate />
    </HouseholdProvider>
  )
}

function Gate() {
  const { household, loading } = useHousehold()
  if (loading) return <Splash />
  if (!household) return <OnboardingPage />

  return (
    <Routes>
      <Route path="/super/modo-compra" element={<ShopModePage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/super" element={<ShoppingPage />} />
        <Route path="/gastos" element={<FinancePage />} />
        <Route path="/gastos/cuotas" element={<InstallmentsPage />} />
        <Route path="/gastos/servicios" element={<ServicesPage />} />
        <Route path="/gastos/fondos" element={<FundsPage />} />
        <Route path="/gastos/fondos/:id" element={<FundDetailPage />} />
        <Route path="/agenda" element={<CalendarPage />} />
        <Route path="/notas" element={<NotesPage />} />
        <Route path="/menus" element={<MealsPage />} />
        <Route path="/menus/recetas" element={<RecipesPage />} />
        <Route path="/familia" element={<FamilyPage />} />
        <Route path="/familia/:id" element={<PersonDetailPage />} />
        <Route path="/mascotas" element={<PetsPage />} />
        <Route path="/mascotas/:id" element={<PetDetailPage />} />
        <Route path="/tramites" element={<PaperworkPage />} />
        <Route path="/casa" element={<HomePage />} />
        <Route path="/mas" element={<MorePage />} />
        <Route path="/mas/sectores" element={<SectorsPage />} />
        <Route path="/mas/preferencias" element={<PreferencesPage />} />
        <Route path="/mas/notificaciones" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Splash() {
  return <div className="flex h-full items-center justify-center text-muted">Cargando…</div>
}
