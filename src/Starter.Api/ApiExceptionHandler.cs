using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace Starter.Api;

public sealed class ApiExceptionHandler(IProblemDetailsService problems, ILogger<ApiExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var conflict = exception is DbUpdateConcurrencyException;
        if (!conflict) logger.LogError(exception, "Request failed. Trace ID: {TraceId}", context.TraceIdentifier);
        context.Response.StatusCode = conflict ? StatusCodes.Status409Conflict : StatusCodes.Status500InternalServerError;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new()
            {
                Status = context.Response.StatusCode,
                Title = conflict ? "This task has changed" : "Something went wrong",
                Detail = conflict ? "Refresh the task list and try again." : "Please try again later.",
                Extensions = { ["traceId"] = context.TraceIdentifier }
            }
        });
    }
}
