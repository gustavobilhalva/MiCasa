import { Mail, MessageCircle, Phone, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { CONTACT_ROLES } from '../../lib/defaults'
import type { Contact } from '../../types'
import { Chips, Field } from '../finance/ui'
import { deleteContact, saveContact } from './api'
import { useContacts } from './hooks'

interface Props {
  linkedTo?: Contact['linkedTo']
  title?: string
  showAll?: boolean
}

export function ContactsSection({ linkedTo, title = 'Contactos', showAll }: Props) {
  const { data: contacts } = useContacts()
  const [editing, setEditing] = useState<Contact | null | 'new'>(null)
  const list = showAll ? contacts : contacts.filter((c) => c.linkedTo?.type === linkedTo?.type && (!linkedTo?.id || c.linkedTo?.id === linkedTo.id))

  const tel = (s: string) => s.replace(/[^\d+]/g, '')

  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <button onClick={() => setEditing('new')} className="flex min-h-9 items-center gap-1 text-sm text-accent">
          <Plus size={16} /> Agregar
        </button>
      </div>
      {list.length === 0 ? (
        <p className="px-4 pb-3 pt-1 text-sm text-muted">Sin contactos.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-4 py-2">
              <button onClick={() => setEditing(c)} className="flex-1 text-left">
                <p className="text-sm">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.role}
                  {c.address && ` · ${c.address}`}
                </p>
              </button>
              {c.phone && (
                <a href={`tel:${tel(c.phone)}`} aria-label={`Llamar a ${c.name}`} className="flex size-10 items-center justify-center rounded-full text-accent">
                  <Phone size={18} />
                </a>
              )}
              {(c.whatsapp || c.phone) && (
                <a href={`https://wa.me/${tel(c.whatsapp ?? c.phone!).replace('+', '')}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp a ${c.name}`} className="flex size-10 items-center justify-center rounded-full text-ok">
                  <MessageCircle size={18} />
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} aria-label={`Email a ${c.name}`} className="flex size-10 items-center justify-center rounded-full text-muted">
                  <Mail size={18} />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo contacto' : 'Editar contacto'}>
        {editing !== null && <ContactForm key={editing === 'new' ? 'new' : editing.id} contact={editing === 'new' ? null : editing} linkedTo={linkedTo} onClose={() => setEditing(null)} />}
      </Sheet>
    </section>
  )
}

function ContactForm({ contact, linkedTo, onClose }: { contact: Contact | null; linkedTo?: Contact['linkedTo']; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [name, setName] = useState(contact?.name ?? '')
  const [role, setRole] = useState(contact?.role ?? (linkedTo?.type === 'pet' ? 'Veterinario' : linkedTo?.type === 'person' ? 'Pediatra' : 'Plomero'))
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(contact?.whatsapp ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [address, setAddress] = useState(contact?.address ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await saveContact(
        household.id,
        user.uid,
        {
          name: name.trim(),
          role,
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          linkedTo: contact?.linkedTo ?? linkedTo,
        },
        contact?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
      <Field label="Rol">
        <Chips options={CONTACT_ROLES.map((r) => ({ id: r, label: r }))} value={role} onChange={setRole} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="WhatsApp" hint="Si es distinto">
          <Input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </Field>
      </div>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Dirección">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Horarios, obra social que acepta…" />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {contact && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteContact(household.id, contact.id).then(onClose)}>
          Eliminar
        </Button>
      )}
    </form>
  )
}
