import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Bell, BellOff, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { useHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import { disablePushOnThisDevice, enablePush, hasTokenOnThisDevice, isStandalone, pushSupported } from '../../lib/messaging'

export function NotificationsPage() {
  const { user, userDoc } = useHousehold()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [onDevice, setOnDevice] = useState(hasTokenOnThisDevice())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const prefs = userDoc?.notificationPrefs ?? { push: true, email: true }
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

  useEffect(() => {
    pushSupported().then(setSupported)
  }, [])

  const setPref = (key: 'push' | 'email', value: boolean) =>
    updateDoc(doc(db, 'users', user.uid), { [`notificationPrefs.${key}`]: value, updatedAt: serverTimestamp() })

  const enable = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await enablePush(user.uid)
      if (r.ok) {
        setOnDevice(true)
        setMsg('Listo. Este dispositivo va a recibir avisos.')
      } else setMsg(r.reason ?? 'No se pudo activar.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo activar.')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await disablePushOnThisDevice(user.uid)
      setOnDevice(false)
      setMsg('Este dispositivo ya no recibe avisos.')
    } finally {
      setBusy(false)
    }
  }

  const test = () => {
    if (Notification.permission === 'granted') new Notification('Nuestra Casa', { body: 'Así se ven los avisos.', icon: '/icons/icon-192.png' })
    else setMsg('Primero activá los avisos en este dispositivo.')
  }

  return (
    <>
      <TopBar
        title="Notificaciones"
        right={
          <Link to="/mas" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Volver
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-4 pb-28">
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell size={18} /> Avisos en el celular
          </h2>
          <p className="mt-1 text-sm text-muted">
            Vencimientos de servicios y tarjetas, vacunas, documentos, trámites, mantenimiento, eventos de mañana y notas del día. Se envían a las 9 y a las 18.
          </p>
          {supported === false && (
            <p className="mt-3 rounded-lg bg-warn/15 p-3 text-sm">
              Este navegador no soporta push.{isIOS && !isStandalone() && ' En iPhone, primero agregá la app a la pantalla de inicio (Compartir → Agregar a inicio) y abrila desde ahí.'}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {onDevice ? (
              <Button variant="secondary" onClick={disable} disabled={busy}>
                <BellOff size={18} /> Desactivar en este dispositivo
              </Button>
            ) : (
              <Button onClick={enable} disabled={busy || supported === false}>
                <Bell size={18} /> Activar en este dispositivo
              </Button>
            )}
            <Button variant="ghost" onClick={test}>
              Probar un aviso
            </Button>
          </div>
          {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
          <label className="mt-4 flex items-center gap-3">
            <input type="checkbox" checked={prefs.push !== false} onChange={(e) => setPref('push', e.target.checked)} className="size-5 accent-accent" />
            <span className="text-sm">Recibir push en todos mis dispositivos activados</span>
          </label>
        </section>

        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail size={18} /> Resumen por email
          </h2>
          <p className="mt-1 text-sm text-muted">Un mail con lo pendiente, a {user.email}.</p>
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" checked={prefs.email !== false} onChange={(e) => setPref('email', e.target.checked)} className="size-5 accent-accent" />
            <span className="text-sm">Recibir emails</span>
          </label>
        </section>

        <p className="text-xs text-muted">Los avisos asignados a una persona (servicio, trámite, tarea) le llegan solo a esa persona. Los demás, a los dos.</p>
      </main>
    </>
  )
}
