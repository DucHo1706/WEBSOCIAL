using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using backend.Models;
using backend.Repositories;

namespace backend.Services
{
    public interface IAuthService
    {
        Task<User?> RegisterAsync(string username, string email, string password, string? avatarUrl);
        Task<User?> LoginAsync(string email, string password);
        Task<User?> UpdateProfileAsync(Guid userId, string? username, string? avatarUrl, string? coverImageUrl, string? bio, string? nickname = null, string? location = null, DateTime? dateOfBirth = null, string? relationshipStatus = null, string? education = null);
        Task<User?> GetPublicProfileAsync(Guid userId, Guid viewerId);
        Task<bool> ChangePasswordAsync(Guid userId, string oldPassword, string newPassword);
    }

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IActivityLogRepository _activityLogRepository;

        public AuthService(IUserRepository userRepository, IActivityLogRepository activityLogRepository)
        {
            _userRepository = userRepository;
            _activityLogRepository = activityLogRepository;
        }

        public async Task<User?> RegisterAsync(string username, string email, string password, string? avatarUrl)
        {
            var emailExists = await _userRepository.EmailExistsAsync(email);
            if (emailExists) throw new Exception("Email already registered.");

            var usernameExists = await _userRepository.UsernameExistsAsync(username);
            if (usernameExists) throw new Exception("Username already taken.");

            var user = new User
            {
                Username = username.Trim(),
                Email = email.Trim().ToLower(),
                PasswordHash = HashPassword(password),
                AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) 
                    ? $"https://api.dicebear.com/7.x/adventurer/svg?seed={Uri.EscapeDataString(username)}" 
                    : avatarUrl
            };

            await _userRepository.AddAsync(user);
            await _userRepository.SaveChangesAsync();

            // Log activity
            await _activityLogRepository.LogActivityAsync(user.UserId, "Register", "Đã đăng ký tài khoản thành viên mới.");

            return user;
        }

        public async Task<User?> LoginAsync(string email, string password)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null || user.PasswordHash != HashPassword(password))
            {
                return null;
            }

            // Log activity
            await _activityLogRepository.LogActivityAsync(user.UserId, "Login", "Đã đăng nhập vào hệ thống.");

            return user;
        }

        public async Task<User?> UpdateProfileAsync(Guid userId, string? username, string? avatarUrl, string? coverImageUrl, string? bio, string? nickname = null, string? location = null, DateTime? dateOfBirth = null, string? relationshipStatus = null, string? education = null)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return null;

            if (!string.IsNullOrWhiteSpace(username))
            {
                user.Username = username.Trim();
            }

            if (!string.IsNullOrWhiteSpace(avatarUrl))
            {
                user.AvatarUrl = avatarUrl.Trim();
            }

            // Map Cover Image and Bio (allow setting empty or new value)
            user.CoverImageUrl = coverImageUrl?.Trim();
            user.Bio = bio?.Trim();

            // New fields
            if (nickname != null) user.Nickname = nickname.Trim();
            if (location != null) user.Location = location.Trim();
            if (dateOfBirth.HasValue) user.DateOfBirth = dateOfBirth;
            if (relationshipStatus != null) user.RelationshipStatus = relationshipStatus.Trim();
            if (education != null) user.Education = education.Trim();

            await _userRepository.SaveChangesAsync();

            // Log activity
            await _activityLogRepository.LogActivityAsync(userId, "ProfileUpdate", "Đã cập nhật thông tin trang cá nhân.");

            return user;
        }

        public async Task<User?> GetPublicProfileAsync(Guid userId, Guid viewerId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return null;

            // TODO: Apply privacy filtering once privacy per-field is implemented.
            // For now return full profile (owner + friends + public all see same).
            // If blocked relationship exists, return null to simulate "not found".
            return user;
        }

        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        public async Task<bool> ChangePasswordAsync(Guid userId, string oldPassword, string newPassword)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return false;

            if (user.PasswordHash != HashPassword(oldPassword)) return false;

            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
                throw new Exception("Mật khẩu mới phải có ít nhất 6 ký tự.");

            user.PasswordHash = HashPassword(newPassword);
            await _userRepository.SaveChangesAsync();
            await _activityLogRepository.LogActivityAsync(userId, "ChangePassword", "Đã đổi mật khẩu tài khoản.");
            return true;
        }
    }
}
