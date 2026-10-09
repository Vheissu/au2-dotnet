using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Starter.Api.Features.WorkItems;

namespace Starter.Api.Tests;

public sealed class WorkItemTests : IDisposable
{
    private readonly ApiFactory factory = new();
    private HttpClient Client => factory.CreateClient();

    [Fact]
    public async Task TaskCanBeCreatedReadUpdatedAndDeleted()
    {
        using var client = Client;
        var created = await client.PostAsJsonAsync("/api/work-items/", new { title = "  Ship the starter  " });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var item = (await created.Content.ReadFromJsonAsync<WorkItemResponse>())!;
        Assert.Equal("Ship the starter", item.Title);
        Assert.False(item.IsComplete);
        Assert.NotEqual(Guid.Empty, item.Id);
        Assert.Equal($"/api/work-items/{item.Id}", created.Headers.Location!.OriginalString);

        using var otherClient = Client;
        var stored = await otherClient.GetFromJsonAsync<WorkItemResponse>(created.Headers.Location);
        Assert.Equal(item, stored);
        var list = await otherClient.GetFromJsonAsync<List<WorkItemResponse>>("/api/work-items/");
        Assert.Contains(item, list!);

        var updated = await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
            new { title = "Ship it", isComplete = true, version = item.Version });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var next = (await updated.Content.ReadFromJsonAsync<WorkItemResponse>())!;
        Assert.Equal("Ship it", next.Title);
        Assert.True(next.IsComplete);
        Assert.NotEqual(item.Version, next.Version);
        Assert.Equal(item.CreatedAt, next.CreatedAt);

        var deleted = await client.DeleteAsync($"/api/work-items/{item.Id}?version={next.Version}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(created.Headers.Location)).StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<List<WorkItemResponse>>("/api/work-items/"))!);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("\t\n")]
    public async Task EmptyTitlesAreRejected(string? title)
    {
        using var client = Client;
        var response = await client.PostAsJsonAsync("/api/work-items/", new { title });
        await AssertValidation(response);
        Assert.Empty((await client.GetFromJsonAsync<List<WorkItemResponse>>("/api/work-items/"))!);
    }

    [Fact]
    public async Task TitleLimitIsEnforcedAtBoundary()
    {
        using var client = Client;
        Assert.Equal(HttpStatusCode.Created,
            (await client.PostAsJsonAsync("/api/work-items/", new { title = new string('a', 120) })).StatusCode);
        await AssertValidation(await client.PostAsJsonAsync("/api/work-items/", new { title = new string('a', 121) }));
    }

    [Fact]
    public async Task StaleUpdateAndDeleteCannotOverwriteNewerChanges()
    {
        using var client = Client;
        var item = await Create(client);
        var first = await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
            new { title = "Newer title", isComplete = true, version = item.Version });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var stale = await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
            new { title = "Stale title", isComplete = false, version = item.Version });
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("application/problem+json", stale.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.Conflict,
            (await client.DeleteAsync($"/api/work-items/{item.Id}?version={item.Version}")).StatusCode);
        Assert.Equal("Newer title", (await client.GetFromJsonAsync<WorkItemResponse>($"/api/work-items/{item.Id}"))!.Title);
    }

    [Fact]
    public async Task UpdateValidatesTitleAndRequiresVersion()
    {
        using var client = Client;
        var item = await Create(client);
        await AssertValidation(await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
            new { title = " ", isComplete = true, version = item.Version }));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
            new { title = "New title", isComplete = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync($"/api/work-items/{item.Id}")).StatusCode);
        Assert.Equal(item, await client.GetFromJsonAsync<WorkItemResponse>($"/api/work-items/{item.Id}"));
    }

    [Fact]
    public async Task OmittedCompletionStateDoesNotSilentlyReopenATask()
    {
        using var client = Client;
        var item = await Create(client);
        var response = await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
            new { title = "New title", version = item.Version });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(item, await client.GetFromJsonAsync<WorkItemResponse>($"/api/work-items/{item.Id}"));
    }

    [Fact]
    public async Task MissingResourcesReturnNotFound()
    {
        using var client = Client;
        var id = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/work-items/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/work-items/{id}",
            new { title = "Missing", isComplete = false, version = Guid.NewGuid() })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/work-items/{id}?version={Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task MalformedJsonDoesNotCreateData()
    {
        using var client = Client;
        var response = await client.PostAsync("/api/work-items/", new StringContent("{bad json", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<List<WorkItemResponse>>("/api/work-items/"))!);
    }

    [Fact]
    public async Task HealthChecksTheDatabaseAndApiFallbackStaysJson()
    {
        using var client = Client;
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        var response = await client.GetAsync("/api/unknown");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/openapi/v1.json")).StatusCode);
    }

    [Fact]
    public async Task TimestampsKeepTheirUtcMarkerAfterARoundTrip()
    {
        using var client = Client;
        var created = await (await client.PostAsJsonAsync("/api/work-items/", new { title = "When" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var listed = (await client.GetFromJsonAsync<JsonElement>("/api/work-items/"))[0];
        Assert.EndsWith("Z", created.GetProperty("createdAt").GetString());
        Assert.Equal(created.GetProperty("createdAt").GetString(), listed.GetProperty("createdAt").GetString());
    }

    [Fact]
    public async Task BadRequestsStayClientErrorsInDevelopment()
    {
        // Development throws BadHttpRequestException for binding failures rather than writing a 400.
        using var development = new ApiFactory("Development");
        using var client = development.CreateClient();
        var malformed = await client.PostAsync("/api/work-items/",
            new StringContent("{bad json", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);
        Assert.Equal("application/problem+json", malformed.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync($"/api/work-items/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/openapi/v1.json")).StatusCode);
    }

    [Fact]
    public async Task ResponsesCarrySecurityHeaders()
    {
        using var client = Client;
        var response = await client.GetAsync("/health");
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Contains("frame-ancestors 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
    }

    private static async Task<WorkItemResponse> Create(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/work-items/", new { title = "Original" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<WorkItemResponse>())!;
    }

    private static async Task AssertValidation(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(problem.TryGetProperty("errors", out _));
    }

    public void Dispose() => factory.Dispose();
}
