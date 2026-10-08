FROM node:26-alpine AS web
WORKDIR /source
COPY package.json package-lock.json ./
COPY src/Starter.Web/package.json src/Starter.Web/package.json
RUN npm ci
COPY src/Starter.Web src/Starter.Web
RUN npm run build:web

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /source
COPY global.json Directory.Build.props ./
COPY src/Starter.Api/Starter.Api.csproj src/Starter.Api/packages.lock.json src/Starter.Api/
RUN dotnet restore src/Starter.Api --locked-mode
COPY src/Starter.Api src/Starter.Api
RUN dotnet publish src/Starter.Api -c Release --no-restore -o /publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=api /publish ./
COPY --from=web /source/src/Starter.Web/dist ./wwwroot
RUN mkdir -p /app/App_Data && chown -R $APP_UID:$APP_UID /app/App_Data
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Starter.Api.dll"]
