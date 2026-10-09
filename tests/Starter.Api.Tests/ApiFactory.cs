using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Starter.Api.Tests;

public sealed class ApiFactory(string environment = "Testing") : WebApplicationFactory<Program>
{
    // The directory does not exist yet, so every test also covers the API creating it on startup.
    private readonly string directory = Path.Combine(Path.GetTempPath(), $"au2-test-{Guid.NewGuid()}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = $"Data Source={Path.Combine(directory, "starter.db")};Pooling=False",
                ["Database:ApplyMigrations"] = "true"
            }));
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
    }
}
