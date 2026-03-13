import withAuth from 'next-auth/middleware'
export default withAuth

export const config = {
  matcher: ['/dashboard/:path*', '/knowledge/:path*', '/sops/:path*', '/change-requests/:path*', '/issues/:path*', '/admin/:path*'],
}
