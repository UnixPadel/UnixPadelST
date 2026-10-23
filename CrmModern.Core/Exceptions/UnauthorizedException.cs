namespace CrmModern.Core.Exceptions;

/// <summary>Thrown for invalid credentials or inactive account → HTTP 401. Kod: bkz. BusinessException.</summary>
public sealed class UnauthorizedException(string message = "Bunu yapmaya yetkin yok.", string? code = "unauthorized")
    : Exception(message)
{
    public string? Code { get; } = code;
}
