import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const { updatePassword, session } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isRecoverySession, setIsRecoverySession] = useState(false)

  useEffect(() => {
    // Check if we have a recovery session from the email link
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Check if this is a recovery session by looking at the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')
      
      if (type === 'recovery' || (session && window.location.hash.includes('type=recovery'))) {
        setIsRecoverySession(true)
      } else if (!session) {
        // No session and no recovery token, redirect to home
        navigate('/')
      }
    }

    checkRecoverySession()
  }, [navigate, session])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await updatePassword(newPassword)
      
      if (error) {
        console.error('Password update error:', error.message)
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to home after successful password reset
        setTimeout(() => {
          navigate('/')
        }, 3000)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isRecoverySession && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto text-lorcana-gold mb-4" size={48} />
            <h2 className="text-xl font-bold text-lorcana-ink mb-2">No Recovery Session</h2>
            <p className="text-lorcana-navy mb-4">
              Please use the password reset link from your email to access this page.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-lorcana-navy text-lorcana-gold rounded-sm hover:bg-opacity-90 transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-md w-full p-6">
          <div className="text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-lorcana-ink mb-2">Password Reset Successful!</h2>
            <p className="text-lorcana-navy mb-4">
              Your password has been updated. Redirecting you to the home page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-md w-full">
        {/* Header */}
        <div className="p-6 bg-lorcana-navy text-lorcana-gold border-b-2 border-lorcana-gold">
          <div className="flex items-center space-x-2">
            <Lock size={24} />
            <h2 className="text-xl font-bold">Reset Your Password</h2>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <p className="text-lorcana-navy mb-6">
            Enter your new password below. Make sure it's at least 6 characters long.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-sm flex items-start space-x-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-lorcana-ink mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
                placeholder="Enter new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-lorcana-ink mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
                placeholder="Confirm new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-lorcana-navy text-lorcana-gold rounded-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock size={18} />
              <span>{loading ? 'Updating Password...' : 'Reset Password'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-lorcana-navy hover:text-lorcana-gold underline"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword