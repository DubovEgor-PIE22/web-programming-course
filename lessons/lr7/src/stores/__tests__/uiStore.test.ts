import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../uiStore'
import { act } from '@testing-library/react'

describe('UIStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should have initial state', () => {
    const { theme, soundEnabled } = useUIStore.getState()
    expect(['light', 'dark']).toContain(theme)
    expect(typeof soundEnabled).toBe('boolean')
  })

  it('should set theme', () => {
    act(() => {
      useUIStore.getState().setTheme('dark')
    })

    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('should toggle theme', () => {
    act(() => {
      useUIStore.getState().setTheme('light')
    })

    act(() => {
      useUIStore.getState().toggleTheme()
    })
    expect(useUIStore.getState().theme).toBe('dark')

    act(() => {
      useUIStore.getState().toggleTheme()
    })
    expect(useUIStore.getState().theme).toBe('light')
  })

  it('should toggle sound', () => {
    const initialSound = useUIStore.getState().soundEnabled

    act(() => {
      useUIStore.getState().toggleSound()
    })
    expect(useUIStore.getState().soundEnabled).toBe(!initialSound)

    act(() => {
      useUIStore.getState().toggleSound()
    })
    expect(useUIStore.getState().soundEnabled).toBe(initialSound)
  })

  it('should handle theme and sound changes independently', () => {
    act(() => {
      useUIStore.getState().setTheme('light')
    })

    const initialTheme = useUIStore.getState().theme
    const initialSound = useUIStore.getState().soundEnabled

    act(() => {
      useUIStore.getState().toggleTheme()
      useUIStore.getState().toggleSound()
    })

    expect(useUIStore.getState().theme).not.toBe(initialTheme)
    expect(useUIStore.getState().soundEnabled).not.toBe(initialSound)
  })
})
