import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import { createHousehold, joinWithInvite } from '../../lib/household'

type Mode = 'choose' | 'create' | 'join'

export function OnboardingPage() {
  const { user } = useHousehold()
  const { signOut } = useAuth()
  const [mode, setMode] = useState<Mode>('choose')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'create') await createHousehold(user, value.trim() || 'Nuestra Casa')
      else await joinWithInvite(user, value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {user.displayName?.split(' ')[0]}</h1>
        <p className="mt-1 text-muted">Para empezar, creá un hogar o unite al de tu pareja.</p>
      </div>

      {mode === 'choose' && (
        <div className="flex flex-col gap-3">
          <Button onClick={() => setMode('create')}>Crear un hogar nuevo</Button>
          <Button variant="secondary" onClick={() => setMode('join')}>
            Tengo un código de invitación
          </Button>
        </div>
      )}

      {mode !== 'choose' && (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">{mode === 'create' ? 'Nombre del hogar' : 'Código de invitación'}</span>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(mode === 'join' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={mode === 'create' ? 'Nuestra Casa' : 'ABC123'}
              maxLength={mode === 'join' ? 6 : 40}
              autoCapitalize={mode === 'join' ? 'characters' : 'sentences'}
              className={mode === 'join' ? 'text-center font-mono text-2xl tracking-[0.3em]' : ''}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy || (mode === 'join' && value.length !== 6)}>
            {busy ? 'Un momento…' : mode === 'create' ? 'Crear hogar' : 'Unirme'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setMode('choose'); setError(null) }}>
            Volver
          </Button>
        </form>
      )}

      <button onClick={signOut} className="text-sm text-muted underline">
        Salir de {user.email}
      </button>
    </main>
  )
}
