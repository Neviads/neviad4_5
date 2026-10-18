@echo off
setlocal
where mvn >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  call mvn %*
  goto :done
)
rem Reuse Maven distributions already installed by a standard Maven wrapper.
set "MVP_MAVEN_CACHE=%USERPROFILE%\.m2\wrapper\dists"
if defined MAVEN_USER_HOME set "MVP_MAVEN_CACHE=%MAVEN_USER_HOME%\wrapper\dists"
for /f "delims=" %%M in ('powershell.exe -NoProfile -Command "Get-ChildItem -LiteralPath $env:MVP_MAVEN_CACHE -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'apache-maven-3\.9\.' } | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName"') do set "MVP_MAVEN_CMD=%%M"
if defined MVP_MAVEN_CMD (
  call "%MVP_MAVEN_CMD%" %*
  goto :done
)
echo Maven 3.9+ was not found on PATH or in the wrapper cache. Install Maven 3.9+ and add its bin directory to PATH.
exit /b 1
:done
exit /b %ERRORLEVEL%
