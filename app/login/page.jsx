'use client'
import Header from "../components/Header_first";
import { useState } from 'react'
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState(null)

  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const getCSRFToken = () => {
    const match = document.cookie.split('; ').find(row => row.startsWith('csrftoken'))
    return match ? match.split('=')[1] : null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors(null)
    setLoading(true)

    try {
      // 1) get CSRF
      await fetch('http://127.0.0.1:8000/authapp/csrf/', {
        method: 'GET',
        credentials: 'include'
      })
      const csrfToken = getCSRFToken()

      // 2) call login -> sends OTP
      const response = await fetch('http://127.0.0.1:8000/authapp/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok && data.otp_required) {
        setOtpId(data.otp_id)
        setShowOtp(true)
      } else {
        setErrors({ general: data.error || "Invalid email or password" })
      }
    } catch (err) {
      console.error(err)
      setErrors({ general: "Something went wrong. Try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otpId) return
    setLoading(true)
    setErrors(null)

    try {
      const csrfToken = getCSRFToken()

      const response = await fetch('http://127.0.0.1:8000/authapp/verify-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          otp_id: otpId,
          code: otp
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowOtp(false)
        setOtp('')
        setFormData({ email: '', password: '' })
        router.push('/dashboard')
      } else {
        setErrors({ general: data.error || "Invalid OTP" })
      }
    } catch (err) {
      console.error(err)
      setErrors({ general: "Something went wrong. Try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-500 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-sm relative">
          <h1 className="text-white text-2xl font-light text-center mb-8">
            Login
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors?.general && (
              <p className="text-red-500 text-sm text-center">{errors.general}</p>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3"
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3"
            />

            <div className="border-t border-gray-700 my-6"></div>

            <button
              type="submit"
              className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Login"}
            </button>
          </form>

          {showOtp && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-900 p-6 rounded-lg w-full max-w-xs">
                <h2 className="text-white text-lg mb-4 text-center">Enter OTP</h2>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 text-center tracking-[0.3em]"
                    placeholder="123456"
                  />
                  <button
                    type="submit"
                    className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    className="w-full text-gray-400 text-sm mt-2"
                    onClick={() => setShowOtp(false)}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
