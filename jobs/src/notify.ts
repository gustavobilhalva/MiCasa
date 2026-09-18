import { getMessaging } from 'firebase-admin/messaging'
import nodemailer from 'nodemailer'

export interface Recipient {
  uid: string
  email?: string
  fcmTokens: string[]
  push: boolean
  emailEnabled: boolean
}

export interface Message {
  title: string
  body: string
  url: string
}

const APP_URL = process.env.APP_URL ?? 'https://nuestra-casa-2cb72.web.app'

export async function sendPush(recipients: Recipient[], msg: Message): Promise<{ sent: number; invalidTokens: Map<string, string[]> }> {
  const invalidTokens = new Map<string, string[]>()
  let sent = 0
  for (const r of recipients) {
    if (!r.push || r.fcmTokens.length === 0) continue
    const res = await getMessaging().sendEachForMulticast({
      tokens: r.fcmTokens,
      notification: { title: msg.title, body: msg.body },
      data: { url: msg.url },
      webpush: {
        fcmOptions: { link: `${APP_URL}${msg.url}` },
        notification: { icon: `${APP_URL}/icons/icon-192.png`, badge: `${APP_URL}/icons/icon-192.png` },
      },
    })
    sent += res.successCount
    res.responses.forEach((resp, i) => {
      const code = resp.error?.code
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        invalidTokens.set(r.uid, [...(invalidTokens.get(r.uid) ?? []), r.fcmTokens[i]])
      }
    })
  }
  return { sent, invalidTokens }
}

let transporter: nodemailer.Transporter | null = null

function mailer() {
  if (transporter) return transporter
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  return transporter
}

export async function sendEmailDigest(recipient: Recipient, householdName: string, messages: Message[]): Promise<boolean> {
  const t = mailer()
  if (!t || !recipient.emailEnabled || !recipient.email || messages.length === 0) return false
  const lines = messages.map((m) => `• ${m.title}\n  ${m.body}\n  ${APP_URL}${m.url}`).join('\n\n')
  const html = messages
    .map((m) => `<li style="margin-bottom:12px"><strong>${escapeHtml(m.title)}</strong><br>${escapeHtml(m.body)}<br><a href="${APP_URL}${m.url}">Abrir en Nuestra Casa</a></li>`)
    .join('')
  await t.sendMail({
    from: `"Nuestra Casa" <${process.env.GMAIL_USER}>`,
    to: recipient.email,
    subject: `${householdName}: ${messages.length === 1 ? messages[0].title : `${messages.length} recordatorios`}`,
    text: `${lines}\n\n— Nuestra Casa`,
    html: `<div style="font-family:sans-serif;font-size:15px;color:#1c1917"><p>Hola, esto es lo que tenés pendiente:</p><ul style="padding-left:18px">${html}</ul><p style="color:#78716c;font-size:13px">— Nuestra Casa · <a href="${APP_URL}">${APP_URL}</a></p></div>`,
  })
  return true
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
