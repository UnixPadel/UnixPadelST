namespace CrmModern.Core.Exceptions;

/// <summary>
/// Thrown for domain rule violations (duplicate name, invalid state, etc.) → HTTP 400.
/// Use instead of raw ArgumentException to keep business errors distinguishable.
/// </summary>
public sealed class BusinessException(string message) : Exception(message);
