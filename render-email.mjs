import { render } from '@react-email/components'
import { SignupEmail } from './src/lib/email-templates/signup.js'

const html = await render(
  SignupEmail({
    siteName: 'Hamroh',
    siteUrl: 'https://hamrohim.com',
    recipient: 'user@example.com',
    confirmationUrl: 'https://hamrohim.com/auth/confirm',
  })
)
console.log(html)
