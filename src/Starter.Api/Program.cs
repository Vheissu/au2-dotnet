using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Starter.Api;
using Starter.Api.Data;
using Starter.Api.Features.WorkItems;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.RespectRequiredConstructorParameters = true);
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddValidation();
builder.Services.AddOpenApi();
builder.Services.AddSingleton(TimeProvider.System);
// Read configuration when the context is created, not here: test hosts apply their overrides during Build().
builder.Services.AddDbContext<StarterDbContext>((services, options) =>
    options.UseSqlite(services.GetRequiredService<IConfiguration>().GetConnectionString("Database")
        ?? throw new InvalidOperationException("ConnectionStrings:Database is required.")));
builder.Services.AddHealthChecks().AddDbContextCheck<StarterDbContext>("database");

var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.Use((context, next) =>
{
    var headers = context.Response.Headers;
    headers.XContentTypeOptions = "nosniff";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    // The built frontend loads only its own scripts and styles. Extend this when adding a CDN or analytics.
    headers.ContentSecurityPolicy =
        "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
    return next(context);
});

EnsureSqliteDirectory(app.Configuration.GetConnectionString("Database") ?? "");
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Database:ApplyMigrations"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<StarterDbContext>().Database.MigrateAsync();
}

var spaFiles = new StaticFileOptions
{
    OnPrepareResponse = context => context.Context.Response.Headers.CacheControl =
        // Vite fingerprints everything in /assets. Everything else, including index.html, must revalidate
        // so a new deployment is picked up immediately.
        context.Context.Request.Path.StartsWithSegments("/assets")
            ? "public, max-age=31536000, immutable"
            : "no-cache"
};
app.UseDefaultFiles();
app.UseStaticFiles(spaFiles);
app.MapHealthChecks("/health");
app.MapWorkItems();
if (app.Environment.IsDevelopment()) app.MapOpenApi();

// Unknown API URLs must stay JSON 404s, never return the SPA's index.html.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint not found"));
app.MapFallbackToFile("index.html", spaFiles);
await app.RunAsync();

// SQLite creates the database file on first use, but not its parent directory.
// Relative paths resolve against the process working directory.
static void EnsureSqliteDirectory(string connectionString)
{
    var dataSource = new SqliteConnectionStringBuilder(connectionString).DataSource;
    if (dataSource is "" or ":memory:" || dataSource.StartsWith("file:", StringComparison.Ordinal)) return;
    var directory = Path.GetDirectoryName(Path.GetFullPath(dataSource));
    if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
}

public partial class Program;
