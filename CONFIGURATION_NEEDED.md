# CONFIGURACIÓN PENDIENTE PARA COMPLETAR EL VAULT MONITOR

## 📋 **INFORMACIÓN REQUERIDA**

### **1. Direcciones de Contratos**
```bash
# Por favor completa estas direcciones:
HYPE_VAULT_ADDRESS=0x________________  # ¿Cuál es la dirección de tu vault principal?
HYPE_TOKEN_ADDRESS=0x________________  # ¿Dirección del token HYPE?
STHYPE_TOKEN_ADDRESS=0x______________  # ¿Dirección del token stHYPE?

# Base Chain addresses conocidas:
USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913  # USDC en Base
WETH_ADDRESS=0x4200000000000000000000000000000000000006  # WETH en Base
```

### **2. ABI del Vault Contract**
```json
// ¿Puedes proporcionar el ABI completo de tu vault?
// O al menos estas funciones específicas:

[
  {
    "name": "totalAssets",        // ¿Existe esta función?
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "uint256"}]
  },
  {
    "name": "???",              // ¿Cómo se llama tu función para total borrowed?
    "type": "function",
    "stateMutability": "view", 
    "inputs": [],
    "outputs": [{"type": "uint256"}]
  },
  {
    "name": "???",              // ¿Hay función para obtener APY?
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "uint256"}]
  }
]
```

### **3. IDs de CoinGecko** 
```bash
# ¿Cuáles son los IDs correctos en CoinGecko para tus tokens?
# Puedes buscarlos en: https://api.coingecko.com/api/v3/coins/list

HYPE_COINGECKO_ID=hyperliquid          # ¿Es correcto?
STHYPE_COINGECKO_ID=staked-hyperliquid # ¿Es correcto?

# O si no están en CoinGecko, ¿qué DEX usar para precios?
```

### **4. Configuración de Red**
```bash
# ¿Confirmas que está en Base Mainnet?
CHAIN_ID=8453                    # Base Mainnet
RPC_URL=https://mainnet.base.org # ¿Prefieres otro RPC?

# ¿Alguna red adicional? (Arbitrum, Ethereum, etc.)
```

### **5. Lógica de Negocio Específica**
```typescript
// ¿Cómo calculas estas métricas en tu protocolo?

// Health Factor:
// - ¿Qué fórmula usas?
// - ¿Cuál es el liquidation threshold? (80%? 85%?)

// Leverage Ratio:  
// - ¿Cómo se define en tu protocolo?
// - ¿Es simplemente totalStaked / (totalStaked - totalBorrowed)?

// APY Calculation:
// - ¿Incluye staking rewards?
// - ¿Resta borrowing costs?
// - ¿Hay fees del protocolo?
```

### **6. APIs y Servicios Externos**
```bash
# ¿Prefieres algún proveedor específico?

# Para precios:
PRICE_PROVIDER=coingecko    # coingecko, 1inch, defillama, multiple
ONEINCH_API_KEY=           # Si usas 1inch
COINGECKO_API_KEY=         # Si usas CoinGecko Pro

# Para datos DeFi:
DEFILLAMA_PROTOCOL_ID=     # ¿Tu protocolo está en DefiLlama?
```

---

## 🔧 **PRÓXIMOS PASOS**

1. **Completa las direcciones** de contratos arriba
2. **Proporciona el ABI** del vault o las funciones específicas
3. **Confirma los IDs** de CoinGecko o proveedores de precios alternativos
4. **Explica la lógica** específica de cálculo de métricas
5. **Crea archivo .env** con la configuración real

Una vez tengas esta información, puedo:
- ✅ Actualizar todas las direcciones hardcodeadas
- ✅ Implementar las llamadas reales a contratos
- ✅ Configurar APIs de precios correctas
- ✅ Ajustar cálculos de métricas a tu protocolo específico
- ✅ Hacer que todo funcione con datos reales

¿Puedes empezar proporcionando las direcciones de contratos y confirmar si están en Base Mainnet?
