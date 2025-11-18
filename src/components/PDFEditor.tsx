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
  if (typeof window === 'undefined') return;

  // Dynamically import Quill only in the browser
  import('react-quill-new').then(({ Quill }) => {
    const FontAttributor = Quill.import('attributors/class/font') as any;
    // Only include fonts supported by jsPDF: Helvetica (sans-serif), Times (serif), Courier (monospace)
    FontAttributor.whitelist = [
      'sans-serif',      // Maps to Helvetica in PDF
      'times-new-roman', // Maps to Times in PDF
      'courier-new'      // Maps to Courier in PDF
    ];
    Quill.register(FontAttributor, true);

    const SizeAttributor = Quill.import('attributors/style/size') as any;
    // Optimized font sizes for PDF rendering
    SizeAttributor.whitelist = [
      '8px','10px','12px','14px','16px','18px','20px','24px','28px','32px','36px','48px'
    ];
    Quill.register(SizeAttributor, true);
  });
}, []);



  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only update content from props on initial load or when externally changed
    // Don't update if we're actively editing (prevents circular updates)
    if (value && value !== content && !content) {
      console.log('📥 Initial content load from parent prop')
      setContent(value)
    }
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
        }
      }
    }

    return result
  }

  const handleChange = (html: string) => {
    console.log('\n� ========== HANDLE CHANGE START ==========')
    console.log('📝 Raw HTML received:', html.substring(0, 200) + (html.length > 200 ? '...' : ''))

    // Check for font-related classes and styles in raw HTML
    const hasFontClass = /class="[^"]*ql-font-[^"]*"/.test(html)
    const hasFontStyle = /style="[^"]*font-family:[^"]*"/.test(html)
    console.log('🔍 Raw HTML has font class:', hasFontClass)
    console.log('🔍 Raw HTML has font-family style:', hasFontStyle)

    setContent(html)

    // Clean up the HTML but PRESERVE font-related styles and classes
    let cleanedHtml = html
      // Keep ql-align-, ql-font- classes (font family classes)
      .replace(/class="([^"]*)"/g, (match, classes) => {
        const keepClasses = classes.split(' ').filter((c: string) => 
          c.startsWith('ql-align-') || c.startsWith('ql-font-')
        )
        if (keepClasses.length > 0) {
          console.log('✅ Keeping classes:', keepClasses.join(' '))
        }
        return keepClasses.length > 0 ? `class="${keepClasses.join(' ')}"` : ''
      })
      // Keep only font-size, color, background-color, and text-align styles
      // IMPORTANT: Do NOT keep font-family in inline styles - it conflicts with Quill's font classes
      .replace(/style="([^"]*)"/g, (match, styles) => {
        const originalStyles = styles
        const keepStyles = styles.split(';')
          .filter((s: string) => s.trim())
          .filter((s: string) => {
            const prop = s.split(':')[0].trim()
            // Explicitly exclude font-family to allow Quill's font classes to work
            return ['font-size', 'color', 'background-color', 'text-align'].includes(prop) && prop !== 'font-family'
          })

        if (originalStyles.includes('font-family')) {
          console.log('❌ STRIPPED font-family from inline styles:', originalStyles)
        }
        if (keepStyles.length > 0) {
          console.log('✅ Keeping styles:', keepStyles.join(';'))
        }

        return keepStyles.length > 0 ? `style="${keepStyles.join(';')}"` : ''
      })
      // Remove empty spans that don't have font classes or styles
      .replace(/<span[^>]*><\/span>/g, '')
      // Remove empty formatting tags
      .replace(/<strong><\/strong>/g, '')
      .replace(/<em><\/em>/g, '')
      .replace(/<u><\/u>/g, '')
      .trim()

    // Fix: Split lists when data-list attribute changes to restart numbering
    cleanedHtml = splitListsByDataListAttribute(cleanedHtml)

    // Check final cleaned HTML
    const cleanedHasFontClass = /class="[^"]*ql-font-[^"]*"/.test(cleanedHtml)
    const cleanedHasFontStyle = /style="[^"]*font-family:[^"]*"/.test(cleanedHtml)
    console.log('🔍 Cleaned HTML has font class:', cleanedHasFontClass)
    console.log('🔍 Cleaned HTML has font-family style:', cleanedHasFontStyle)
    console.log('✨ Final cleaned HTML:', cleanedHtml.substring(0, 200) + (cleanedHtml.length > 200 ? '...' : ''))
    console.log('🔄 ========== HANDLE CHANGE END ==========\n')

    onChange?.(cleanedHtml)
  }

  // Quill modules configuration - Essential formatting only
  const modules = {
    toolbar: [
      [
        { font: ['sans-serif', 'times-new-roman', 'courier-new'] },
        { size: ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'] }
      ],
      ['bold', 'italic', 'underline'],
      [{ header: [1, 2, 3, false] }],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }]
    ],
    clipboard: {
      matchVisual: false
    }
  }

  // Quill formats configuration - Only essential formats
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline',
    'align',
    'list'
  ]

  // Register fonts with Quill when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // This will be handled by the Quill component's modules configuration
      // The actual font and size handling is now done through CSS and Quill's built-in formats
    }
  }, []);




  // Add font size and family styles to the document (browser only)
  useEffect(() => {
    if (typeof document === 'undefined') return

    // Add font size styles
    const sizeStyle = document.createElement('style')
    sizeStyle.textContent = `
      /* Font family dropdown items - Only 3 fonts supported by jsPDF */
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="sans-serif"]::before { 
        content: "Helvetica (Sans Serif)"; 
        font-family: Helvetica, Arial, sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="times-new-roman"]::before { 
        content: "Times (Serif)"; 
        font-family: "Times New Roman", Times, serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="courier-new"]::before { 
        content: "Courier (Monospace)"; 
        font-family: "Courier New", Courier, monospace; 
      }

      /* Show selected font in toolbar label */
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before { content: "Helvetica"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="times-new-roman"]::before { content: "Times"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="courier-new"]::before { content: "Courier"; }

      /* Editor content font classes - Use !important to override pasted inline styles */
      .ql-editor .ql-font-sans-serif { font-family: Helvetica, Arial, sans-serif !important; }
      .ql-editor .ql-font-times-new-roman { font-family: "Times New Roman", Times, serif !important; }
      .ql-editor .ql-font-courier-new { font-family: "Courier New", Courier, monospace !important; }

      /* Font size dropdown items */
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="8px"]::before {
        content: '8px';
        font-size: 8px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before {
        content: '10px';
        font-size: 10px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before {
        content: '12px';
        font-size: 12px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before {
        content: '14px';
        font-size: 14px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
        content: '16px';
        font-size: 16px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before {
        content: '18px';
        font-size: 18px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before {
        content: '20px';
        font-size: 20px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before {
        content: '24px';
        font-size: 24px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before {
        content: '28px';
        font-size: 28px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before {
        content: '32px';
        font-size: 32px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="36px"]::before {
        content: '36px';
        font-size: 36px !important;
      }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="48px"]::before {
        content: '48px';
        font-size: 48px !important;
      }

      /* Show selected size in toolbar label */
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="8px"]::before { content: '8px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before { content: '10px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before { content: '12px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before { content: '14px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before { content: '16px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before { content: '18px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before { content: '20px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before { content: '24px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before { content: '28px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before { content: '32px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="36px"]::before { content: '36px'; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="48px"]::before { content: '48px'; }
      
      /* Global font classes for preview and PDF - Only 3 supported fonts */
      .ql-font-sans-serif { font-family: Helvetica, Arial, sans-serif !important; }
      .ql-font-times-new-roman { font-family: "Times New Roman", Times, serif !important; }
      .ql-font-courier-new { font-family: "Courier New", Courier, monospace !important; }
    `

    document.head.appendChild(sizeStyle)

    return () => {
      document.head.removeChild(sizeStyle)
    }
  }, [])

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
    <div
      className="border border-gray-300 rounded-md flex flex-col"
      style={{ height: '500px' }}
      onKeyDown={(e) => {
        console.log('🎹 PDFEditor Container KeyDown:', {
          key: e.key,
          keyCode: e.keyCode,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          target: (e.target as HTMLElement).className,
          isQuillEditor: (e.target as HTMLElement).classList?.contains('ql-editor')
        })

        if (e.key === 'Enter') {
          console.log('⚡ Enter key in PDFEditor - NOT preventing default')
          // Don't prevent default - let Quill handle it
        }
      }}
    >
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
          padding: 12px 15px;
        }
        
        .ql-container {
          height: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          font-size: 14px;
        }
        
        .ql-editor:focus {
          outline: none;
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