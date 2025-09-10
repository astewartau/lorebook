import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback from Supabase
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('Authentication failed. Please try again.')
          setIsProcessing(false)
          return
        }

        if (data.session) {
          // Auth successful - wait a moment for auth context to update
          setTimeout(() => {
            navigate('/cards', { replace: true })
          }, 500)
        } else {
          // No session found
          setError('No authentication session found.')
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An unexpected error occurred.')
        setIsProcessing(false)
      }
    }

    handleAuthCallback()
  }, [navigate])

  // If auth context has loaded and user is authenticated, redirect immediately
  useEffect(() => {
    if (!loading && user && !error) {
      navigate('/cards', { replace: true })
    }
  }, [loading, user, error, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lorcana-navy to-lorcana-ink flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-md">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-lorcana-ink mb-2">Authentication Failed</h2>
          <p className="text-lorcana-navy mb-6">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-lorcana-navy text-lorcana-gold rounded-sm hover:bg-opacity-90 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lorcana-navy to-lorcana-ink flex items-center justify-center p-4">
      <div className="text-center p-8 bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-md">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-lorcana-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-lorcana-ink mb-2">Signing you in...</h2>
        <p className="text-lorcana-navy">
          {isProcessing ? 'Processing authentication...' : 'Redirecting to your collection...'}
        </p>
      </div>
    </div>
  )
}

export default AuthCallback