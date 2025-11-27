// Type definitions for Google APIs (gapi)
// Minimal definitions needed for the standalone app

declare namespace gapi {
  namespace client {
    namespace docs {
      interface RgbColor {
        red?: number
        green?: number
        blue?: number
      }

      interface Color {
        rgbColor?: RgbColor
        color?: {
          rgbColor?: RgbColor
        }
      }

      interface Link {
        url?: string
      }

      interface TextStyle {
        bold?: boolean
        italic?: boolean
        underline?: boolean
        strikethrough?: boolean
        fontSize?: {
          magnitude?: number
          unit?: string
        }
        foregroundColor?: Color
        backgroundColor?: Color
        fontFamily?: string
        link?: Link
        color?: RgbColor  // Allow both formats
      }

      interface Request {
        insertText?: unknown
        deleteContentRange?: unknown
        updateTextStyle?: unknown
        insertTable?: unknown
        updateTableCellStyle?: unknown
        updateTableColumnProperties?: unknown
        updateTableRowStyle?: unknown
        insertPageBreak?: unknown
        createFooter?: unknown
        updateParagraphStyle?: unknown
        [key: string]: unknown
      }

      interface StructuralElement {
        startIndex?: number
        endIndex?: number
        paragraph?: {
          elements?: Array<{
            textRun?: {
              content?: string
            }
          }>
        }
        table?: {
          rows?: number
          columns?: number
          tableRows?: TableRow[]
        }
      }

      interface TableRow {
        startIndex?: number
        endIndex?: number
        tableCells?: TableCell[]
      }

      interface TableCell {
        startIndex?: number
        endIndex?: number
        content?: StructuralElement[]
      }

      interface Document {
        title?: string
        body?: {
          content?: StructuralElement[]
        }
        documentStyle?: Record<string, unknown>
      }
    }

    namespace drive {
      interface File {
        id?: string
        name?: string
        mimeType?: string
        webViewLink?: string
      }
    }
  }
}
