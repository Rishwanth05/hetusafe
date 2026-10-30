// Builds the map popup as a DOM tree so user strings are set via textContent
// and are never parsed as HTML, regardless of what the database contains.
export function buildPopupNode({ hazard_type, severity, description, name, localDate, localTime, timeAgo }) {
  const raw = description ?? ''
  const descText = raw.slice(0, 80) + (raw.length > 80 ? '…' : '')

  const wrap = document.createElement('div')
  wrap.style.cssText = 'font-family:Inter,sans-serif;min-width:210px'

  const title = document.createElement('strong')
  title.style.cssText = 'font-size:14px;color:#F5F5F5'
  title.textContent = hazard_type ?? ''
  wrap.appendChild(title)
  wrap.appendChild(document.createElement('br'))

  const sevSpan = document.createElement('span')
  sevSpan.style.cssText = 'font-size:12px;color:#9CA3AF;text-transform:capitalize'
  sevSpan.textContent = `Severity: ${severity ?? ''}`
  wrap.appendChild(sevSpan)
  wrap.appendChild(document.createElement('br'))

  const descP = document.createElement('p')
  descP.style.cssText = 'font-size:13px;color:#D1D5DB;margin:6px 0 4px'
  descP.textContent = descText
  wrap.appendChild(descP)

  const hr = document.createElement('hr')
  hr.style.cssText = 'margin:6px 0;border:none;border-top:1px solid #2A332E'
  wrap.appendChild(hr)

  const dateSpan = document.createElement('span')
  dateSpan.style.cssText = 'font-size:12px;color:#9CA3AF'
  dateSpan.textContent = `📅 ${localDate}`
  wrap.appendChild(dateSpan)
  wrap.appendChild(document.createElement('br'))

  const timeSpan = document.createElement('span')
  timeSpan.style.cssText = 'font-size:12px;color:#9CA3AF'
  timeSpan.textContent = `⏰ ${localTime} · ${timeAgo}`
  wrap.appendChild(timeSpan)
  wrap.appendChild(document.createElement('br'))

  if (name) {
    const nameSpan = document.createElement('span')
    nameSpan.style.cssText = 'font-size:12px;color:#9CA3AF'
    nameSpan.textContent = `👤 ${name}`
    wrap.appendChild(nameSpan)
  }

  return wrap
}
