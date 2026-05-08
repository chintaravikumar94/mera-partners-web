'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User, onAuthStateChanged, signInWithEmailAndPassword,
  signInWithPopup, signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'

// ── Types ──────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid    : string
  name   : string
  email  : string
  mobile : string
  role   : string
  status : string
  photoUrl?: string
}

interface AuthContextType {
  user        : User | null
  profile     : UserProfile | null
  loading     : boolean
  loginEmail  : (email: string, password: string) => Promise<void>
  loginGoogle : () => Promise<void>
  logout      : () => Promise<void>
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Load Firestore profile ──────────────────────────────────────────────
  const loadProfile = async (u: User) => {
    const snap = await getDoc(doc(db, 'users', u.uid))
    if (snap.exists()) {
      setProfile({ uid: u.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) })
    } else {
      // First-time Google user → create doc
      const newProfile: Omit<UserProfile, 'uid'> = {
        name    : u.displayName ?? '',
        email   : u.email       ?? '',
        mobile  : '',
        role    : 'partner',
        status  : 'active',
        photoUrl: u.photoURL    ?? '',
      }
      await setDoc(doc(db, 'users', u.uid), {
        ...newProfile,
        loginMethod: 'google',
        createdAt  : serverTimestamp(),
      })
      setProfile({ uid: u.uid, ...newProfile })
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) await loadProfile(u)
      else    setProfile(null)
      setLoading(false)
    })
    return unsub
  }, [])

  // ── Auth methods ────────────────────────────────────────────────────────
  const loginEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await loadProfile(cred.user)
  }

  const loginGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    await loadProfile(cred.user)
  }

  const logout = async () => {
    await signOut(auth)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginEmail, loginGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
