export const siteConfig = {
  name: "Nathan's Agency",
  title: "Nathan's Agency | Turn Missed Calls Into Booked Appointments",
  description:
    "AI receptionist that answers missed calls, qualifies leads, and books appointments directly into your calendar.",
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "nminerath@gmail.com",
    phoneE164: process.env.NEXT_PUBLIC_CONTACT_PHONE_E164 ?? "+12627208560",
    phoneDisplay: process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY ?? "(262) 720-8560",
  },
} as const
