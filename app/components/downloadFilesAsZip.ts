import JSZip from 'jszip'

interface ZipFile {
  url: string
  name: string
}

export async function downloadFilesAsZip(files: ZipFile[], zipName: string) {
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

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
