# ── Base runtime ───────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER app
WORKDIR /app
EXPOSE 8080

# ── Build + Publish ──────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Central Package Management: os props precisam estar presentes antes do restore.
COPY ["Directory.Build.props", "Directory.Packages.props", "./"]
COPY ["Elrond.API/Elrond.API.csproj",                       "Elrond.API/"]
COPY ["Elrond.Application/Elrond.Application.csproj",        "Elrond.Application/"]
COPY ["Elrond.Domain/Elrond.Domain.csproj",                 "Elrond.Domain/"]
COPY ["Elrond.Infrastructure/Elrond.Infrastructure.csproj", "Elrond.Infrastructure/"]
RUN dotnet restore "Elrond.API/Elrond.API.csproj"

COPY . .
RUN dotnet publish "Elrond.API/Elrond.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# ── Final image ──────────────────────────────────────────────────────────
FROM base AS final
WORKDIR /app
# Pasta dos anexos (volume elrond-arquivos): precisa pertencer ao usuário "app",
# senão o processo não consegue gravar. Criada antes de voltar ao usuário sem privilégio.
USER root
RUN mkdir -p /app/arquivos && chown app:app /app/arquivos
USER app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Elrond.API.dll"]
