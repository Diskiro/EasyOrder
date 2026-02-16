import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SupabaseClient } from '@supabase/supabase-js'
import { AppProvider } from '@toolpad/core/AppProvider'
import { SignInPage, type AuthProvider } from '@toolpad/core/SignInPage'
import { createTheme } from '@mui/material/styles'
import { Box, Button, TextField, Typography, Link, Alert, Container, IconButton } from '@mui/material'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useUI } from '../context/UIContext'

// Defines the authentication providers (only credentials for now)
const providers = [{ id: 'credentials', name: 'Email and Password' }]

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#FBBF24', // Amber/Yellow
        },
        background: {
            default: '#121212',
            paper: '#1F2329',
        },
    },
    typography: {
        fontFamily: 'Inter, sans-serif',
    },
})

export default function Login() {
    const { showAlert } = useUI()
    // Modes: 'signin' | 'signup' | 'recovery'
    const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin')
    // SignUp Steps: 'admin-auth' | 'create-user'
    const [signupStep, setSignupStep] = useState<'admin-auth' | 'create-user'>('admin-auth')

    // Admin Auth State
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const adminClientRef = useRef<SupabaseClient | null>(null)

    // New User State
    const [fullName, setFullName] = useState('')
    const [signupEmail, setSignupEmail] = useState('')
    const [signupPassword, setSignupPassword] = useState('')
    const [signupRole] = useState('waiter')

    const [recoveryEmail, setRecoveryEmail] = useState('')

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

    // 1. Verify Admin Credentials 
    const handleVerifyAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
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

            setSignupStep('create-user')

        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    // 2. Secure Sign Up (Create the new user)
    const handleSecureSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    data: {
                        full_name: fullName,
                        role: signupRole,
                    }
                }
            })

            if (error) throw error

            showAlert('Usuario registrado exitosamente!', 'success')
            setMode('signin')
            setSignupStep('admin-auth')
            // Reset fields
            setFullName('')
            setSignupEmail('')
            setSignupPassword('')
            setAdminEmail('')
            setAdminPassword('')
            adminClientRef.current = null

        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    // 4. Custom Handler for Recovery
    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault()
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
        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AppProvider theme={darkTheme}>
            <Box
                sx={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'background.default',
                    overflow: 'hidden'
                }}
            >
                {mode === 'signin' && (
                    <Box sx={{ width: '100%', maxWidth: 400, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h5" color="white" fontWeight="bold" sx={{ mb: 3 }}>
                            EasyOrder Login
                        </Typography>
                        <SignInPage
                            signIn={handleSignIn}
                            providers={providers}
                            slotProps={{
                                emailField: { autoFocus: true },
                                form: { noValidate: false },
                                submitButton: { fullWidth: true }
                            }}
                            sx={{ minHeight: 'none' }}
                        />
                        <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => setMode('recovery')}
                                sx={{ color: 'primary.main', textDecoration: 'none' }}
                            >
                                Forgot Password?
                            </Link>
                            <Box sx={{ mt: 1 }}>
                                <Button
                                    startIcon={<ShieldCheck size={16} />}
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setMode('signup')}
                                    sx={{
                                        color: 'gray',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        '&:hover': { borderColor: '#FBBF24', color: '#FBBF24' }
                                    }}
                                >
                                    Register New Staff (Admin Only)
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                )}

                {mode === 'signup' && (
                    <Container maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 3 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <IconButton onClick={() => {
                                if (signupStep === 'create-user') setSignupStep('admin-auth')
                                else setMode('signin')
                            }} sx={{ color: 'gray', mr: 1 }}>
                                <ArrowLeft size={20} />
                            </IconButton>
                            <Typography variant="h6" color="white">
                                {signupStep === 'admin-auth' ? 'Admin Authorization' : 'New Staff Details'}
                            </Typography>
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        {signupStep === 'admin-auth' ? (
                            <form onSubmit={handleVerifyAdmin}>
                                <Typography variant="body2" color="gray" mb={3}>
                                    Please enter Administrator credentials to authorize a new user registration.
                                </Typography>
                                <TextField
                                    label="Admin Email"
                                    type="email"
                                    fullWidth
                                    margin="normal"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <TextField
                                    label="Admin Password"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{ mt: 3, mb: 2, bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#F59E0B' } }}
                                >
                                    {loading ? 'Verifying...' : 'Verify Admin'}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleSecureSignUp}>
                                <TextField
                                    label="Full Name"
                                    fullWidth
                                    margin="normal"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="New Staff Email"
                                    type="email"
                                    fullWidth
                                    margin="normal"
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="New Staff Password"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    value={signupPassword}
                                    onChange={(e) => setSignupPassword(e.target.value)}
                                    required
                                />

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{ mt: 3, mb: 2, bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#F59E0B' } }}
                                >
                                    {loading ? 'Creating User...' : 'Create User'}
                                </Button>
                            </form>
                        )}
                    </Container>
                )}

                {mode === 'recovery' && (
                    <Container maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 3 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <IconButton onClick={() => setMode('signin')} sx={{ color: 'gray', mr: 1 }}>
                                <ArrowLeft size={20} />
                            </IconButton>
                            <Typography variant="h6" color="white">
                                Password Recovery
                            </Typography>
                        </Box>

                        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <form onSubmit={handleRecovery}>
                            <Typography variant="body2" color="gray" mb={3}>
                                Enter your email address and we'll send you a link to reset your password.
                            </Typography>
                            <TextField
                                label="Email Address"
                                type="email"
                                fullWidth
                                margin="normal"
                                value={recoveryEmail}
                                onChange={(e) => setRecoveryEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                sx={{ mt: 3, mb: 2, bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#F59E0B' } }}
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        </form>
                    </Container>
                )}
            </Box>
        </AppProvider>
    )
}
