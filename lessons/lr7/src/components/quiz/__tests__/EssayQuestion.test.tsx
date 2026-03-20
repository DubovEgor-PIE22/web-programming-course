import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { act } from '@testing-library/react'
import EssayQuestion from '../EssayQuestion'
import { useUIStore } from '../../../stores/uiStore'
import { mockEssayQuestion } from '../../../test/mockData'

describe('EssayQuestion', () => {
  const defaultProps = {
    question: mockEssayQuestion,
    essayAnswer: '',
    onAnswerChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      useUIStore.setState({ theme: 'light' })
    })
  })

  it('should render textarea with placeholder', () => {
    render(<EssayQuestion {...defaultProps} />)
    expect(screen.getByPlaceholderText('Введите ваш ответ здесь...')).toBeInTheDocument()
  })

  it('should display current answer value', () => {
    render(<EssayQuestion {...defaultProps} essayAnswer="Test answer" />)
    expect(screen.getByDisplayValue('Test answer')).toBeInTheDocument()
  })

  it('should call onAnswerChange when typing', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<EssayQuestion {...defaultProps} onAnswerChange={handleChange} />)

    const textarea = screen.getByPlaceholderText('Введите ваш ответ здесь...')
    await user.type(textarea, 'A')

    expect(handleChange).toHaveBeenCalledWith('A')
  })

  it('should show character count', () => {
    render(<EssayQuestion {...defaultProps} essayAnswer="Hello" />)
    expect(screen.getByText(/5 символов/)).toBeInTheDocument()
  })

  it('should display minimum length requirement', () => {
    render(<EssayQuestion {...defaultProps} />)
    expect(screen.getByText(/минимум 100/)).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<EssayQuestion {...defaultProps} disabled />)
    const textarea = screen.getByPlaceholderText('Введите ваш ответ здесь...')
    expect(textarea).toBeDisabled()
  })

  it('should respect maxLength attribute', () => {
    render(<EssayQuestion {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Введите ваш ответ здесь...') as HTMLTextAreaElement
    expect(textarea.maxLength).toBe(1000)
  })
})
