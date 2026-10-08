using System.ComponentModel.DataAnnotations;

namespace Starter.Api.Features.WorkItems;

public sealed record CreateWorkItemRequest(
    [property: Required, StringLength(120, MinimumLength = 1)] string Title);

public sealed record UpdateWorkItemRequest(
    [property: Required, StringLength(120, MinimumLength = 1)] string Title,
    bool IsComplete,
    [property: Required] Guid? Version);

public sealed record WorkItemResponse(
    Guid Id, string Title, bool IsComplete, DateTime CreatedAt, Guid Version)
{
    public static WorkItemResponse From(WorkItem item) =>
        new(item.Id, item.Title, item.IsComplete, item.CreatedAt, item.Version);
}
