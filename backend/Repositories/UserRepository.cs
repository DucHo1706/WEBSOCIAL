using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<User?> GetByEmailAsync(string email);
        Task<bool> EmailExistsAsync(string email);
        Task<bool> UsernameExistsAsync(string username);
        Task<List<User>> GetAllExceptAsync(Guid currentUserId);
        Task<List<User>> SearchByUsernameAsync(string query);
        Task AddAsync(User user);
        Task SaveChangesAsync();
    }

    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByIdAsync(Guid id)
        {
            return await _context.Users.FindAsync(id);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower());
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email.ToLower() == email.Trim().ToLower());
        }

        public async Task<bool> UsernameExistsAsync(string username)
        {
            return await _context.Users.AnyAsync(u => u.Username.ToLower() == username.Trim().ToLower());
        }

        public async Task<List<User>> GetAllExceptAsync(Guid currentUserId)
        {
            return await _context.Users
                .Where(u => u.UserId != currentUserId)
                .ToListAsync();
        }

        public async Task<List<User>> SearchByUsernameAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return new List<User>();
            return await _context.Users
                .Where(u => u.Username.ToLower().Contains(query.ToLower()))
                .Take(10)
                .ToListAsync();
        }

        public async Task AddAsync(User user)
        {
            await _context.Users.AddAsync(user);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
