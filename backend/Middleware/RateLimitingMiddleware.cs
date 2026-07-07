using System.Collections.Concurrent;

namespace backend.Middleware
{
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ConcurrentDictionary<string, RateLimitEntry> _clients = new();
        private readonly int _maxRequests = 30; // max 30 requests
        private readonly int _windowMs = 10000; // per 10 seconds

        public RateLimitingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Only throttle API routes
            if (!context.Request.Path.StartsWithSegments("/api"))
            {
                await _next(context);
                return;
            }

            var key = $"{context.Connection.RemoteIpAddress}:{context.Request.Path}";
            var now = DateTime.UtcNow;

            var entry = _clients.GetOrAdd(key, new RateLimitEntry { Count = 0, ResetAt = now.AddMilliseconds(_windowMs) });

            lock (entry)
            {
                if (now > entry.ResetAt)
                {
                    entry.Count = 0;
                    entry.ResetAt = now.AddMilliseconds(_windowMs);
                }

                entry.Count++;

                if (entry.Count > _maxRequests)
                {
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers["Retry-After"] = "10";
                    return;
                }
            }

            await _next(context);
        }

        private class RateLimitEntry
        {
            public int Count { get; set; }
            public DateTime ResetAt { get; set; }
        }
    }
}
