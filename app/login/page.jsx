'use client'
import Header from "../components/Header_first";
import { useState } from 'react'
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({ username: '', password: '' })
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
    setLoading(true)

    try {
      await fetch('http://127.0.0.1:8000/authapp/csrf/', {
        method: 'GET',
        credentials: 'include'
      })

      const csrfToken = getCSRFToken()

      const response = await fetch('http://127.0.0.1:8000/authapp/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok) {

        router.push("/dashboard")

        // Reset form
        setFormData({ username: '', password: '' })
      } else {
        // Show backend error message
        setErrors({ general: data.error || "Invalid username or password" })
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
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-sm">
          <h1 className="text-white text-2xl font-light text-center mb-8">
            Login
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">

            {errors?.general && (
              <p className="text-red-500 text-sm text-center">{errors.general}</p>
            )}

            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
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
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
