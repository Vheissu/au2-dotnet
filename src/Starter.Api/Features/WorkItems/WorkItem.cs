namespace Starter.Api.Features.WorkItems;

public sealed class WorkItem
{
    public const int TitleMaxLength = 120;

    // Version 7 GUIDs are time-ordered, which keeps index inserts sequential.
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Title { get; set; }
    public bool IsComplete { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
