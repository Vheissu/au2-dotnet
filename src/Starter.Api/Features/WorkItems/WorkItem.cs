namespace Starter.Api.Features.WorkItems;

public sealed class WorkItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Title { get; set; }
    public bool IsComplete { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
