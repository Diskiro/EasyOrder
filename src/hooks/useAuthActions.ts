import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUI } from '../context/UIContext'
import type { AuthProvider } from '@toolpad/core/SignInPage'

export function useAuthActions() {
    const { showAlert } = useUI()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const handleSignIn = async (_provider: AuthProvider, formData: any) => {
        try {
            const email = formData.get('email') as string
            const password = formData.get('password') as string

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error
            // Force hard refresh to ensure clean state
            window.location.href = '/'
            return { data, error: undefined }
        } catch (error: any) {
            showAlert(error.message || 'Error al iniciar sesión', 'error')
            return { data: { user: null, session: null }, error: error.message }
        }
    }

    const handleVerifyAdmin = async (adminEmail: string, adminPassword: string): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            })

            if (error) throw error

            // Check if this user is actually an admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single()

            if (profileError || profile?.role !== 'admin') {
                // Not an admin, sign out
                await supabase.auth.signOut()
                throw new Error('Solo los administradores pueden registrar nuevo personal.')
            }

            return true

        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleSecureSignUp = async (signupEmail: string, signupPassword: string, fullName: string, role: string = 'waiter'): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    data: {
                        full_name: fullName,
                        role,
                    }
                }
            })

            if (error) throw error

            showAlert('Usuario registrado exitosamente!', 'success')
            return true
        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRecovery = async (recoveryEmail: string): Promise<boolean> => {
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
                redirectTo: window.location.origin + '/update-password',
            })
            if (error) throw error
            setMessage('Check your email for the password reset link.')
            showAlert('Correo de recuperación enviado. Revisa tu bandeja de entrada.', 'success')
            return true
        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
            return false
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        error,
        message,
        handleSignIn,
        handleVerifyAdmin,
        handleSecureSignUp,
        handleRecovery,
        setError,
        setMessage
    }
}
