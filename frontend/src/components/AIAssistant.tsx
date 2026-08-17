/**
 * AI Assistant Panel
 *
 * Provides AI-assisted code generation, explanation, optimization, testing, etc.
 * Integrates with Claude, OpenAI, Ollama, and MCP tools
 */

import { useState, useCallback } from 'react'
import { Sparkles, Send, Copy, Check, Settings, RefreshCw } from 'lucide-react'
import {
  type AIAction,
  type AIProvider,
  type AIRequest,
  processAIRequest,
  AI_ACTIONS,
  AI_PROVIDERS,
  getSuggestedActions,
  type CellLanguage,
} from '../lib/aiIntegration'

interface AIAssistantProps {
  selectedCode?: string
  selectedLanguage?: CellLanguage
  hasError?: boolean
  onCodeGenerated?: (code: string) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: AIAction
  code?: string
  timestamp: number
}

export default function AIAssistant({
  selectedCode = '',
  selectedLanguage = 'python',
  hasError = false,
  onCodeGenerated,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<AIProvider>('claude')
  const [selectedAction, setSelectedAction] = useState<AIAction>('explain')
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)

  const suggestedActions = getSuggestedActions(selectedLanguage, hasError)

  const handleAction = useCallback(
    async (action: AIAction) => {
      if (!selectedCode) return

      setIsLoading(true)
      setSelectedAction(action)

      try {
        const request: AIRequest = {
          action,
          code: selectedCode,
          language: selectedLanguage,
          provider,
          context: {
            error: hasError ? 'Code has an error' : undefined,
          },
        }

        // Add user message
        setMessages(prev => [...prev, {
          role: 'user',
          content: AI_ACTIONS[action].name,
          action,
          timestamp: Date.now(),
        }])

        // Process AI request
        const response = await processAIRequest(request)

        // Add assistant response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.explanation || response.generated_code || '',
          code: response.generated_code,
          timestamp: Date.now(),
        }])

        // If code was generated, offer to insert it
        if (response.generated_code && onCodeGenerated) {
          onCodeGenerated(response.generated_code)
        }
      } catch (error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        }])
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCode, selectedLanguage, provider, hasError, onCodeGenerated]
  )

  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return

    setIsLoading(true)

    try {
      setMessages(prev => [...prev, {
        role: 'user',
        content: input,
        timestamp: Date.now(),
      }])

      const request: AIRequest = {
        action: 'generate',
        code: input,
        language: selectedLanguage,
        provider,
        context: {
          previous_cells: [selectedCode].filter(Boolean),
        },
      }

      const response = await processAIRequest(request)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.explanation || response.generated_code || '',
        code: response.generated_code,
        timestamp: Date.now(),
      }])

      setInput('')
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, selectedCode, selectedLanguage, provider])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-400" />
            <h2 className="font-semibold text-slate-100">AI Assistant</h2>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Provider Selector */}
        {!showSettings && (
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100"
          >
            {Object.entries(AI_PROVIDERS).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-400 mb-1">API Key for {AI_PROVIDERS[provider].name}</label>
              <input
                type="password"
                placeholder="Enter API key"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Temperature</label>
              <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {selectedCode && (
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Quick actions for {selectedLanguage}:</div>
          <div className="grid grid-cols-2 gap-2">
            {suggestedActions.map(action => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                disabled={isLoading}
                className="px-3 py-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {AI_ACTIONS[action].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
            <p>Select code and choose an action, or ask a question</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.code && (
                  <div className="mt-2 bg-slate-900 rounded p-2 text-xs font-mono overflow-x-auto">
                    {msg.code.split('\n').slice(0, 5).join('\n')}
                    {msg.code.split('\n').length > 5 && '\n...'}
                  </div>
                )}
                {msg.code && (
                  <button
                    onClick={() => copyToClipboard(msg.code!)}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-100 px-4 py-2 rounded-lg flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask for help..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
