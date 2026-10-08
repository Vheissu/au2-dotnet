using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Starter.Api.Data;

namespace Starter.Api.Features.WorkItems;

public static class WorkItemEndpoints
{
    public static void MapWorkItems(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/work-items").WithTags("Work items");
        group.MapGet("/", List).WithName("ListWorkItems");
        group.MapGet("/{id:guid}", Get).WithName("GetWorkItem");
        group.MapPost("/", Create).WithName("CreateWorkItem").ProducesValidationProblem();
        group.MapPut("/{id:guid}", Update).WithName("UpdateWorkItem").ProducesValidationProblem().ProducesProblem(409);
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteWorkItem").ProducesProblem(409);
    }

    private static async Task<Ok<List<WorkItemResponse>>> List(StarterDbContext db, CancellationToken ct)
    {
        var items = await db.WorkItems.AsNoTracking().OrderBy(x => x.CreatedAt).ThenBy(x => x.Id)
            .Select(x => new WorkItemResponse(x.Id, x.Title, x.IsComplete, x.CreatedAt, x.Version))
            .ToListAsync(ct);
        return TypedResults.Ok(items);
    }

    private static async Task<Results<Ok<WorkItemResponse>, NotFound>> Get(
        Guid id, StarterDbContext db, CancellationToken ct)
    {
        var item = await db.WorkItems.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(WorkItemResponse.From(item));
    }

    private static async Task<Created<WorkItemResponse>> Create(
        CreateWorkItemRequest request, StarterDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var item = new WorkItem { Title = request.Title.Trim(), CreatedAt = clock.GetUtcNow().UtcDateTime };
        db.WorkItems.Add(item);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created($"/api/work-items/{item.Id}", WorkItemResponse.From(item));
    }

    private static async Task<Results<Ok<WorkItemResponse>, NotFound, ProblemHttpResult>> Update(
        Guid id, UpdateWorkItemRequest request, StarterDbContext db, CancellationToken ct)
    {
        var item = await db.WorkItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return TypedResults.NotFound();
        if (item.Version != request.Version) return Conflict();
        item.Title = request.Title.Trim();
        item.IsComplete = request.IsComplete;
        item.Version = Guid.NewGuid();
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(WorkItemResponse.From(item));
    }

    private static async Task<Results<NoContent, NotFound, ProblemHttpResult>> Delete(
        Guid id, Guid version, StarterDbContext db, CancellationToken ct)
    {
        var item = await db.WorkItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return TypedResults.NotFound();
        if (item.Version != version) return Conflict();
        db.WorkItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static ProblemHttpResult Conflict() => TypedResults.Problem(
        statusCode: StatusCodes.Status409Conflict,
        title: "This task has changed",
        detail: "Refresh the task list and try again.");
}
