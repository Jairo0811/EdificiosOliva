FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY EdificiosOlivaBackend/ ./
RUN dotnet restore EdificiosOliva.slnx
RUN dotnet publish EdificiosOliva.Api/EdificiosOliva.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

RUN mkdir -p /app/wwwroot/uploads

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "EdificiosOliva.Api.dll"]
