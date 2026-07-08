using Microsoft.EntityFrameworkCore;
using backend.Data;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;
using backend.Repositories;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Ignore reference cycles in EF Core models (e.g. Memory -> Reactions -> Memory)
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Keeps PascalCase (e.g. UserId, GroupId)
    });

// Configure EF Core with SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// Register Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IFriendshipRepository, FriendshipRepository>();
builder.Services.AddScoped<IChatRepository, ChatRepository>();
builder.Services.AddScoped<IMemoryRepository, MemoryRepository>();
builder.Services.AddScoped<IActivityLogRepository, ActivityLogRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IStoryRepository, StoryRepository>();

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFriendshipService, FriendshipService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IMemoryService, MemoryService>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IStoryService, StoryService>();
builder.Services.AddHttpClient<ImgBbService>();

// Add SignalR for real-time chat & reactions
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = null;
    });

// Enable CORS for public access (any origin) + allow credentials for SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");

// Custom rate limiting to prevent spam
app.UseMiddleware<backend.Middleware.RateLimitingMiddleware>();

// Serve static files (user-uploaded memory pictures)
app.UseStaticFiles();

// Resolve frontend path (check if frontend/dist exists, otherwise use wwwroot)
var frontendPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "frontend", "dist");
var useExternalFrontend = Directory.Exists(frontendPath);

if (useExternalFrontend)
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath)
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath)
    });
}
else
{
    // Fallback to default wwwroot serving
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// Https redirect disabled for dev - uncomment for production
// app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

// Map SignalR Hub
app.MapHub<MemoryHub>("/hubs/memories");

// SPA fallback: anything not API/hub → serve index.html
app.MapWhen(context => !context.Request.Path.StartsWithSegments("/api") &&
                       !context.Request.Path.StartsWithSegments("/hubs"), builder =>
{
    builder.Run(async context =>
    {
        var indexHtml = useExternalFrontend 
            ? Path.Combine(frontendPath, "index.html")
            : Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html");

        if (File.Exists(indexHtml))
        {
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync(indexHtml);
        }
        else
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsync("Frontend index.html not found.");
        }
    });
});

// Auto-apply EF Core migrations on startup
try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Database migration failed, but app will still start.");
}

app.Run();
