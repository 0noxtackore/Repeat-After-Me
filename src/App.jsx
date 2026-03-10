import { useEffect, useId, useMemo, useRef, useState } from 'react'
import logoUrl from './assets/logo.png'
import logo2Url from './assets/logo2.png'
import './App.css'

const STORAGE_KEY = 'repeat-after-me:v1'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-client-id'
const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'

function isDefaultProfileLabel(label) {
  const value = (label ?? '').trim()
  return /^perfil\s+\d+$/i.test(value)
}

function decodeJwtPayload(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  const base64Url = parts[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  try {
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function extractYouTubeVideoId(urlOrId) {
  const value = (urlOrId ?? '').trim()
  if (!value) return ''

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value

  try {
    const url = new URL(value)
    if (url.hostname === 'youtu.be') {
      return (url.pathname || '').replace('/', '').slice(0, 11)
    }
    if (url.hostname.endsWith('youtube.com')) {
      const v = url.searchParams.get('v')
      if (v) return v.slice(0, 11)
      const parts = url.pathname.split('/').filter(Boolean)
      const embedIndex = parts.indexOf('embed')
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1].slice(0, 11)
      const shortsIndex = parts.indexOf('shorts')
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1].slice(0, 11)
    }
  } catch {
    return ''
  }

  return ''
}

function buildYouTubeEmbedUrl(videoId) {
  if (!videoId) return ''
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    iv_load_policy: '3',
    cc_load_policy: '0',
    fs: '1',
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

function getEmbedUrlFromYouTubeUrl(url) {
  const id = extractYouTubeVideoId(url)
  return buildYouTubeEmbedUrl(id)
}

function ConfirmModal({ open, title, description, confirmText, cancelText, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.()
      }}
    >
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTitle">{title}</div>
        {description ? <div className="modalDescription">{description}</div> : null}
        <div className="modalActions">
          <button className="modalButton" type="button" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="modalButton modalButtonDanger" type="button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 18a6 6 0 100-12 6 6 0 000 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.93 4.93l1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.66 17.66l1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.93 19.07l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M21 12.8A8.5 8.5 0 1111.2 3a6.7 6.7 0 009.8 9.8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function App() {
  const inputId = useId()
  const gsiButtonId = useId()
  const oauthClientRef = useRef(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      const raw = localStorage.getItem('repeat-after-me:theme')
      if (raw === 'light' || raw === 'dark') return raw
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }

    return 'dark'
  })
  const [profiles, setProfiles] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return []
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.profiles) && parsed.profiles.length > 0) {
        return parsed.profiles
          .slice(0, 10)
          .map((p, idx) => ({
            id: typeof p?.id === 'string' ? p.id : crypto.randomUUID(),
            label:
              typeof p?.label === 'string' && !isDefaultProfileLabel(p.label)
                ? p.label
                : '',
            name: typeof p?.name === 'string' ? p.name : '',
            email: typeof p?.email === 'string' ? p.email : '',
            picture: typeof p?.picture === 'string' ? p.picture : '',
            youtubeChannelId: typeof p?.youtubeChannelId === 'string' ? p.youtubeChannelId : '',
            youtubeChannelTitle: typeof p?.youtubeChannelTitle === 'string' ? p.youtubeChannelTitle : '',
            url: typeof p?.url === 'string' ? p.url : '',
          }))
      }
    } catch {
      // ignore
    }

    return []
  })

  const [activeProfileId, setActiveProfileId] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return ''
      const parsed = JSON.parse(raw)
      return typeof parsed?.activeProfileId === 'string' ? parsed.activeProfileId : ''
    } catch {
      return ''
    }
  })

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [confirmState, setConfirmState] = useState({ open: false, kind: '', profileId: '' })
  const [youtubeStatus, setYouTubeStatus] = useState('')

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  )

  useEffect(() => {
    if (!profiles.length) {
      if (activeProfileId) setActiveProfileId('')
      return
    }
    if (!activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfileId(profiles[0].id)
    }
  }, [profiles, activeProfileId])

  useEffect(() => {
    try {
      localStorage.setItem('repeat-after-me:theme', theme)
    } catch {
      // ignore
    }
    document.documentElement.dataset.theme = theme

    const favicon = document.getElementById('app-favicon')
    if (favicon) {
      favicon.setAttribute('href', theme === 'light' ? logo2Url : logoUrl)
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profiles,
          activeProfileId,
        }),
      )
    } catch {
      // ignore
    }
  }, [profiles, activeProfileId])

  useEffect(() => {
    if (!isAddAccountOpen) return
    if (profiles.length >= 10) return

    const google = window.google
    if (!google?.accounts?.id) return

    const container = document.getElementById(gsiButtonId)
    if (!container) return

    container.innerHTML = ''

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const payload = decodeJwtPayload(response?.credential)
        const email = typeof payload?.email === 'string' ? payload.email : ''
        const name = typeof payload?.name === 'string' ? payload.name : ''
        const picture = typeof payload?.picture === 'string' ? payload.picture : ''
        const label = email || name || ''

        const next = {
          id: crypto.randomUUID(),
          label,
          name,
          email,
          picture,
          youtubeChannelId: '',
          youtubeChannelTitle: '',
          url: '',
        }

        setProfiles((prev) => {
          if (prev.length >= 10) return prev
          return [...prev, next].slice(0, 10)
        })
        setActiveProfileId(next.id)
        setIsAddAccountOpen(false)
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    google.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'large',
      type: 'standard',
      shape: 'pill',
      text: 'continue_with',
      width: 248,
    })
  }, [isAddAccountOpen, profiles.length, gsiButtonId])

  async function connectYouTube(profileId, email) {
    const google = window.google
    if (!google?.accounts?.oauth2) {
      setYouTubeStatus('YouTube: OAuth no disponible')
      return
    }

    setYouTubeStatus('YouTube: conectando…')

    const profile = profiles.find((p) => p.id === profileId)
    const needsConsent = !profile?.youtubeChannelId && !profile?.youtubeChannelTitle

    let token
    try {
      token = await new Promise((resolve, reject) => {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: YOUTUBE_SCOPE,
            callback: (resp) => {
              if (!resp || resp.error) {
                reject(resp?.error || 'oauth_error')
                return
              }
              resolve(resp.access_token)
            },
          })
          oauthClientRef.current = client
          client.requestAccessToken({
            prompt: needsConsent ? 'consent' : '',
            hint: email || undefined,
          })
        } catch (e) {
          reject(e)
        }
      })
    } catch (err) {
      const msg = String(err || '')
      if (msg.includes('access_denied')) {
        setYouTubeStatus('YouTube: permiso denegado')
      } else {
        setYouTubeStatus('YouTube: error OAuth')
      }
      return
    }

    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!res.ok) {
        let details = ''
        try {
          const errData = await res.json()
          const msg =
            typeof errData?.error?.message === 'string'
              ? errData.error.message
              : typeof errData?.message === 'string'
                ? errData.message
                : ''
          details = msg ? ` (${msg})` : ''
        } catch {
          // ignore
        }

        setYouTubeStatus(`YouTube: error al leer canal (${res.status})${details}`)
        return
      }

      const data = await res.json()
      const item = Array.isArray(data?.items) ? data.items[0] : null
      const channelId = typeof item?.id === 'string' ? item.id : ''
      const channelTitle = typeof item?.snippet?.title === 'string' ? item.snippet.title : ''

      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id !== profileId) return p
          return {
            ...p,
            youtubeChannelId: channelId,
            youtubeChannelTitle: channelTitle,
          }
        }),
      )

      setYouTubeStatus(channelTitle ? `YouTube: ${channelTitle}` : 'YouTube: conectado')
    } catch {
      setYouTubeStatus('YouTube: error al conectar')
    }
  }

  const videoId = useMemo(() => extractYouTubeVideoId(activeProfile?.url), [activeProfile?.url])
  const embedUrl = useMemo(() => buildYouTubeEmbedUrl(videoId), [videoId])

  function addProfile() {
    setIsAddAccountOpen((v) => !v)
  }

  function clearData() {
    setConfirmState({ open: true, kind: 'clear-data', profileId: '' })
  }

  function closeProfile(profileId) {
    setConfirmState({ open: true, kind: 'close-profile', profileId })
  }

  function confirmAction() {
    if (confirmState.kind === 'clear-data') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      setIsAddAccountOpen(false)
      setProfiles([])
      setActiveProfileId('')
    }

    if (confirmState.kind === 'close-profile' && confirmState.profileId) {
      const idToClose = confirmState.profileId
      setProfiles((prev) => {
        const nextProfiles = prev.filter((p) => p.id !== idToClose)

        if (activeProfileId === idToClose) {
          const nextActiveId = nextProfiles[0]?.id ?? ''
          setActiveProfileId(nextActiveId)
        }

        return nextProfiles
      })
    }

    setConfirmState({ open: false, kind: '', profileId: '' })
  }

  function cancelAction() {
    setConfirmState({ open: false, kind: '', profileId: '' })
  }

  function updateActiveUrl(url) {
    if (!activeProfileId) return
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== activeProfileId) return p
        return { ...p, url }
      }),
    )
  }

  return (
    <div className="appShell">
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.kind === 'clear-data' ? 'Vaciar datos' : 'Cerrar perfil'}
        description={
          confirmState.kind === 'clear-data'
            ? 'Se eliminarán todas las cuentas y links guardados.'
            : 'Este perfil se eliminará de la lista.'
        }
        confirmText={confirmState.kind === 'clear-data' ? 'Vaciar' : 'Cerrar'}
        cancelText="Cancelar"
        onConfirm={confirmAction}
        onCancel={cancelAction}
      />

      {isMobileMenuOpen && (
        <div className="mobileOverlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'sidebarOpen' : ''}`}>
        <div className="sidebarHeader">
          <div className="appTitle">
            <img src={theme === 'light' ? logo2Url : logoUrl} alt="Logo" className="logoImg" />
            Repeat After Me
          </div>
          <button className="primaryButton" type="button" onClick={addProfile} disabled={profiles.length >= 10}>
            Añadir cuenta
          </button>
        </div>

        {isAddAccountOpen ? <div className="gsiContainer" id={gsiButtonId} /> : null}

        <div className="profiles">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId
            const cleanLabel = isDefaultProfileLabel(p.label) ? '' : p.label
            const displayLabel = p.youtubeChannelTitle || p.email || p.name || cleanLabel || 'Cuenta'
            return (
              <button
                key={p.id}
                type="button"
                className={isActive ? 'profileItem profileItemActive' : 'profileItem'}
                onClick={() => setActiveProfileId(p.id)}
                title={displayLabel}
              >
                <div className="profileAvatar">
                  {p.picture ? <img className="avatarImg" src={p.picture} alt="" /> : (displayLabel || 'P').slice(0, 1).toUpperCase()}
                </div>
                <div className="profileLabel">{displayLabel}</div>
                <button
                  type="button"
                  className="closeProfileButton"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    closeProfile(p.id)
                  }}
                  aria-label="Cerrar perfil"
                  title="Cerrar perfil"
                >
                  ×
                </button>
              </button>
            )
          })}
        </div>

        <div className="sidebarFooter">
          <div className="hint">Perfiles activos: {profiles.length}/10</div>
          {youtubeStatus ? <div className="hint">{youtubeStatus}</div> : null}
          <button className="secondaryButton" type="button" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
            <span className="buttonWithIcon">
              {theme === 'dark' ? <MoonIcon className="uiIcon" /> : <SunIcon className="uiIcon" />}
              Fondo: {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </button>
          <button className="secondaryButton" type="button" onClick={clearData}>
            Vaciar datos
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="panel">
          <div className="toolbar">
            <div className="toolbarHeader">
              <button className="mobileMenuBtn" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
              <label className="fieldLabel" htmlFor={inputId}>
                Enlace de YouTube
              </label>
            </div>
            <input
              id={inputId}
              className="urlInput"
              value={activeProfile?.url ?? ''}
              onChange={(e) => updateActiveUrl(e.target.value)}
              placeholder="Pega un enlace (youtube.com/watch?v=... o youtu.be/...)"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              disabled={!activeProfile}
            />
            <div className="metaRow">
              <div className="hint">{videoId ? `Video ID: ${videoId}` : 'Pega un enlace válido para reproducir'}</div>
              {activeProfile && !activeProfile.youtubeChannelId ? (
                <button className="ytConnectButton" type="button" onClick={() => connectYouTube(activeProfile.id, activeProfile.email)}>
                  Conectar YouTube
                </button>
              ) : activeProfile?.youtubeChannelTitle ? (
                <div className="hint hintSuccess">
                  <CheckIcon className="uiIcon" />
                  {activeProfile.youtubeChannelTitle}
                </div>
              ) : null}
            </div>
          </div>

          <div className="playerSurface">
            {profiles.length ? (
              <div className="playerStack">
                {profiles.map((p) => {
                  const url = getEmbedUrlFromYouTubeUrl(p.url)
                  const isActive = p.id === activeProfileId

                  if (!url) return null

                  return (
                    <iframe
                      key={p.id}
                      className={isActive ? 'playerFrame playerFrameActive' : 'playerFrame'}
                      src={url}
                      title="YouTube Player"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  )
                })}
              </div>
            ) : (
              <div className="emptyState">Sin perfiles</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
