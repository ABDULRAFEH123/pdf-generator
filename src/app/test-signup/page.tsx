'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSignup() {
  const [email, setEmail] = useState('testuser@gmail.com')
  const [password, setPassword] = useState('password123')
  const [result, setResult] = useState('')

  const handleTestSignup = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setResult(`Error: ${error.message}`)
      } else {
        setResult(`Success: User created with ID ${data.user?.id}`)
      }
    } catch (err) {
      setResult(`Exception: ${err}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Supabase Signup</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        
        <button
          onClick={handleTestSignup}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Signup
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre>{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
