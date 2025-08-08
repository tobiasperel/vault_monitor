#!/bin/bash
# Script para ejecutar el monitor HYPE desde el directorio correcto

echo "Iniciando monitor HYPE..."
echo "Directorio actual: $(pwd)"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "Error: No estás en el directorio vault_monitor"
    echo "Ejecuta: cd /media/tobias/WDBlue/Programacion/trabajo/assigment/vault_monitor"
    exit 1
fi

# Verificar que el archivo existe
if [ ! -f "src/scripts/hypeVaultMonitor.ts" ]; then
    echo "Error: No se encuentra src/scripts/hypeVaultMonitor.ts"
    ls -la src/scripts/
    exit 1
fi

echo "Archivo encontrado, ejecutando monitor..."
npx tsx src/scripts/hypeVaultMonitor.ts
