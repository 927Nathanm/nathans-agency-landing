import { siteConfig } from '@/config/site'
import Link from "next/link"

export function Footer() {
  return (
    <footer className="py-12 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-lg font-semibold text-foreground">{siteConfig.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Service availability and features depend on your business requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <a href={`mailto:${siteConfig.contact.email}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
