using System.Diagnostics;
using System.Net;
using System.Text.Json;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.Exceptions;

namespace CrmModern.API.Middleware;

/// <summary>
/// Global exception handler — converts domain exceptions to consistent HTTP responses.
/// Paket 1 — Development environment'ta stack trace + inner exception zinciri
/// response body'sine yansıtılır (Errors[] içinde); Production sadece correlationId.
/// </summary>
public sealed class ErrorHandlingMiddleware(
    RequestDelegate                    next,
    ILogger<ErrorHandlingMiddleware>   logger,
    IHostEnvironment                   env)
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            string correlationId = Activity.Current?.Id ?? Guid.NewGuid().ToString("N");
            logger.LogError(ex,
                "Unhandled exception [{CorrelationId}] on {Method} {Path}: {Message}",
                correlationId, context.Request.Method, context.Request.Path, ex.Message);

            await HandleExceptionAsync(context, ex, correlationId);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception, string correlationId)
    {
        context.Response.ContentType = "application/json";

        // Code/Args: istemci mesajı kendi dilinde gösterir (CrmModern.Web apiErrors.*);
        // Message Türkçe yedek ve günlük metnidir.
        (int statusCode, string message, string? code, object? args) = exception switch
        {
            NotFoundException     ex => ((int)HttpStatusCode.NotFound,            ex.Message, ex.Code, ex.Args),
            UnauthorizedException ex => ((int)HttpStatusCode.Unauthorized,         ex.Message, ex.Code, (object?)null),
            BusinessException     ex => ((int)HttpStatusCode.BadRequest,           ex.Message, ex.Code, ex.Args),
            _                        => ((int)HttpStatusCode.InternalServerError,  "Bir şeyler ters gitti. Tekrar dene.", "unknown", (object?)null)
        };

        context.Response.StatusCode = statusCode;
        context.Response.Headers["X-Correlation-Id"] = correlationId;

        var errors = new List<string> { $"correlationId: {correlationId}" };

        if (env.IsDevelopment() && statusCode == (int)HttpStatusCode.InternalServerError)
        {
            // Dev'de gerçek hatayı görelim ki "Unknown column" tarzı entity hataları
            // hemen görünsün. Inner exception zinciri dahil.
            errors.Add($"type: {exception.GetType().FullName}");
            errors.Add($"message: {exception.Message}");
            var inner = exception.InnerException;
            int depth = 0;
            while (inner is not null && depth++ < 5)
            {
                errors.Add($"inner[{depth}].type: {inner.GetType().FullName}");
                errors.Add($"inner[{depth}].message: {inner.Message}");
                inner = inner.InnerException;
            }
            if (exception.StackTrace is { } st)
                errors.Add("stack: " + st.Replace("\r\n", " | ").Replace("\n", " | "));
        }

        var body = code is null
            ? ApiResponse<object>.Fail(message, errors.ToArray())
            : ApiResponse<object>.FailCode(code, message, args, errors.ToArray());
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, _jsonOptions));
    }
}
