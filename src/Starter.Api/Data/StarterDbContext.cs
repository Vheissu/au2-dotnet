using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Starter.Api.Features.WorkItems;

namespace Starter.Api.Data;

public sealed class StarterDbContext(DbContextOptions<StarterDbContext> options) : DbContext(options)
{
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // SQLite stores DateTime as text with no kind. Read values back as UTC so JSON keeps its "Z".
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var item = modelBuilder.Entity<WorkItem>();
        item.HasKey(x => x.Id);
        item.Property(x => x.Title).HasMaxLength(WorkItem.TitleMaxLength).IsRequired();
        item.Property(x => x.Version).IsConcurrencyToken();
        item.HasIndex(x => x.CreatedAt);
    }

    private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        value => value.ToUniversalTime(),
        value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
