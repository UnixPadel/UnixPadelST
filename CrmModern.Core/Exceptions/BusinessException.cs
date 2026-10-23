namespace CrmModern.Core.Exceptions;

/// <summary>
/// Thrown for domain rule violations (duplicate name, invalid state, etc.) → HTTP 400.
/// Use instead of raw ArgumentException to keep business errors distinguishable.
/// <para>
/// <paramref name="code"/>: istemcinin kendi dilinde göstereceği kararlı anahtar
/// (CrmModern.Web i18n <c>apiErrors.&lt;code&gt;</c>); <paramref name="message"/> Türkçe
/// yedek metindir (kod çevirisi yoksa ve günlüklerde görünür). <paramref name="args"/>
/// metindeki değişkenlerdir (ör. <c>new { no, stage }</c>).
/// </para>
/// </summary>
public sealed class BusinessException(string message, string? code = null, object? args = null) : Exception(message)
{
    public string? Code { get; } = code;
    public object? Args { get; } = args;
}
