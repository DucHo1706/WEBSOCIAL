# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the ASP.NET Core Backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-builder
WORKDIR /app
COPY backend/backend.csproj ./backend/
RUN dotnet restore backend/backend.csproj
COPY backend/ ./backend/
WORKDIR /app/backend
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Final runtime environment
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=backend-builder /app/publish .
# Copy frontend build into wwwroot
COPY --from=frontend-builder /app/frontend/dist ./wwwroot

# Expose port and start backend (migration runs automatically at startup)
EXPOSE 8080
ENTRYPOINT ["sh", "-c"]
CMD ["dotnet backend.dll --urls \"http://*:${PORT:-8080}\""]
