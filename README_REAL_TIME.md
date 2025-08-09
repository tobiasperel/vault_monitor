# SISTEMA DE MONITOREO EN TIEMPO REAL - SIN SIMULACIONES

## 🚀 DATOS REALES ÚNICAMENTE

Este sistema está configurado para obtener **SOLO DATOS REALES** sin simulaciones ni mocks.

### ⚡ Inicio Rápido - Monitoreo Continuo

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus claves reales

# INICIAR MONITOREO EN TIEMPO REAL
npm run real-time
```

### 📊 Características del Sistema

- ✅ **Precios reales** desde CoinGecko API
- ✅ **Datos de DEXs** desde Uniswap V3 y Aerodrome
- ✅ **Actualización automática** cada 60 segundos
- ✅ **Análisis de riesgo** cada 5 minutos
- ✅ **Métricas de salud** cada 15 minutos
- ❌ **Sin simulaciones**
- ❌ **Sin datos mock**

### 🔧 Comandos Disponibles

```bash
# Monitoreo en tiempo real (principal)
npm run real-time
npm run monitor-live
npm run no-mocks

# Scripts de verificación
npm run verify-config
npm run verify-hype-token
npm run search-real-hype

# APIs y servicios
npm run hype-api
npm run hype-jobs
npm run dev-hype
```

### 📈 Fuentes de Datos Reales

1. **Precios de Tokens**:
   - CoinGecko API (precio confirmado: $41.25 HYPE)
   - 1inch API
   - DefiLlama API

2. **Datos de DEXs**:
   - Uniswap V3 (Ethereum y Base)
   - Aerodrome (Base)
   - SushiSwap

3. **Blockchain Data**:
   - Base Chain (8453)
   - Ethereum Mainnet
   - Viem RPC clients

### 🎯 Configuración de Red

```javascript
// Base Chain (Principal)
Chain ID: 8453
RPC: https://mainnet.base.org

// Ethereum (Respaldo)
Chain ID: 1
RPC: https://eth.llamarpc.com
```

### 💾 Base de Datos

El sistema utiliza Supabase para almacenar:
- Historial de precios
- Métricas de riesgo
- Salud del vault
- Evaluaciones automáticas

### 🔄 Flujo de Actualización

```
60s  → Actualización de precios
5min → Análisis de riesgo completo
15min → Métricas de salud del vault
```

### ⚠️ Eliminación Completa de Mocks

Todas las funciones de simulación han sido eliminadas:
- ❌ `generateMockPriceData()`
- ❌ `getTokenPrice()` con fallbacks
- ❌ Datos hardcodeados
- ✅ Solo APIs reales
- ✅ Solo datos blockchain

### 🛠️ Troubleshooting

Si encuentras errores:

1. **Verificar configuración**:
   ```bash
   npm run verify-config
   ```

2. **Validar token HYPE**:
   ```bash
   npm run verify-hype-token
   ```

3. **Buscar direcciones reales**:
   ```bash
   npm run search-real-hype
   ```

### 📱 Dashboard

Accede al dashboard en tiempo real:
```bash
npm run hype-api
# Abre http://localhost:3001
```

### 🔐 Configuración de Seguridad

```bash
# .env (requerido)
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_key
BASE_RPC_URL=https://mainnet.base.org
ETHEREUM_RPC_URL=https://eth.llamarpc.com
COINGECKO_API_KEY=tu_api_key_opcional
```

### 📊 Monitoreo de Estado

El sistema reporta en tiempo real:
- Precio actual de HYPE
- Volatilidad (24h)
- Liquidez de DEXs
- Ratio de colateralización
- Tasa de utilización
- Score de riesgo general

### 🚨 Alertas Automáticas

El sistema genera alertas cuando:
- El precio cambia >10% en 1h
- Liquidez <$100k
- Ratio colateral <120%
- Utilización >90%
- Score riesgo >80

---

## 📝 Notas Importantes

- **SOLO DATOS REALES**: No hay simulaciones ni mocks
- **ACTUALIZACIÓN CONTINUA**: Los datos se actualizan automáticamente
- **MULTI-CHAIN**: Soporte para Base y Ethereum
- **ALTA PRECISIÓN**: Múltiples fuentes de precios para validación
