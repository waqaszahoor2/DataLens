import * as XLSX from 'xlsx'

export interface SheetData {
  name: string
  data: Record<string, unknown>[]
  columns: ColumnMeta[]
  rowCount: number
  csvString: string
}

export interface ColumnMeta {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  nullCount: number
  uniqueCount: number
  sample: unknown[]
}

export function parseExcelFile(file: File): Promise<SheetData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })

        const sheets: SheetData[] = workbook.SheetNames.map(name => {
          const worksheet = workbook.Sheets[name]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: null,
            raw: false,
            dateNF: 'YYYY-MM-DD'
          }) as Record<string, unknown>[]

          const csvString = XLSX.utils.sheet_to_csv(worksheet)

          const columns = jsonData.length > 0
            ? Object.keys(jsonData[0]).map(col => ({
                name: col,
                type: inferType(jsonData.map(r => r[col])),
                nullCount: jsonData.filter(r =>
                  r[col] === null || r[col] === ''
                ).length,
                uniqueCount: new Set(jsonData.map(r => r[col])).size,
                sample: jsonData.slice(0, 3).map(r => r[col])
              }))
            : []

          return { name, data: jsonData, columns, rowCount: jsonData.length, csvString }
        })

        resolve(sheets)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function inferType(values: unknown[]): ColumnMeta['type'] {
  const nonNull = values.filter(v => v !== null && v !== '')
  if (nonNull.length === 0) return 'string'
  if (nonNull.every(v => !isNaN(Number(v)))) return 'number'
  if (nonNull.every(v => !isNaN(Date.parse(String(v))))) return 'date'
  if (nonNull.every(v => v === 'true' || v === 'false' || typeof v === 'boolean')) return 'boolean'
  return 'string'
}
