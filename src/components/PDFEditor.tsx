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
    // Only working fonts - jsPDF built-in + custom TTF fonts
    FontAttributor.whitelist = [
      'sans-serif',      // Maps to Helvetica in PDF
      'times-new-roman', // Maps to Times in PDF
      'courier-new',     // Maps to Courier in PDF
      'impact',          // Maps to Impact in PDF (custom TTF)
      'robotoserif',     // Maps to RobotoSerif-Medium in PDF (custom TTF)
      'verdana',         // Maps to Verdana in PDF (custom TTF)
      'opensans',        // Maps to OpenSans-Regular in PDF (custom TTF)
      'lato',            // Maps to Lato-Medium in PDF (custom TTF)
      'robotomono',      // Maps to RobotoMono-Regular in PDF (custom TTF)
      'georgia',         // Maps to georgia in PDF (custom TTF)
      'cambria',         // Maps to Cambria in PDF (custom TTF)
      'garamond',        // Maps to Garamond-Regular in PDF (custom TTF)
      'arial',           // Maps to Arial-Regular in PDF (custom TTF)
      'calibri'          // Maps to Calibri in PDF (custom TTF)
    ];
    Quill.register(FontAttributor, true);

    const SizeAttributor = Quill.import('attributors/style/size') as any;
    // All font sizes from 1px to 99px
    SizeAttributor.whitelist = [
      '1px','2px','3px','4px','5px','6px','7px','8px','9px','10px','11px','12px','13px','14px','15px','16px','17px','18px','19px','20px','21px','22px','23px','24px','25px','26px','27px','28px','29px','30px','31px','32px','33px','34px','35px','36px','37px','38px','39px','40px','41px','42px','43px','44px','45px','46px','47px','48px','49px','50px','51px','52px','53px','54px','55px','56px','57px','58px','59px','60px','61px','62px','63px','64px','65px','66px','67px','68px','69px','70px','71px','72px','73px','74px','75px','76px','77px','78px','79px','80px','81px','82px','83px','84px','85px','86px','87px','88px','89px','90px','91px','92px','93px','94px','95px','96px','97px','98px','99px'
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
        { 'font': ['sans-serif', 'times-new-roman', 'courier-new', 'impact', 'robotoserif', 'verdana', 'opensans', 'lato', 'robotomono', 'georgia', 'cambria', 'garamond', 'arial', 'calibri'] },
        { size: ['1px','2px','3px','4px','5px','6px','7px','8px','9px','10px','11px','12px','13px','14px','15px','16px','17px','18px','19px','20px','21px','22px','23px','24px','25px','26px','27px','28px','29px','30px','31px','32px','33px','34px','35px','36px','37px','38px','39px','40px','41px','42px','43px','44px','45px','46px','47px','48px','49px','50px','51px','52px','53px','54px','55px','56px','57px','58px','59px','60px','61px','62px','63px','64px','65px','66px','67px','68px','69px','70px','71px','72px','73px','74px','75px','76px','77px','78px','79px','80px','81px','82px','83px','84px','85px','86px','87px','88px','89px','90px','91px','92px','93px','94px','95px','96px','97px','98px','99px'] }
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
      /* Font family dropdown items - 4 fonts supported by jsPDF */
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="sans-serif"]::before { 
        content: "Helvetica (Sans Serif)"; 
        font-family: Helvetica, Arial, sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="times-new-roman"]::before { 
        content: "Times (Serif)"; 
        font-family: "Times New Roman", Times, serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="courier-new"]::before { 
        content: "Courier New"; 
        font-family: "Courier New", Courier, monospace; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="impact"]::before { 
        content: "Impact"; 
        font-family: Impact, "Arial Black", sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="robotoserif"]::before { 
        content: "Roboto Serif"; 
        font-family: "Roboto Serif", Georgia, serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="verdana"]::before { 
        content: "Verdana"; 
        font-family: Verdana, Geneva, sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="opensans"]::before { 
        content: "Open Sans"; 
        font-family: "Open Sans", Arial, sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="lato"]::before { 
        content: "Lato"; 
        font-family: Lato, "Helvetica Neue", sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="robotomono"]::before { 
        content: "Roboto Mono (Code)"; 
        font-family: "Roboto Mono", "Courier New", monospace; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="georgia"]::before { 
        content: "Georgia"; 
        font-family: Georgia, serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="cambria"]::before { 
        content: "Cambria"; 
        font-family: Cambria, Georgia, serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="garamond"]::before { 
        content: "Garamond"; 
        font-family: Garamond, "Times New Roman", serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="arial"]::before { 
        content: "Arial"; 
        font-family: Arial, Helvetica, sans-serif; 
      }
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="calibri"]::before { 
        content: "Calibri"; 
        font-family: Calibri, "Segoe UI", sans-serif; 
      }

      /* Show selected font in toolbar label */
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before { content: "Helvetica"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="times-new-roman"]::before { content: "Times"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="courier-new"]::before { content: "Courier"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="impact"]::before { content: "Impact"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="robotoserif"]::before { content: "Roboto Serif"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="verdana"]::before { content: "Verdana"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="opensans"]::before { content: "Open Sans"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="lato"]::before { content: "Lato"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="robotomono"]::before { content: "Roboto Mono"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="georgia"]::before { content: "Georgia"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="cambria"]::before { content: "Cambria"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="garamond"]::before { content: "Garamond"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before { content: "Arial"; }
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="calibri"]::before { content: "Calibri"; }

      /* Editor content font classes - Use !important to override pasted inline styles */
      .ql-editor .ql-font-sans-serif { font-family: Helvetica, Arial, sans-serif !important; }
      .ql-editor .ql-font-times-new-roman { font-family: "Times New Roman", Times, serif !important; }
      .ql-editor .ql-font-courier-new { font-family: "Courier New", Courier, monospace !important; }
      .ql-editor .ql-font-impact { font-family: Impact, "Arial Black", sans-serif !important; }
      .ql-editor .ql-font-robotoserif { font-family: "Roboto Serif", Georgia, serif !important; }
      .ql-editor .ql-font-verdana { font-family: Verdana, Geneva, sans-serif !important; }
      .ql-editor .ql-font-opensans { font-family: "Open Sans", Arial, sans-serif !important; }
      .ql-editor .ql-font-lato { font-family: Lato, "Helvetica Neue", sans-serif !important; }
      .ql-editor .ql-font-robotomono { font-family: "Roboto Mono", "Courier New", monospace !important; }
      .ql-editor .ql-font-georgia { font-family: Georgia, serif !important; }
      .ql-editor .ql-font-cambria { font-family: Cambria, Georgia, serif !important; }
      .ql-editor .ql-font-garamond { font-family: Garamond, "Times New Roman", serif !important; }
      .ql-editor .ql-font-arial { font-family: Arial, Helvetica, sans-serif !important; }
      .ql-editor .ql-font-calibri { font-family: Calibri, "Segoe UI", sans-serif !important; }

      /* Dropdown scroll styling for font and size pickers */
      .ql-snow .ql-picker.ql-font .ql-picker-options,
      .ql-snow .ql-picker.ql-size .ql-picker-options {
        max-height: 200px !important;
        overflow-y: auto !important;
      }

      /* Font size dropdown items - dynamically show size value */
      .ql-snow .ql-picker.ql-size .ql-picker-item::before { content: attr(data-value); }
      .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: attr(data-value); }
      
      /* Global font classes for preview and PDF */
      .ql-font-sans-serif { font-family: Helvetica, Arial, sans-serif !important; }
      .ql-font-times-new-roman { font-family: \"Times New Roman\", Times, serif !important; }
      .ql-font-courier-new { font-family: \"Courier New\", Courier, monospace !important; }
      .ql-font-impact { font-family: Impact, \"Arial Black\", sans-serif !important; }
      .ql-font-robotoserif { font-family: \"Roboto Serif\", Georgia, serif !important; }
      .ql-font-verdana { font-family: Verdana, Geneva, sans-serif !important; }
      .ql-font-opensans { font-family: \"Open Sans\", Arial, sans-serif !important; }
      .ql-font-lato { font-family: Lato, "Helvetica Neue", sans-serif !important; }
      .ql-font-robotomono { font-family: "Roboto Mono", "Courier New", monospace !important; }
      .ql-font-georgia { font-family: Georgia, serif !important; }
      .ql-font-cambria { font-family: Cambria, Georgia, serif !important; }
      .ql-font-garamond { font-family: Garamond, "Times New Roman", serif !important; }
      .ql-font-arial { font-family: Arial, Helvetica, sans-serif !important; }
      .ql-font-calibri { font-family: Calibri, "Segoe UI", sans-serif !important; }
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