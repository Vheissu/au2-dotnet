using Microsoft.EntityFrameworkCore;
using Starter.Api.Features.WorkItems;

namespace Starter.Api.Data;

public sealed class StarterDbContext(DbContextOptions<StarterDbContext> options) : DbContext(options)
{
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var item = modelBuilder.Entity<WorkItem>();
        item.HasKey(x => x.Id);
        item.Property(x => x.Title).HasMaxLength(120).IsRequired();
        item.Property(x => x.Version).IsConcurrencyToken();
        item.HasIndex(x => x.CreatedAt);
    }
}
