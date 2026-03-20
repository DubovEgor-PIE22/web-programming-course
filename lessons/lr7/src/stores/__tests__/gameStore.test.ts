import { describe, it, expect, beforeEach } from 'vitest'
import { GameStore } from '../gameStore'
import { mockQuestions } from '../../test/mockData'

describe('GameStore', () => {
  let store: GameStore

  beforeEach(() => {
    store = new GameStore()
  })

  it('should initialize with default values', () => {
    expect(store.gameStatus).toBe('idle')
    expect(store.questions).toEqual([])
    expect(store.score).toBe(0)
    expect(store.selectedAnswers).toEqual([])
  })

  it('should start game and reset state', () => {
    store.score = 100
    store.selectedAnswers = [0, 1]

    store.startGame()

    expect(store.gameStatus).toBe('playing')
    expect(store.score).toBe(0)
    expect(store.selectedAnswers).toEqual([])
  })

  it('should toggle answer selection', () => {
    store.toggleAnswer(0)
    expect(store.selectedAnswers).toEqual([0])

    store.toggleAnswer(0)
    expect(store.selectedAnswers).toEqual([])
  })

  it('should allow multiple answer selections', () => {
    store.toggleAnswer(0)
    store.toggleAnswer(2)
    expect(store.selectedAnswers).toEqual([0, 2])
  })

  it('should save correct answer', () => {
    store.setQuestionsFromAPI(mockQuestions)
    store.toggleAnswer(0) // Правильный ответ
    store.saveCurrentAnswer()

    expect(store.answeredQuestions).toHaveLength(1)
    expect(store.answeredQuestions[0].isCorrect).toBe(true)
  })

  it('should not save if no answer selected', () => {
    store.setQuestionsFromAPI(mockQuestions)
    store.saveCurrentAnswer()

    expect(store.answeredQuestions).toEqual([])
  })

  it('should navigate to next question', () => {
    store.setQuestionsFromAPI(mockQuestions)
    store.startGame()
    store.toggleAnswer(0)

    store.nextQuestion()

    expect(store.currentQuestionIndex).toBe(1)
    expect(store.selectedAnswers).toEqual([])
  })

  it('should finish game on last question', () => {
    store.setQuestionsFromAPI(mockQuestions)
    store.currentQuestionIndex = 2

    store.nextQuestion()

    expect(store.gameStatus).toBe('finished')
  })

  it('should calculate progress correctly', () => {
    store.setQuestionsFromAPI(mockQuestions)
    expect(store.progress).toBeCloseTo(33.33, 1)

    store.nextQuestion()
    expect(store.progress).toBeCloseTo(66.66, 1)
  })

  it('should return current question', () => {
    expect(store.currentQuestion).toBeNull()

    store.setQuestionsFromAPI(mockQuestions)
    expect(store.currentQuestion).toEqual(mockQuestions[0])
  })

  it('should count correct answers', () => {
    store.answeredQuestions = [
      { questionId: '1', selectedAnswers: [0], isCorrect: true },
      { questionId: '2', selectedAnswers: [1], isCorrect: false },
      { questionId: '3', selectedAnswers: [2], isCorrect: true },
    ]

    expect(store.correctAnswersCount).toBe(2)
  })
})
