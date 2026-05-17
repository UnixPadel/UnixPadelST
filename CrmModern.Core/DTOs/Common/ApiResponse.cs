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

    public static ApiResponse<T> Ok(T data, string message = "") =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, params string[] errors) =>
        new() { Success = false, Message = message, Errors = errors };
}
