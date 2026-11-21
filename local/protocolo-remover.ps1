# Tira o link kotoba-local:// deste Windows (o que o protocolo-instalar.ps1 registrou).
# Uso: powershell -ExecutionPolicy Bypass -File local\protocolo-remover.ps1
$chave = 'HKCU:\Software\Classes\kotoba-local'
if (Test-Path $chave) {
  Remove-Item -Path $chave -Recurse -Force
  Write-Host 'Removido: o botão "Ligar a IA do meu PC" do site não abre mais nada.'
} else {
  Write-Host 'Nada para remover: kotoba-local:// não estava registrado.'
}
