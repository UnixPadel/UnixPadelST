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

        (int statusCode, string message) = exception switch
        {
            NotFoundException     ex => ((int)HttpStatusCode.NotFound,            ex.Message),
            UnauthorizedException ex => ((int)HttpStatusCode.Unauthorized,         ex.Message),
            BusinessException     ex => ((int)HttpStatusCode.BadRequest,           ex.Message),
            _                        => ((int)HttpStatusCode.InternalServerError,  "Beklenmeyen bir hata oluştu.")
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

        var body = ApiResponse<object>.Fail(message, errors.ToArray());
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, _jsonOptions));
    }
}
