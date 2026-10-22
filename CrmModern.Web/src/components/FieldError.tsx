// Küçük inline hata mesajı — required field altında gösterilir.
// Pattern: form-level `submitted` state true iken empty field için <FieldError />
// render edilir. Disabled submit yerine "tıkla → mesajları gör" UX'i için.
// role="alert" → ekran okuyucu hatayı göründüğü anda okur.
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null
  return <p id={id} role="alert" className="text-xs text-destructive mt-0.5">{message}</p>
}
