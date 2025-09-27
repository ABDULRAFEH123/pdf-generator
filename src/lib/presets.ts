import { Preset } from '@/types'

export const createPreset = async (preset: Omit<Preset, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const response = await fetch('/api/presets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preset),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { data: null, error: result.error }
    }
    
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to create preset' }
  }
}

export const getPresets = async (userId: string) => {
  try {
    const response = await fetch(`/api/presets?userId=${userId}`)
    const result = await response.json()
    
    if (!response.ok) {
      return { data: null, error: result.error }
    }
    
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to fetch presets' }
  }
}

export const getPreset = async (presetId: string) => {
  try {
    const response = await fetch(`/api/presets/${presetId}`)
    const result = await response.json()
    
    if (!response.ok) {
      return { data: null, error: result.error }
    }
    
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to fetch preset' }
  }
}

export const updatePreset = async (presetId: string, updates: Partial<Preset>) => {
  try {
    const response = await fetch(`/api/presets/${presetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { data: null, error: result.error }
    }
    
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to update preset' }
  }
}

export const deletePreset = async (presetId: string) => {
  try {
    const response = await fetch(`/api/presets/${presetId}`, {
      method: 'DELETE',
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { error: result.error }
    }
    
    return { error: null }
  } catch (error) {
    return { error: 'Failed to delete preset' }
  }
}
