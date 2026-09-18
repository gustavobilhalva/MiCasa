import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, googleProvider } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  return {
    user,
    loading: user === undefined,
    signIn: () => signInWithPopup(auth, googleProvider),
    signOut: () => signOut(auth),
  }
}
