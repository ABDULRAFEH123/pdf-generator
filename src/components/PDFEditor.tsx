'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'

// Dynamically import ReactQuill to avoid SSR issues and React 18 compatibility
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="p-4 bg-gray-100 animate-pulse">Loading editor...</div>
})

interface PDFEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: string
  disabled?: boolean
}

export default function PDFEditor({
  value = '',
  onChange,
  placeholder = 'Enter your PDF content here...',
  minHeight = '350px',
  disabled = false
}: PDFEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [content, setContent] = useState(value)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setContent(value)
  }, [value])

  // Function to split lists when data-list attribute changes
  const splitListsByDataListAttribute = (html: string): string => {
    // Find all list containers (ol or ul)
    const listRegex = /<(ol|ul)[^>]*>.*?<\/\1>/gi
    let result = html
    
    let match
    while ((match = listRegex.exec(html)) !== null) {
      const fullList = match[0]
      const listTag = match[1] // 'ol' or 'ul'
      
      // Extract all li elements with their data-list attributes
      const liRegex = /<li[^>]*data-list="([^"]*)"[^>]*>.*?<\/li>/gi
      const listItems: Array<{ html: string; dataList: string }> = []
      
      let liMatch
      while ((liMatch = liRegex.exec(fullList)) !== null) {
        listItems.push({
          html: liMatch[0],
          dataList: liMatch[1]
        })
      }
      
      // Group consecutive items with the same data-list attribute
      if (listItems.length > 0) {
        const groups: Array<{ dataList: string; items: string[] }> = []
        let currentGroup = { dataList: listItems[0].dataList, items: [listItems[0].html] }
        
        for (let i = 1; i < listItems.length; i++) {
          if (listItems[i].dataList === currentGroup.dataList) {
            currentGroup.items.push(listItems[i].html)
          } else {
            groups.push(currentGroup)
            currentGroup = { dataList: listItems[i].dataList, items: [listItems[i].html] }
          }
        }
        groups.push(currentGroup)
        
        // If we have multiple groups, split the list
        if (groups.length > 1) {
          const newLists = groups.map(group => {
            const tag = group.dataList === 'bullet' ? 'ul' : 'ol'
            // For ordered lists, add start="1" to force restart numbering
            const startAttr = tag === 'ol' ? ' start="1"' : ''
            return `<${tag}${startAttr}>${group.items.join('')}</${tag}>`
          })
          
          result = result.replace(fullList, newLists.join(''))
          console.log('🔧 Split list into', groups.length, 'separate lists:', groups.map(g => g.dataList))
        }
      }
    }
    
    return result
  }

  const handleChange = (html: string) => {
    console.log('\n=== ✏️ EDITOR CHANGE DEBUG ===')
    console.log('Raw HTML from Quill:', html)
    
    setContent(html)
    
    // Clean up the HTML to remove Quill-specific classes and attributes
    let cleanedHtml = html
      .replace(/class="(?!ql-align-)[^"]*"/g, '') // Remove all class attributes except alignment classes
      .replace(/style="[^"]*"/g, '') // Remove all style attributes
      .replace(/<span[^>]*>/g, '') // Remove span tags
      .replace(/<\/span>/g, '') // Remove closing span tags
      .replace(/<strong><\/strong>/g, '') // Remove empty strong tags
      .replace(/<em><\/em>/g, '') // Remove empty em tags
      .replace(/<u><\/u>/g, '') // Remove empty u tags
      .replace(/<p><\/p>/g, '') // Remove completely empty paragraphs
      .replace(/<p><br><\/p>/g, '<br>') // Convert empty paragraphs with br to just br
      .trim()

    // Fix: Split lists when data-list attribute changes to restart numbering
    cleanedHtml = splitListsByDataListAttribute(cleanedHtml)

    console.log('Cleaned HTML being sent to parent:', cleanedHtml)
    console.log('=== END EDITOR DEBUG ===\n')

    onChange?.(cleanedHtml)
  }

  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }], // H1, H2, H3 dropdowns
      ['bold', 'italic', 'underline'], // Text formatting
      [{ 'align': [] }], // Text alignment (left, center, right, justify)
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Lists
      ['clean'] // Remove formatting
    ],
  }

  // Quill formats configuration
  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'align',
    'list', // For both ordered and bullet lists
  ]

  if (!mounted) {
    return (
      <div className="border border-gray-300 rounded-md">
        <div 
          className="p-4 animate-pulse bg-gray-100 flex items-center justify-center"
          style={{ minHeight }}
        >
          <span className="text-gray-500">Loading editor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 rounded-md flex flex-col" style={{ height: '500px' }}>
      <style jsx global>{`
        .ql-editor {
          min-height: ${minHeight};
          max-height: 400px;
          height: auto;
          font-size: 14px;
          line-height: 1.5;
          font-family: system-ui, -apple-system, sans-serif;
          overflow-y: auto;
          flex: 1;
        }
        
        .ql-container {
          height: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          content: '${placeholder}';
        }
        
        .ql-toolbar {
          border-bottom: 1px solid #d1d5db;
          background-color: #f9fafb;
        }
        
        .ql-container {
          border: none;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .ql-editor h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 8px 0;
          line-height: 1.2;
        }
        
        .ql-editor h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 6px 0;
          line-height: 1.2;
        }
        
        .ql-editor h3 {
          font-size: 18px;
          font-weight: 500;
          margin: 4px 0;
          line-height: 1.2;
        }
        
        .ql-editor p {
          margin: 4px 0;
          line-height: 1.5;
        }
        
        .ql-editor ul, .ql-editor ol {
          margin: 4px 0;
          padding-left: 20px;
        }
        
        .ql-editor li {
          margin: 2px 0;
          line-height: 1.4;
        }
        
        /* Hide Quill's internal UI elements that show extra markers */
        .ql-editor .ql-ui {
          display: none !important;
        }
        
        /* Ensure list markers are properly styled */
        .ql-editor ol {
          list-style-type: decimal;
        }
        
        .ql-editor ul {
          list-style-type: disc;
        }
        
        /* Force proper list display */
        .ql-editor ol li,
        .ql-editor ul li {
          display: list-item;
        }
        
        /* Text alignment styles */
        .ql-editor .ql-align-left {
          text-align: left;
        }
        
        .ql-editor .ql-align-center {
          text-align: center;
        }
        
        .ql-editor .ql-align-right {
          text-align: right;
        }
        
        .ql-editor .ql-align-justify {
          text-align: justify;
        }
        
        ${disabled ? `
          .ql-toolbar {
            pointer-events: none;
            opacity: 0.5;
          }
          .ql-editor {
            background-color: #f9fafb;
            cursor: not-allowed;
          }
        ` : ''}
      `}</style>
      
      {(() => {
        try {
          return (
            <ReactQuill
              value={content}
              onChange={handleChange}
              modules={modules}
              formats={formats}
              readOnly={disabled}
              theme="snow"
            />
          )
        } catch (error) {
          console.error('ReactQuill error:', error)
          return (
            <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded">
              <p>Editor failed to load. Please refresh the page.</p>
              <textarea
                value={content}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full mt-2 p-2 border border-gray-300 rounded"
                style={{ minHeight }}
              />
            </div>
          )
        }
      })()}
    </div>
  )
}