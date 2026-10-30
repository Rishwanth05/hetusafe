import { vi, describe, it, expect } from 'vitest'
import { buildPopupNode } from '../utils/buildPopupNode'

const BASE = {
  hazard_type: 'Flood',
  severity:    'high',
  description: 'Water covering the main road',
  name:        'Jane Doe',
  localDate:   'Mon, Jan 1, 2024',
  localTime:   '12:00 PM',
  timeAgo:     '2 hr ago',
}

// ── Normal content ───────────────────────────────────────────────────────────

describe('buildPopupNode — normal content', () => {
  it('renders hazard_type, severity, description and name as text', () => {
    const node = buildPopupNode(BASE)
    const text = node.textContent
    expect(text).toContain('Flood')
    expect(text).toContain('Severity: high')
    expect(text).toContain('Water covering the main road')
    expect(text).toContain('Jane Doe')
  })

  it('includes date, time and timeAgo', () => {
    const node = buildPopupNode(BASE)
    const text = node.textContent
    expect(text).toContain('Mon, Jan 1, 2024')
    expect(text).toContain('12:00 PM')
    expect(text).toContain('2 hr ago')
  })

  it('shows 👤 prefix on name line', () => {
    const node = buildPopupNode(BASE)
    expect(node.textContent).toContain('👤')
    expect(node.textContent).toContain('Jane Doe')
  })

  it('omits name line when name is falsy', () => {
    const node = buildPopupNode({ ...BASE, name: null })
    expect(node.textContent).not.toContain('👤')
  })

  it('omits name line when name is empty string', () => {
    const node = buildPopupNode({ ...BASE, name: '' })
    expect(node.textContent).not.toContain('👤')
  })

  it('truncates description at 80 chars and appends ellipsis', () => {
    const long = 'x'.repeat(100)
    const node = buildPopupNode({ ...BASE, description: long })
    const text = node.textContent
    expect(text).toContain('x'.repeat(80) + '…')
    expect(text).not.toContain('x'.repeat(81) + '…')
  })

  it('shows full description when 80 chars or fewer, no ellipsis', () => {
    const exact = 'y'.repeat(80)
    const node = buildPopupNode({ ...BASE, description: exact })
    expect(node.textContent).toContain(exact)
    expect(node.textContent).not.toContain('y'.repeat(80) + '…')
  })
})

// ── XSS payloads ─────────────────────────────────────────────────────────────

describe('buildPopupNode — XSS payloads produce text only', () => {
  it('img+onerror in description: no img element, no handler attribute, text literal', () => {
    const payload = '<img src=x onerror="window.__popup_xss=1"> injected'
    const node = buildPopupNode({ ...BASE, description: payload })

    // No img element should have been created
    expect(node.querySelector('img')).toBeNull()
    // No element anywhere in the subtree has an event-handler attribute
    expect(node.querySelector('[onerror]')).toBeNull()
    // The raw payload text is present as literal characters
    expect(node.textContent).toContain('<img src=x onerror="window.__popup_xss=1"> injected')
  })

  it('script tag in hazard_type: no script element, text literal', () => {
    const payload = '<script>window.__popup_xss=1</script>Flood'
    const node = buildPopupNode({ ...BASE, hazard_type: payload })

    expect(node.querySelector('script')).toBeNull()
    expect(node.innerHTML).not.toContain('<script>')
    expect(node.textContent).toContain('<script>window.__popup_xss=1</script>Flood')
  })

  it('img+onerror in name: no img element, no handler attribute, text literal', () => {
    const payload = '<img src=x onerror="window.__popup_xss=1">'
    const node = buildPopupNode({ ...BASE, name: payload })

    expect(node.querySelector('img')).toBeNull()
    expect(node.querySelector('[onerror]')).toBeNull()
    expect(node.textContent).toContain('<img src=x onerror="window.__popup_xss=1">')
  })

  it('HTML bold tag in description: no b element created, angle brackets literal', () => {
    const payload = '<b>bold text</b>'
    const node = buildPopupNode({ ...BASE, description: payload })

    expect(node.querySelector('b')).toBeNull()
    expect(node.textContent).toContain('<b>bold text</b>')
  })

  it('combined payload across all user fields: no handler attributes anywhere', () => {
    const node = buildPopupNode({
      ...BASE,
      hazard_type: '<img src=x onerror="window.__h=1">',
      description: '<script>window.__d=1</script>',
      name:        '<svg onload="window.__n=1">',
    })

    // No constructed elements from user data
    expect(node.querySelector('img')).toBeNull()
    expect(node.querySelector('script')).toBeNull()
    expect(node.querySelector('svg')).toBeNull()

    // No handler attributes anywhere in the subtree
    const allElements = node.querySelectorAll('*')
    for (const el of allElements) {
      for (const attr of el.attributes) {
        expect(attr.name).not.toMatch(/^on/i)
      }
    }
  })
})
