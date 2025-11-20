'use client'
import { useState } from 'react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState(null)

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const getCSRFToken = () => {
    const match = document.cookie.split('; ').find(row => row.startsWith('csrftoken'))
    return match ? match.split('=')[1] : null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setErrors(null)

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match!" })
      return
    }

    setLoading(true)
    try {
      // 1. Fetch CSRF cookie
      await fetch('http://127.0.0.1:8000/authapp/csrf/', {
        method: 'GET',
        credentials: 'include'
      })

      // 2. Get token from cookie
      const csrfToken = getCSRFToken()

      // 3. Call register API
      const response = await fetch('http://127.0.0.1:8000/authapp/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.name,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()
      if (response.ok) {
        alert(data.message)
        setFormData({ name: '', email: '', password: '', confirmPassword: '' })
      } else {
        setErrors(data)
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
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-sm">
          <h1 className="text-white text-2xl font-light text-center mb-8">
            Log in or sign up
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors?.general && <p className="text-red-500 text-sm text-center">{errors.general}</p>}

            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600 transition"
            />
            {errors?.username && <p className="text-red-500 text-sm">{errors.username}</p>}

            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600 transition"
            />
            {errors?.email && <p className="text-red-500 text-sm">{errors.email}</p>}

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600 transition"
            />
            {errors?.password && <p className="text-red-500 text-sm">{errors.password}</p>}

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600 transition"
            />
            {errors?.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}

            <div className="border-t border-gray-700 my-6"></div>

            <button
              type="submit"
              className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Continue"}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
