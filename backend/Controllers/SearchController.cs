using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.Threading.Tasks;
using System.Linq;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly IMemoryRepository _memoryRepository;
        private readonly IUserRepository _userRepository;

        public SearchController(IMemoryRepository memoryRepository, IUserRepository userRepository)
        {
            _memoryRepository = memoryRepository;
            _userRepository = userRepository;
        }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] Guid userId)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            {
                return Ok(new SearchResultsDto());
            }

            try
            {
                var query = q.Trim().ToLower();

                // Search users by username
                var users = await _userRepository.SearchByUsernameAsync(query);

                // Search memories by caption (simple contains)
                var allMemories = await _memoryRepository.SearchMemoriesAsync(query);

                // Filter by privacy
                var filtered = allMemories.Where(m =>
                    m.Privacy == "Public" ||
                    m.UserId == userId
                ).Select(m => new SearchMemoryItemDto
                {
                    MemoryId = m.MemoryId,
                    Caption = m.Caption,
                    ImageUrl = m.ImageUrl,
                    CreatedAt = m.CreatedAt,
                    UserId = m.UserId,
                    Username = m.User?.Username ?? "Unknown"
                }).ToList();

                return Ok(new SearchResultsDto
                {
                    Users = users.Select(u => new SearchUserItemDto
                    {
                        UserId = u.UserId,
                        Username = u.Username,
                        AvatarUrl = u.AvatarUrl
                    }).ToList(),
                    Memories = filtered
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class SearchResultsDto
    {
        public List<SearchUserItemDto> Users { get; set; } = new();
        public List<SearchMemoryItemDto> Memories { get; set; } = new();
    }

    public class SearchUserItemDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }

    public class SearchMemoryItemDto
    {
        public Guid MemoryId { get; set; }
        public string Caption { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
    }
}
