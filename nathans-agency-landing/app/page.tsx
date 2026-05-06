import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { TrustBar } from "@/components/trust-bar"
import { HowItWorks } from "@/components/how-it-works"
import { Features } from "@/components/features"
import { TechnologySection } from "@/components/technology-section"
import { WhoItsFor } from "@/components/who-its-for"
import { AIVoiceSection } from "@/components/ai-voice-section"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <TrustBar />
      <HowItWorks />
      <Features />
      <TechnologySection />
      <WhoItsFor />
      <AIVoiceSection />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
