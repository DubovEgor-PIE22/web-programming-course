import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { act } from '@testing-library/react'
import QuizButton from '../QuizButton'
import { useUIStore } from '../../../stores/uiStore'

describe('QuizButton', () => {
  beforeEach(() => {
    act(() => {
      useUIStore.setState({ theme: 'light' })
    })
  })

  it('should render button with text', () => {
    render(<QuizButton onClick={() => {}}>Click me</QuizButton>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<QuizButton onClick={handleClick}>Click me</QuizButton>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<QuizButton onClick={handleClick} disabled>Click me</QuizButton>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should respond to theme changes', () => {
    const { rerender } = render(<QuizButton onClick={() => {}}>Button</QuizButton>)

    act(() => {
      useUIStore.setState({ theme: 'dark' })
    })

    rerender(<QuizButton onClick={() => {}}>Button</QuizButton>)
    // Компонент должен отобразиться без ошибок с новой темой
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
