import React, { useState } from 'react'
import { X, User, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    setError(null)
    setSuccessMessage(null)
    const { error } = await signInWithGoogle()
    if (error) {
      console.error('Login error:', error.message)
      setError('Login failed: ' + error.message)
    } else {
      onClose()
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setError(null)
    setSuccessMessage(null)
    setEmailLoading(true)
    try {
      const { error } = mode === 'signin' 
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password)

      if (error) {
        console.error('Auth error:', error.message)
        setError((mode === 'signin' ? 'Sign in' : 'Sign up') + ' failed: ' + error.message)
      } else {
        if (mode === 'signup') {
          setSuccessMessage('Please check your email to confirm your account!')
          setTimeout(() => onClose(), 3000)
        } else {
          onClose()
        }
      }
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-lorcana-navy text-lorcana-gold border-b-2 border-lorcana-gold">
          <div className="flex items-center space-x-2">
            <User size={24} />
            <h2 className="text-xl font-bold">Sign In</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-lorcana-gold hover:text-lorcana-navy rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-lorcana-ink mb-2">
              Welcome to Lorebook
            </h3>
            <p className="text-lorcana-navy text-sm">
              Sign in to sync your collection and decks across all your devices
            </p>
          </div>

          {/* Auth Mode Tabs */}
          <div className="flex mb-6 border-2 border-lorcana-gold rounded-sm overflow-hidden">
            <button
              onClick={() => {
                setMode('signin')
                setError(null)
                setSuccessMessage(null)
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-lorcana-gold text-lorcana-navy'
                  : 'bg-white text-lorcana-navy hover:bg-lorcana-cream'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup')
                setError(null)
                setSuccessMessage(null)
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-lorcana-gold text-lorcana-navy'
                  : 'bg-white text-lorcana-navy hover:bg-lorcana-cream'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-sm flex items-start space-x-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-sm flex items-start space-x-2">
              <AlertCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-lorcana-ink mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-lorcana-ink mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading || !email || !password}
              className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3 bg-lorcana-navy text-lorcana-gold rounded-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail size={18} />
              <span>
                {emailLoading 
                  ? (mode === 'signin' ? 'Signing In...' : 'Signing Up...') 
                  : (mode === 'signin' ? 'Sign In with Email' : 'Sign Up with Email')
                }
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Sign in button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700">
              {loading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to sync your collection data with our secure servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal