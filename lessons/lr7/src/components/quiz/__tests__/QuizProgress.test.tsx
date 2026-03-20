import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { act } from '@testing-library/react'
import QuizProgress from '../QuizProgress'
import { gameStore } from '../../../stores/gameStore'
import { useUIStore } from '../../../stores/uiStore'
import { mockQuestions } from '../../../test/mockData'

describe('QuizProgress', () => {
  beforeEach(() => {
    act(() => {
      gameStore.resetGame()
      useUIStore.setState({ theme: 'light' })
    })
  })

  it('should render progress bar with question info', () => {
    gameStore.setQuestionsFromAPI(mockQuestions)
    render(<QuizProgress />)

    expect(screen.getByText('Вопрос 1 из 3')).toBeInTheDocument()
    expect(screen.getByText(/Счёт:/)).toBeInTheDocument()
  })

  it('should display current score', () => {
    gameStore.setQuestionsFromAPI(mockQuestions)
    gameStore.score = 50
    render(<QuizProgress />)

    expect(screen.getByText('Счёт: 50')).toBeInTheDocument()
  })

  it('should update question number after navigation', () => {
    gameStore.setQuestionsFromAPI(mockQuestions)
    gameStore.startGame()

    const { rerender } = render(<QuizProgress />)
    expect(screen.getByText('Вопрос 1 из 3')).toBeInTheDocument()

    act(() => {
      gameStore.nextQuestion()
    })

    rerender(<QuizProgress />)
    expect(screen.getByText('Вопрос 2 из 3')).toBeInTheDocument()
  })

  it('should show correct progress bar width', () => {
    gameStore.setQuestionsFromAPI(mockQuestions)
    render(<QuizProgress />)

    const progressBar = document.querySelector('[style*="width"]')
    expect(progressBar).toHaveStyle({ width: '33.33333333333333%' })
  })

  it('should show theme toggle button with correct emoji', () => {
    gameStore.setQuestionsFromAPI(mockQuestions)
    render(<QuizProgress />)

    expect(screen.getByText('🌙')).toBeInTheDocument()
  })

  it('should toggle theme when button clicked', async () => {
    const user = userEvent.setup()
    gameStore.setQuestionsFromAPI(mockQuestions)

    const { rerender } = render(<QuizProgress />)
    expect(screen.getByText('🌙')).toBeInTheDocument()

    await user.click(screen.getByRole('button'))

    rerender(<QuizProgress />)
    expect(screen.getByText('☀️')).toBeInTheDocument()
  })
})
