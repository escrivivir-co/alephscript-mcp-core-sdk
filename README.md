# AlephScript Core

Una librería Socket.IO avanzada para aplicaciones en tiempo real con características como namespaces, rooms, y broadcast automático.

## Instalación

```bash
npm install @alephscript/core
```

## Estructura del Monorepo

```
packages/
├── alephscript-core/           # La librería principal
│   ├── src/
│   │   ├── server/            # Clases del servidor
│   │   ├── client/            # Clases del cliente
│   │   ├── types/             # Definiciones de tipos
│   │   └── utils/             # Utilidades
│   └── package.json
└── socket-gym-demo/           # Aplicación demo
    ├── src/
    │   └── index.ts
    └── package.json
```

## Uso Básico

### Servidor

```typescript
import express from 'express';
import { createServer } from 'node:http';
import { AlephScriptServer } from '@alephscript/core';

const app = express();
const server = createServer(app);

// Crear servidor AlephScript
const as = new AlephScriptServer(server);

server.listen(6000, () => {
    console.log('Servidor ejecutándose en puerto 6000');
});
```

### Cliente

```typescript
import { AlephScriptClient } from '@alephscript/core';

// Crear cliente
const client = new AlephScriptClient(
    "MI_CLIENTE", 
    "http://localhost:6000", 
    "/runtime"
);

// Configurar triggers de inicialización
client.initTriggersDefinition.push(() => {
    client.io.on("SET_SERVER_STATE", (data) => {
        console.log("Estado del servidor:", data);
    });
    
    // Solicitar estado del servidor
    client.room("GET_SERVER_STATE");
});
```

## Características

### ✅ Namespaces Automáticos
- `/runtime` - Para operaciones en tiempo de ejecución
- `/admin` - Para administración (con UI dashboard)
- `/` - Namespace base

### ✅ Sistema Master-Room
- Protocolo GET/SET automático
- Forwarding de mensajes entre peers
- Gestión automática de rooms

### ✅ Broadcast Inteligente
- Auto-broadcast de eventos
- Filtrado de eventos del sistema
- Logging configurable

### ✅ Monitoreo Integrado
- Admin UI de Socket.IO incluida
- Métricas de conexiones en tiempo real
- Estado del servidor detallado

## Tipos Disponibles

```typescript
import { 
    IUserDetails, 
    IServerState, 
    RoomDetails,
    INamespaceDetails 
} from '@alephscript/core';
```

## Scripts de Desarrollo

```bash
# Compilar la librería
cd packages/alephscript-core
npm run build

# Ejecutar la demo
cd packages/socket-gym-demo
npm run dev

# Compilar todo el monorepo
npm run build
```

## Configuración TypeScript

La librería incluye definiciones de tipos completas. Para usar alias en tu proyecto:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@alephscript/core": ["./node_modules/@alephscript/core/dist"]
    }
  }
}
```

## Ejemplo Completo

Ver `packages/socket-gym-demo/src/index.ts` para un ejemplo completo de implementación.

## Licencia

ISC - Gonzalo Bechara Baladi
