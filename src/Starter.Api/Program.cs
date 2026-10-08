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
builder.Services.AddDbContext<StarterDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Database")
        ?? throw new InvalidOperationException("ConnectionStrings:Database is required.")));
builder.Services.AddHealthChecks().AddDbContextCheck<StarterDbContext>("database");

var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();

// Relative SQLite paths resolve against the process working directory.
Directory.CreateDirectory("App_Data");
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Database:ApplyMigrations"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<StarterDbContext>().Database.MigrateAsync();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapHealthChecks("/health");
app.MapWorkItems();
if (app.Environment.IsDevelopment()) app.MapOpenApi();

// Unknown API URLs must stay JSON 404s, never return the SPA's index.html.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint not found"));
app.MapFallbackToFile("index.html");
await app.RunAsync();

public partial class Program;
