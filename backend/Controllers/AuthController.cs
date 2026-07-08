using Microsoft.AspNetCore.Mvc;
using backend.Models;
using backend.Services;
using System;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ImgBbService _imgBbService;

        public AuthController(IAuthService authService, ImgBbService imgBbService)
        {
            _authService = authService;
            _imgBbService = imgBbService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Username, Email, and Password are required." });

            try
            {
                var user = await _authService.RegisterAsync(request.Username, request.Email, request.Password, request.AvatarUrl);
                return Ok(user);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email and Password are required." });

            var user = await _authService.LoginAsync(request.Email, request.Password);
            if (user == null)
                return BadRequest(new { message = "Invalid email or password." });

            return Ok(user);
        }

        [HttpPost("update")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var user = await _authService.UpdateProfileAsync(request.UserId, request.Username, request.AvatarUrl, request.CoverImageUrl, request.Bio, request.Nickname, request.Location, request.DateOfBirth, request.RelationshipStatus, request.Education);
            if (user == null)
                return NotFound(new { message = "User not found." });

            return Ok(user);
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                var success = await _authService.ChangePasswordAsync(request.UserId, request.OldPassword, request.NewPassword);
                if (!success) return BadRequest(new { message = "Mật khẩu cũ không đúng." });
                return Ok(new { message = "Đổi mật khẩu thành công." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadProfileImage(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });
                var url = await _imgBbService.UploadImageAsync(file);
                return Ok(new { url });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetPublicProfile(Guid userId, [FromQuery] Guid viewerId)
        {
            try
            {
                var user = await _authService.GetPublicProfileAsync(userId, viewerId);
                if (user == null) return NotFound(new { message = "User not found." });
                return Ok(user);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateProfileRequest
    {
        public Guid UserId { get; set; }
        public string? Username { get; set; }
        public string? AvatarUrl { get; set; }
        public string? CoverImageUrl { get; set; }
        public string? Bio { get; set; }
        public string? Nickname { get; set; }
        public string? Location { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? RelationshipStatus { get; set; }
        public string? Education { get; set; }
    }

    public class ChangePasswordRequest
    {
        public Guid UserId { get; set; }
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
