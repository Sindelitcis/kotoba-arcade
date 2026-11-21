# Registra o link kotoba-local:// neste Windows, só para o seu usuário (HKCU, sem precisar de administrador).
# Com ele, o botão "Ligar a IA do meu PC" do site abre `node local/iniciar.mjs --site`: a mesma IA do
# `npm run local`, sem o fliperama em localhost. O navegador sempre pergunta antes de abrir o link.
#
# O que vier depois de kotoba-local:// é ignorado: o link só liga a IA, nunca roda outra coisa.
#
# Uso (na pasta do Kotoba Arcade):  powershell -ExecutionPolicy Bypass -File local\protocolo-instalar.ps1
# Para tirar:                       powershell -ExecutionPolicy Bypass -File local\protocolo-remover.ps1
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$iniciar = Join-Path $PSScriptRoot 'iniciar.mjs'
if (-not (Test-Path $iniciar)) { throw "Não achei $iniciar" }
$node = (Get-Command node -ErrorAction Stop).Source

$chave = 'HKCU:\Software\Classes\kotoba-local'
New-Item -Path $chave -Force | Out-Null
Set-ItemProperty -Path $chave -Name '(default)' -Value 'URL:Kotoba Arcade - IA do PC'
Set-ItemProperty -Path $chave -Name 'URL Protocol' -Value ''
New-Item -Path "$chave\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "$chave\DefaultIcon" -Name '(default)' -Value "`"$node`",0"
New-Item -Path "$chave\shell\open\command" -Force | Out-Null
# Sem %1 de propósito: nada do link chega no comando.
Set-ItemProperty -Path "$chave\shell\open\command" -Name '(default)' -Value "`"$node`" `"$iniciar`" --site"

Write-Host "Pronto: kotoba-local:// liga a IA do PC ($raiz)."
Write-Host "Teste: Start-Process 'kotoba-local://iniciar'"
