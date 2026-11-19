import { doc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Bilingual } from '../../components/admin/Fields'
import { ToastProvider, useToast } from '../../components/admin/Toast'
import ProfileEditor from '../../components/ProfileEditor'
import RoleSwitcher from '../../components/RoleSwitcher'
import { useLiveDoc } from '../../lib/admin'
import { autoTranslate } from '../../lib/autoTranslate'
import { db } from '../../lib/firebase'
import { profileOf } from '../../lib/profiles'
import type { Partner } from '../../lib/types'

/**
 * Panel de un colaborador de la Guía (abogado, gestoría, piscina…): escribe su anuncio
 * (presentación, fotos, logo, contacto) y una ventaja para los socios de CJ Club.
 * Lo ven los clientes de CJ que lo tienen en su Guía. El nombre, el teléfono y los servicios los lleva CJ.
 */
export default function PartnerPanel() {
  const { profile, logout } = useAuth()
  const partnerId = profile?.partnerId ?? ''
  const partner = useLiveDoc<Partner>(partnerId ? `partners/${partnerId}` : null)
  const name = partner.data?.name || profile?.partnerName || 'Su ficha'
  return (
    <ToastProvider>
      <header className="header a-header">
        <div className="a-header__row">
          <NavLink to="/colaborador" end className="header__brand a-header__brand">
            <img className="header__logo" src="/logo.png" alt="CJ" />
            <span className="eyebrow header__tagline">
              Panel del colaborador
              <br />
              {profile?.name}
            </span>
          </NavLink>
          <div className="a-header__tools">
            <button className="link-btn a-header__logout" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
        <RoleSwitcher variant="header" />
      </header>
      <main className="a-page">
        <PageTitle eyebrow={name} title="Su anuncio en CJ Club" />
        {partner.loading ? (
          <p className="a-empty">Cargando…</p>
        ) : !partner.data ? (
          <p className="a-empty">No encontramos su ficha. Avise al equipo de CJ.</p>
        ) : (
          <>
            <Offer id={partnerId} partner={partner.data} />
            <ProfileEditor
              key={partnerId}
              coll="partners"
              id={partnerId}
              value={profileOf(partner.data)}
              withPhone={false}
              audience="Es lo que ven los clientes de CJ Club al abrir su ficha en la Guía de la app. Añada su logo y fotos y cuente qué ofrece; si puede, escríbalo también en inglés. El nombre, el teléfono y los servicios los cambia el equipo de CJ."
            />
          </>
        )}
      </main>
    </ToastProvider>
  )
}

/** Ventaja para los socios de CJ Club (p. ej. «Primera consulta gratuita») */
function Offer({ id, partner }: { id: string; partner: Partner }) {
  const toast = useToast()
  const [es, setEs] = useState(partner.offer_es ?? '')
  const [en, setEn] = useState(partner.offer_en ?? '')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setEs(partner.offer_es ?? '')
    setEn(partner.offer_en ?? '')
  }, [partner.offer_es, partner.offer_en])
  const changed = es.trim() !== (partner.offer_es ?? '') || en.trim() !== (partner.offer_en ?? '')

  async function save() {
    setBusy(true)
    try {
      await updateDoc(doc(db, 'partners', id), { offer_es: es.trim().slice(0, 300), offer_en: en.trim().slice(0, 300) })
      autoTranslate(`partners/${id}`)
      toast('Ventaja guardada. Los clientes ya la ven.')
    } catch {
      toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card a-form">
      <span className="eyebrow">Ventaja para socios de CJ Club</span>
      <p className="card__text">
        Opcional. Por ejemplo: «Primera consulta gratuita» o «10 % de descuento en el mantenimiento anual». Sale destacada en su ficha.
      </p>
      <Bilingual label="Ventaja" es={es} en={en} onEs={setEs} onEn={setEn} />
      <div>
        <button className="btn a-btn" disabled={busy || !changed} onClick={() => void save()}>
          {busy ? 'Guardando…' : 'Guardar ventaja'}
        </button>
      </div>
    </section>
  )
}
