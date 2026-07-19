import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            className="flex items-center justify-center w-full h-full bg-pn-solid-bg text-pn-text border border-pn-bd rounded-lg p-4"
            style={{
              backgroundColor: 'var(--pn-solid-bg, #1e1e1e)',
              color: 'var(--pn-text, #e0e0e0)',
              borderColor: 'var(--pn-bd, #333)',
            }}
          >
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <p className="text-sm mb-4 opacity-75">{this.state.error?.message}</p>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
