namespace CrmModern.Core.Exceptions;

/// <summary>Thrown for invalid credentials or inactive account → HTTP 401.</summary>
public sealed class UnauthorizedException(string message = "Yetkisiz erişim.")
    : Exception(message);
