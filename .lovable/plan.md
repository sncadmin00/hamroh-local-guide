## Remove the wishlist heart from the header

The heart icon next to the language switcher in the top header duplicates the Wishlist entry already present in the user menu.

### Change
- `src/components/SiteHeader.tsx`: remove the `<Link to="/wishlist">` heart button (lines 90–96) from the right-side cluster.
- Keep the Wishlist item inside the user dropdown menu (line 133) — that remains the single access point.
- Remove the now-unused `Heart` import if no other usage remains in the file.

No other files need changes; the `/wishlist` route stays intact.