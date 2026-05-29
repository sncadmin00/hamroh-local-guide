**Move WhatsApp & Telegram icons to hero section**

Add the WhatsApp and Telegram contact icons directly below the "Prefer to browse? Find a guide manually →" link on the homepage hero section.

- Import or inline the WhatsAppIcon and TelegramIcon SVG components into `src/routes/index.tsx`.
- Add a centered row with both icons + labels (e.g., "Chat on WhatsApp" / "Join Telegram") underneath the existing `<p className="mt-8 text-center text-sm">` browse link.
- Keep the same brand colors (#25D366 for WhatsApp, #229ED9 for Telegram) and hover states from the header/footer.
- Remove or hide the icons from the header desktop nav and footer to avoid duplication, or leave them in place if the user only wants them *also* in the hero.