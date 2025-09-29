'use client'

import { useState, useRef } from 'react'

interface SimpleTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SimpleTextEditor({ value, onChange, placeholder = 'Enter your content here...' }: SimpleTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFormat = (command: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    let newText = ''

    switch (command) {
      case 'bold':
        newText = `**${selectedText}**`
        break
      case 'italic':
        newText = `*${selectedText}*`
        break
      case 'underline':
        newText = `<u>${selectedText}</u>`
        break
      case 'list':
        const lines = selectedText.split('\n')
        newText = lines.map(line => line.trim() ? `• ${line}` : line).join('\n')
        break
      case 'number':
        const numberedLines = selectedText.split('\n')
        newText = numberedLines.map((line, index) => line.trim() ? `${index + 1}. ${line}` : line).join('\n')
        break
      default:
        newText = selectedText
    }

    const newValue = value.substring(0, start) + newText + value.substring(end)
    onChange(newValue)

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + newText.length)
    }, 0)
  }

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 bg-gray-50 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => handleFormat('bold')}
          className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => handleFormat('italic')}
          className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => handleFormat('underline')}
          className="px-2 py-1 text-sm underline hover:bg-gray-200 rounded"
          title="Underline"
        >
          U
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => handleFormat('list')}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => handleFormat('number')}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
          title="Numbered List"
        >
          1. List
        </button>
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full p-3 resize-none focus:outline-none ${
          isFocused ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
        }`}
        style={{ minHeight: '200px' }}
      />

      {/* Help Text */}
      <div className="px-3 pb-2 text-xs text-gray-500">
        Use **bold**, *italic*, &lt;u&gt;underline&lt;/u&gt; for formatting
      </div>
    </div>
  )
}
