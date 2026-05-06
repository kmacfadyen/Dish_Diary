import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  entryId: string
  existingUrl?: string | null
  onUploaded: (url: string) => void
}

export function PhotoUpload({ entryId, existingUrl, onUploaded }: Props) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }

    setError('')
    setUploading(true)

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${entryId}-${Date.now()}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('entry-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('entry-photos')
      .getPublicUrl(path)

    // Save to diary entry
    await supabase
      .from('diary_entries')
      .update({ photo_url: publicUrl })
      .eq('id', entryId)

    onUploaded(publicUrl)
    setUploading(false)
  }

  async function removePhoto() {
    await supabase
      .from('diary_entries')
      .update({ photo_url: null })
      .eq('id', entryId)
    setPreview(null)
    onUploaded('')
  }

  return (
    <div>
      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={preview} alt="Dish photo" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
          <button
            onClick={removePhoto}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ width: '100%', padding: '12px', border: '2px dashed var(--border2)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', color: 'var(--fg3)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {uploading ? '⏳ Uploading…' : '📷 Add a photo'}
        </button>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
