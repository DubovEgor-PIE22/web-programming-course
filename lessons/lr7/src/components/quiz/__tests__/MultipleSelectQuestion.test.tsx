import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { act } from '@testing-library/react'
import MultipleSelectQuestion from '../MultipleSelectQuestion'
import { gameStore } from '../../../stores/gameStore'
import { useUIStore } from '../../../stores/uiStore'
import { mockSingleQuestion } from '../../../test/mockData'

describe('MultipleSelectQuestion', () => {
  const defaultProps = {
    question: mockSingleQuestion,
    selectedAnswers: [],
  }

  beforeEach(() => {
    act(() => {
      gameStore.resetGame()
      useUIStore.setState({ theme: 'light' })
    })
  })

  it('should render all options', () => {
    render(<MultipleSelectQuestion {...defaultProps} />)

    expect(screen.getByText('Вариант 1')).toBeInTheDocument()
    expect(screen.getByText('Вариант 2')).toBeInTheDocument()
    expect(screen.getByText('Вариант 3')).toBeInTheDocument()
    expect(screen.getByText('Вариант 4')).toBeInTheDocument()
  })

  it('should show letter labels when not selected', () => {
    render(<MultipleSelectQuestion {...defaultProps} />)

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('should show checkmark for selected answers', () => {
    render(<MultipleSelectQuestion {...defaultProps} selectedAnswers={[0]} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('should toggle answer when clicked', async () => {
    const user = userEvent.setup()
    render(<MultipleSelectQuestion {...defaultProps} />)

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])

    expect(gameStore.selectedAnswers).toContain(0)

    await user.click(buttons[0])
    expect(gameStore.selectedAnswers).not.toContain(0)
  })

  it('should disable all buttons when disabled', () => {
    render(<MultipleSelectQuestion {...defaultProps} disabled />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('should handle empty options', () => {
    const questionWithoutOptions = {
      ...mockSingleQuestion,
      options: undefined,
    }

    render(<MultipleSelectQuestion {...defaultProps} question={questionWithoutOptions} />)

    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })
})
