import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export function LoginPage() {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión')
    }
  }

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Nuestra Casa</h1>
        <p className="mt-2 text-muted">Organización del hogar, en tiempo real.</p>
      </div>
      <button
        onClick={handleSignIn}
        className="min-h-12 w-full max-w-xs rounded-xl bg-accent px-6 font-medium text-white active:bg-accent-strong"
      >
        Entrar con Google
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </main>
  )
}
