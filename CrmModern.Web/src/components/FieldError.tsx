// Küçük inline hata mesajı — required field altında gösterilir.
// Pattern: form-level `submitted` state true iken empty field için <FieldError />
// render edilir. Disabled submit yerine "tıkla → mesajları gör" UX'i için.
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}
