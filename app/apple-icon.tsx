import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#1B3A5C',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24" fill="#5B84B1">
          <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
