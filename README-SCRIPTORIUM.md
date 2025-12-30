# mcp-core-sdk — Integración con ALEPH Scriptorium

> **Submódulo**: `mcp-core-sdk`  
> **Padre directo**: MCPGallery  
> **Consumidores**: mcp-mesh-sdk, NovelistEditor  
> **Rama de integración**: `integration/beta/scriptorium`  
> **Versión**: 1.0.0  
> **Fecha**: 2025-12-30

---

## 🎯 Propósito

Biblioteca core que proporciona:
- **BaseMCPServer**: Clase base para crear servidores MCP compatibles con `@modelcontextprotocol/sdk`
- **AlephScriptServer**: Servidor WebSocket (Socket.IO) para comunicación real-time
- **AlephScriptClient**: Cliente para tests y depuración

---

## 🏗️ Arquitectura del Submódulo

```
mcp-core-sdk/
├── src/
│   ├── server/     # AlephScriptServer (Socket.IO)
│   ├── client/     # AlephScriptClient
│   ├── types/      # Interfaces TypeScript
│   └── utils/      # Utilidades
├── dist/           # Build compilado
└── scripts/        # Scripts de desarrollo
```

---

## Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Socket.IO | ^4.x | Comunicación real-time |
| TypeScript | ^5.x | Tipado estático |
| Express | ^4.x | HTTP server base |
| Node.js | >=18 | Runtime |

---

## Rol en NovelistEditor

Este módulo proporciona la **capa de transporte** para el servidor MCP de NovelistEditor:

| Componente | Función |
|------------|---------|
| `AlephScriptServer` | WebSocket server para herramientas MCP |
| `AlephScriptClient` | Cliente para tests y depuración |
| Namespaces | `/runtime` (operaciones), `/admin` (dashboard) |

---

## Mapeo Ontológico

| mcp-core-sdk | NovelistEditor | Scriptorium |
|--------------|----------------|-------------|
| `AlephScriptServer` | MCP Server (3066) | @escritor herramientas |
| Rooms | Novelas/Capítulos | Contenedores de memoria |
| Events | CRUD operations | `alephAlpha_*` tools |

---

## Dependencias Externas

```bash
# Instalar dependencias
cd mcp-core-sdk
npm install

# Compilar
npm run build
```

---

## Supuestos y Gaps

### Supuestos
- El servidor MCP de NovelistEditor usa este SDK como base
- Puerto por defecto: 3066
- Protocolo: WebSocket sobre HTTP

### Gaps identificados
- [ ] Documentar integración con herramientas MCP específicas
- [ ] Tests de integración con NovelistEditor
- [ ] Sincronización de tipos con `novel-data.json`

---

## Uso desde NovelistEditor

```typescript
// En el servidor MCP de NovelistEditor
import { AlephScriptServer } from './mcp-core-sdk';

const server = new AlephScriptServer(httpServer);
// Las herramientas alephAlpha_* usan este transporte
```

---

## Changelog de Integración

| Fecha | Cambio | Commit |
|-------|--------|--------|
| 2025-12-28 | Crear rama integration/beta/scriptorium | — |
| 2025-12-28 | Añadir README-SCRIPTORIUM.md | — |
