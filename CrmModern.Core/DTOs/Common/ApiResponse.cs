namespace CrmModern.Core.DTOs.Common;

/// <summary>
/// Every API endpoint returns this envelope.
/// Shape: { success, data, message, errors }
/// </summary>
public sealed class ApiResponse<T>
{
    public bool     Success { get; init; }
    public T?       Data    { get; init; }
    public string   Message { get; init; } = string.Empty;
    public string[] Errors  { get; init; } = [];
    /// <summary>Kararlı hata kodu (istemci çevirisi, ör. "amountMustBePositive"); Message Türkçe yedektir.</summary>
    public string?  Code    { get; init; }
    /// <summary>Kod metnindeki değişkenler (ör. { no, stage }).</summary>
    public object?  Args    { get; init; }

    public static ApiResponse<T> Ok(T data, string message = "") =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, params string[] errors) =>
        new() { Success = false, Message = message, Errors = errors };

    public static ApiResponse<T> FailCode(string code, string message, object? args, params string[] errors) =>
        new() { Success = false, Message = message, Code = code, Args = args, Errors = errors };
}
