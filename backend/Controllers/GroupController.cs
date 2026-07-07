using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public GroupController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.GroupName) || request.CreatorId == Guid.Empty)
            {
                return BadRequest(new { message = "GroupName and CreatorId are required." });
            }

            var creator = await _context.Users.FindAsync(request.CreatorId);
            if (creator == null)
            {
                return NotFound(new { message = "Creator user not found." });
            }

            // Generate unique 6-digit invite code
            string inviteCode;
            bool codeExists;
            var random = new Random();
            do
            {
                inviteCode = random.Next(100000, 999999).ToString();
                codeExists = await _context.Groups.AnyAsync(g => g.InviteCode == inviteCode);
            } while (codeExists);

            var group = new Group
            {
                GroupName = request.GroupName.Trim(),
                InviteCode = inviteCode
            };

            var userGroup = new UserGroup
            {
                UserId = request.CreatorId,
                GroupId = group.GroupId,
                Role = "Creator"
            };

            _context.Groups.Add(group);
            _context.UserGroups.Add(userGroup);
            await _context.SaveChangesAsync();

            return Ok(new { group.GroupId, group.GroupName, group.InviteCode, group.CreatedAt });
        }

        [HttpPost("join")]
        public async Task<IActionResult> JoinGroup([FromBody] JoinGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.InviteCode) || request.UserId == Guid.Empty)
            {
                return BadRequest(new { message = "InviteCode and UserId are required." });
            }

            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            var group = await _context.Groups.FirstOrDefaultAsync(g => g.InviteCode == request.InviteCode.Trim());
            if (group == null)
            {
                return NotFound(new { message = "Group not found with the provided invite code." });
            }

            var alreadyMember = await _context.UserGroups.AnyAsync(ug => ug.UserId == request.UserId && ug.GroupId == group.GroupId);
            if (alreadyMember)
            {
                return Ok(new { message = "User is already a member of this group.", group.GroupId, group.GroupName });
            }

            var userGroup = new UserGroup
            {
                UserId = request.UserId,
                GroupId = group.GroupId,
                Role = "Member"
            };

            _context.UserGroups.Add(userGroup);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Successfully joined group.", group.GroupId, group.GroupName });
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserGroups(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            var groups = await _context.UserGroups
                .Where(ug => ug.UserId == userId)
                .Select(ug => new
                {
                    ug.Group!.GroupId,
                    ug.Group.GroupName,
                    ug.Group.InviteCode,
                    ug.Group.CreatedAt,
                    ug.Role,
                    ug.JoinedAt
                })
                .ToListAsync();

            return Ok(groups);
        }

        [HttpGet("{groupId}/members")]
        public async Task<IActionResult> GetGroupMembers(Guid groupId)
        {
            var groupExists = await _context.Groups.AnyAsync(g => g.GroupId == groupId);
            if (!groupExists)
            {
                return NotFound(new { message = "Group not found." });
            }

            var members = await _context.UserGroups
                .Where(ug => ug.GroupId == groupId)
                .Select(ug => new
                {
                    ug.User!.UserId,
                    ug.User.Username,
                    ug.User.Email,
                    ug.User.AvatarUrl,
                    ug.Role,
                    ug.JoinedAt
                })
                .ToListAsync();

            return Ok(members);
        }
    }

    public class CreateGroupRequest
    {
        public string GroupName { get; set; } = string.Empty;
        public Guid CreatorId { get; set; }
    }

    public class JoinGroupRequest
    {
        public string InviteCode { get; set; } = string.Empty;
        public Guid UserId { get; set; }
    }
}
