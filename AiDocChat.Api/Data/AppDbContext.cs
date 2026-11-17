using System.Text.Json;
using AiDocChat.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AiDocChat.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentChunk> Chunks => Set<DocumentChunk>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ChatMessage> Messages => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Document>().HasMany(d => d.Chunks).WithOne().HasForeignKey(c => c.DocumentId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Document>().HasIndex(d => d.Sha256);
        b.Entity<DocumentChunk>().HasIndex(c => new { c.DocumentId, c.Index });

        b.Entity<Conversation>().HasMany(c => c.Messages).WithOne().HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Conversation>().HasIndex(c => c.UpdatedAt);

        b.Entity<ChatMessage>().Property(m => m.Sources).HasConversion(
            v => v == null ? null : JsonSerializer.Serialize(v, JsonSerializerOptions.Web),
            v => v == null ? null : JsonSerializer.Deserialize<List<Source>>(v, JsonSerializerOptions.Web));
    }

    // SQLite drops DateTime.Kind; everything is stored as UTC, so read it back as UTC.
    protected override void ConfigureConventions(ModelConfigurationBuilder b) =>
        b.Properties<DateTime>().HaveConversion<UtcConverter>();

    private sealed class UtcConverter() : ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
