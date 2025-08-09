# Guía para Implementación Real del Vault Monitor

## 🔧 **Pasos para convertir mocks en datos reales**

### **1. Configuración de Blockchain**

#### **A. Obtener RPC URL**
```bash
# Opciones gratuitas
https://mainnet.base.org                           # Base oficial (limitado)
https://base-rpc.publicnode.com                    # Public Node
https://base.meowrpc.com                          # MeowRPC

# Opciones pagadas (recomendadas para producción)
https://base-mainnet.g.alchemy.com/v2/API_KEY    # Alchemy
https://base-mainnet.infura.io/v3/PROJECT_ID     # Infura
```

#### **B. Obtener direcciones de contratos**
```typescript
// Necesitas las direcciones reales de:
HYPE_VAULT_ADDRESS=0x...        // Tu vault principal
HYPE_TOKEN_ADDRESS=0x...        // Token HYPE
STHYPE_TOKEN_ADDRESS=0x...      // Token stHYPE stakeado
```

### **2. Configuración de APIs de Precios**

#### **A. CoinGecko (Gratis hasta 50 llamadas/min)**
```bash
# Regístrate en: https://www.coingecko.com/api
COINGECKO_API_KEY=your_api_key_here
```

#### **B. 1inch Price API (Gratis hasta 1000 llamadas/día)**
```bash  
# Regístrate en: https://portal.1inch.dev/
ONEINCH_API_KEY=your_api_key_here
```

#### **C. DefiLlama API (Gratis)**
```bash
# No requiere API key, pero tiene límites de rate
# URL: https://api.llama.fi/
```

### **3. Obtener ABIs de Contratos**

#### **A. Desde Etherscan/Basescan**
```bash
# Ve a: https://basescan.org/address/YOUR_CONTRACT_ADDRESS
# Clic en "Contract" tab
# Copia el ABI desde "Contract ABI" section
```

#### **B. Desde el repositorio del proyecto**
```bash
# Si tienes acceso al código fuente:
# Los ABIs suelen estar en: 
./artifacts/contracts/YourContract.sol/YourContract.json
```

#### **C. Usando herramientas**
```bash
# Con cast (Foundry)
cast interface 0xYOUR_CONTRACT_ADDRESS

# Con abi-decoder online
# https://abi.w1nt3r.xyz/
```

### **4. Actualizar el código**

#### **A. Reemplazar el ABI de ejemplo**
```typescript
// En src/scripts/hypeVaultMonitor.ts línea ~140
const vaultAbi = [
  // Reemplaza con tu ABI real del contrato
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  // ... más funciones de tu contrato
] as const;
```

#### **B. Agregar funciones específicas de tu protocolo**
```typescript
// Ejemplos de funciones que podrías necesitar:
{
  name: 'totalBorrowed',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ type: 'uint256' }]
},
{
  name: 'getUserHealthFactor',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'user', type: 'address' }],
  outputs: [{ type: 'uint256' }]
}
```

### **5. Configurar variables de entorno**

#### **A. Copia el archivo de ejemplo**
```bash
cp .env.example .env
```

#### **B. Completa todas las variables**
```bash
# Edita .env con tus valores reales
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
HYPE_VAULT_ADDRESS=0xYourVaultAddress
RPC_URL=https://your-rpc-url
ONEINCH_API_KEY=your_api_key
```

### **6. Testing**

#### **A. Probar conexión a blockchain**
```bash
npm run test-rpc
```

#### **B. Probar llamadas a contratos**
```bash
# Crea un script de prueba
npm run typecheck  # Verificar tipos
npm run hype-monitor  # Ejecutar monitor
```

### **7. Debugging común**

#### **A. Error de ABI**
```
Error: Function not found in ABI
```
**Solución**: Verifica que el ABI contenga la función que estás llamando

#### **B. Error de RPC**
```
Error: could not detect network
```
**Solución**: Verifica la URL del RPC y que tenga acceso a internet

#### **C. Error de dirección**
```
Error: invalid address
```
**Solución**: Verifica que las direcciones sean válidas y tengan el prefijo `0x`

### **8. APIs alternativas**

#### **A. Para precios**
```typescript
// CoinMarketCap
const cmcResponse = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
  headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY }
});

// CryptoCompare  
const ccResponse = await axios.get('https://min-api.cryptocompare.com/data/price', {
  params: { fsym: 'HYPE', tsyms: 'USD', api_key: process.env.CRYPTOCOMPARE_API_KEY }
});
```

#### **B. Para datos DeFi**
```typescript
// DefiLlama TVL
const tvlResponse = await axios.get('https://api.llama.fi/protocol/your-protocol');

// DefiPulse (requiere suscripción)
const pulseResponse = await axios.get('https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json');
```

### **9. Monitoreo de producción**

#### **A. Agregar logs estructurados**
```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Vault metrics fetched',
  data: { totalStaked, healthFactor }
}));
```

#### **B. Alertas por email/SMS**
```typescript
// Integración con SendGrid, Twilio, etc.
if (healthFactor < 1.1) {
  await sendCriticalAlert(metrics);
}
```

### **10. Optimizaciones**

#### **A. Batch de llamadas**
```typescript
// Usar multicall para optimizar llamadas
const multicallResults = await publicClient.multicall({
  contracts: [
    { address: vaultAddress, abi: vaultAbi, functionName: 'totalAssets' },
    { address: vaultAddress, abi: vaultAbi, functionName: 'totalSupply' },
    { address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [vaultAddress] }
  ]
});
```

#### **B. Cache de precios**
```typescript
// Cachear precios por algunos minutos
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
```

## 🚀 **Resultado final**

Una vez implementado correctamente tendrás:
- ✅ Datos reales de blockchain en tiempo real
- ✅ Precios actualizados de múltiples fuentes
- ✅ Métricas de riesgo precisas
- ✅ Alertas automáticas funcionales
- ✅ Dashboard con datos en vivo
- ✅ API para integraciones externas
