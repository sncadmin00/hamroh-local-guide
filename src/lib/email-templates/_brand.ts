// Hamroh brand styles for emails (white body required)
export const BRAND = {
  primary: '#1F9BB4', // turquoise
  primaryDark: '#1A8499',
  accent: '#D97A4F', // terracotta
  text: '#1F2A44',
  muted: '#6B7388',
  border: '#E6E2D6',
  cream: '#FAF7F0',
  logoUrl: 'https://hamrohim.com/__l5e/assets-v1/febe74e2-791c-4653-aae8-460b9035810a/hamroh-logo.png',
}

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    margin: 0,
    padding: '32px 0',
  } as const,
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: BRAND.cream,
    border: `1px solid ${BRAND.border}`,
    borderRadius: '14px',
    padding: '40px 36px',
  } as const,
  logo: {
    display: 'block',
    height: '40px',
    width: 'auto',
    margin: '0 0 28px',
  } as const,
  h1: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '26px',
    fontWeight: 700 as const,
    color: BRAND.text,
    letterSpacing: '-0.02em',
    margin: '0 0 16px',
  } as const,
  text: {
    fontSize: '15px',
    color: BRAND.text,
    lineHeight: '1.6',
    margin: '0 0 18px',
  } as const,
  link: { color: BRAND.primary, textDecoration: 'underline' } as const,
  button: {
    display: 'inline-block',
    backgroundColor: BRAND.primary,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    borderRadius: '10px',
    padding: '14px 26px',
    textDecoration: 'none',
    margin: '8px 0 24px',
  } as const,
  code: {
    display: 'inline-block',
    backgroundColor: '#ffffff',
    border: `1px solid ${BRAND.border}`,
    borderRadius: '8px',
    padding: '12px 18px',
    fontSize: '20px',
    fontWeight: 700 as const,
    letterSpacing: '4px',
    color: BRAND.text,
    margin: '8px 0 24px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  } as const,
  footer: {
    fontSize: '12px',
    color: BRAND.muted,
    lineHeight: '1.5',
    margin: '24px 0 0',
    borderTop: `1px solid ${BRAND.border}`,
    paddingTop: '18px',
  } as const,
}
