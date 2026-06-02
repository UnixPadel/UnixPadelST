# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first for restore caching
COPY CrmModern.Core/CrmModern.Core.csproj CrmModern.Core/
COPY CrmModern.Infrastructure/CrmModern.Infrastructure.csproj CrmModern.Infrastructure/
COPY CrmModern.API/CrmModern.API.csproj CrmModern.API/

RUN dotnet restore CrmModern.API/CrmModern.API.csproj

# Copy the rest of the source and publish
COPY CrmModern.Core/ CrmModern.Core/
COPY CrmModern.Infrastructure/ CrmModern.Infrastructure/
COPY CrmModern.API/ CrmModern.API/

RUN dotnet publish CrmModern.API/CrmModern.API.csproj -c Release -o /app/publish /p:UseAppHost=false

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render free tier dinleme portu
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "CrmModern.API.dll"]
