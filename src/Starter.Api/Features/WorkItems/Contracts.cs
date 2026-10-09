using System.ComponentModel.DataAnnotations;

namespace Starter.Api.Features.WorkItems;

public sealed record CreateWorkItemRequest(
    [property: Required, StringLength(WorkItem.TitleMaxLength, MinimumLength = 1)] string Title);

// Every constructor parameter is required in the JSON body (RespectRequiredConstructorParameters),
// so an omitted isComplete or version is rejected instead of defaulting to false or Guid.Empty.
public sealed record UpdateWorkItemRequest(
    [property: Required, StringLength(WorkItem.TitleMaxLength, MinimumLength = 1)] string Title,
    bool IsComplete,
    Guid Version);

public sealed record WorkItemResponse(
    Guid Id, string Title, bool IsComplete, DateTime CreatedAt, Guid Version)
{
    public static WorkItemResponse From(WorkItem item) =>
        new(item.Id, item.Title, item.IsComplete, item.CreatedAt, item.Version);
}
