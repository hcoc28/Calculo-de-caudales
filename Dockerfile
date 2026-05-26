FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/CaudalesBackend.csproj backend/
RUN dotnet restore backend/CaudalesBackend.csproj

COPY backend/ backend/
COPY frontend/ frontend/
RUN dotnet publish backend/CaudalesBackend.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./
COPY frontend/ /frontend/

ENV PORT=4000

CMD ["sh", "-c", "dotnet CaudalesBackend.dll"]
