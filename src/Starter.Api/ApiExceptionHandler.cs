using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace Starter.Api;

public sealed class ApiExceptionHandler(IProblemDetailsService problems, ILogger<ApiExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, title, detail) = exception switch
        {
            // Malformed JSON or missing required values. Development throws these instead of writing a 400.
            BadHttpRequestException badRequest =>
                (badRequest.StatusCode, "The request is invalid", "Check the request and try again."),
            // Another request saved the same row between this request's read and write.
            DbUpdateConcurrencyException =>
                (StatusCodes.Status409Conflict, "This resource has changed", "Reload it and try again."),
            _ => (StatusCodes.Status500InternalServerError, "Something went wrong", "Please try again later.")
        };

        if (status >= StatusCodes.Status500InternalServerError)
        {
            // Matches the traceId that Problem Details returns to the client.
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
            logger.LogError(exception, "Request failed. Trace ID: {TraceId}", traceId);
        }

        context.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new() { Status = status, Title = title, Detail = detail }
        });
    }
}
