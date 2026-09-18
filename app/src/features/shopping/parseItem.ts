const UNITS = 'kg|g|gr|l|lt|ml|cc|u|un|unid|unidades|paq|paquete|paquetes|docena|doc|pack|bolsa|bolsas|caja|cajas|lata|latas'

const LEADING = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*(?:${UNITS})?)\\s+(.+)$`, 'i')
const TRAILING = new RegExp(`^(.+?)\\s+(x\\s?\\d+|\\d+(?:[.,]\\d+)?\\s*(?:${UNITS}))$`, 'i')

export function parseItemText(raw: string): { name: string; qty?: string } {
  const text = raw.trim().replace(/\s+/g, ' ')
  const leading = text.match(LEADING)
  if (leading) return { name: leading[2], qty: leading[1].replace(/\s+/g, '') }
  const trailing = text.match(TRAILING)
  if (trailing) return { name: trailing[1], qty: trailing[2].replace(/\s+/g, '') }
  return { name: text }
}
