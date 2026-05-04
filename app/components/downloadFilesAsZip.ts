import JSZip from 'jszip'

interface DownloadFile {
  url: string
  name: string
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadFilesAsZip(files: DownloadFile[], zipName: string) {
  if (files.length === 0) return

  if (files.length === 1) {
    const only = files[0]
    const res = await fetch(only.url)
    if (!res.ok) throw new Error(`Failed to fetch ${only.name}`)
    triggerDownload(await res.blob(), only.name)
    return
  }

  const zip = new JSZip()
  const usedNames = new Map<string, number>()

  const fetched = await Promise.all(
    files.map(async f => {
      const res = await fetch(f.url)
      if (!res.ok) throw new Error(`Failed to fetch ${f.name}`)
      return { name: f.name, blob: await res.blob() }
    })
  )

  for (const f of fetched) {
    const count = usedNames.get(f.name) ?? 0
    usedNames.set(f.name, count + 1)
    const finalName = count === 0
      ? f.name
      : f.name.replace(/(\.[^.]+)?$/, m => ` (${count})${m}`)
    zip.file(finalName, f.blob)
  }

  triggerDownload(await zip.generateAsync({ type: 'blob' }), zipName)
}
