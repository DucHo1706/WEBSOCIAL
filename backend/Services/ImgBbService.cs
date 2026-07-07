using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace backend.Services
{
    public class ImgBbService
    {
        private readonly HttpClient _httpClient;
        private const string ApiKey = "6b464f8adbc427d6504d9129a4d931f1";

        public ImgBbService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<string?> UploadImageAsync(IFormFile? file)
        {
            if (file == null || file.Length == 0) return null;

            try
            {
                using var content = new MultipartFormDataContent();
                
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var fileBytes = ms.ToArray();
                
                var byteContent = new ByteArrayContent(fileBytes);
                byteContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType ?? "image/jpeg");
                
                content.Add(byteContent, "image", file.FileName);

                var response = await _httpClient.PostAsync($"https://api.imgbb.com/1/upload?key={ApiKey}", content);
                if (!response.IsSuccessStatusCode)
                {
                    var errorMsg = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"ImgBB Upload failed: {errorMsg}");
                    return null;
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonString);
                if (doc.RootElement.TryGetProperty("data", out var dataEl) &&
                    dataEl.TryGetProperty("url", out var urlEl))
                {
                    return urlEl.GetString();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception during ImgBB Upload: {ex.Message}");
            }

            return null;
        }
    }
}
