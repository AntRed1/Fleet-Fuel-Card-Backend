# Fleet Fuel Card - Backend API

Backend profesional y escalable para la gestión de tarjeta de flotilla de TotalEnergies.

## 🚀 Características

- **RESTful API** completa con Express.js
- **Base de datos SQLite** con mejor-sqlite3 para alto rendimiento
- **Gestión de imágenes** con Multer para comprobantes de pago
- **Seguridad** con Helmet, CORS y Rate Limiting
- **Validación** de datos con Zod
- **Arquitectura modular** y escalable

## 📋 Requisitos

- Node.js >= 18.x
- npm >= 9.x

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Inicializar base de datos y cargar gasolineras
npm run init-db
node src/scripts/initStations.js
```

## 🏃 Ejecución

```bash
# Modo desarrollo con auto-reload
npm run dev

# Modo producción
npm start
```

## 📡 Endpoints API

### Configuración de Tarjeta
- `GET /api/config` - Obtener configuración actual
- `PUT /api/config` - Actualizar configuración

### Gasolineras
- `GET /api/stations` - Listar todas las gasolineras
- `GET /api/stations?zone=Distrito Nacional` - Filtrar por zona
- `GET /api/stations/:id` - Obtener gasolinera específica
- `POST /api/stations` - Crear nueva gasolinera
- `POST /api/stations/bulk` - Crear múltiples gasolineras

### Gastos de Combustible
- `GET /api/expenses` - Listar todos los gastos
- `GET /api/expenses?cycle_id=2025-02` - Filtrar por ciclo
- `GET /api/expenses?start_date=2025-01-01&end_date=2025-01-31` - Filtrar por rango de fechas
- `GET /api/expenses/:id` - Obtener gasto específico
- `POST /api/expenses` - Crear nuevo gasto (con imagen opcional)
- `PUT /api/expenses/:id` - Actualizar gasto
- `DELETE /api/expenses/:id` - Eliminar gasto
- `GET /api/expenses/stats/:cycle_id` - Obtener estadísticas del ciclo

### Archivos
- `GET /uploads/:filename` - Obtener imagen de comprobante

## 📦 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # Configuración de SQLite
│   ├── controllers/
│   │   └── index.js          # Controladores de la API
│   ├── middleware/
│   │   └── upload.js         # Middleware para manejo de archivos
│   ├── models/
│   │   └── index.js          # Modelos de datos
│   ├── routes/
│   │   └── index.js          # Definición de rutas
│   ├── scripts/
│   │   └── initStations.js   # Script de inicialización
│   └── server.js             # Servidor principal
├── data/
│   └── fleet-fuel.db         # Base de datos SQLite
├── uploads/                  # Directorio de imágenes
├── .env                      # Variables de entorno
└── package.json
```

## 🗄️ Esquema de Base de Datos

### card_config
- `id`: INTEGER (PK)
- `monthly_limit`: REAL
- `cutoff_start_day`: INTEGER
- `cutoff_end_day`: INTEGER
- `recharge_day`: INTEGER
- `created_at`: TEXT
- `updated_at`: TEXT

### gas_stations
- `id`: INTEGER (PK)
- `name`: TEXT
- `address`: TEXT
- `zone`: TEXT
- `province`: TEXT
- `lat`: REAL (nullable)
- `lng`: REAL (nullable)
- `created_at`: TEXT

### fuel_expenses
- `id`: INTEGER (PK)
- `amount`: REAL
- `date`: TEXT
- `station_id`: INTEGER (FK)
- `cycle_id`: TEXT
- `notes`: TEXT (nullable)
- `receipt_image`: TEXT (nullable)
- `created_at`: TEXT
- `updated_at`: TEXT

## 🔐 Seguridad

- Helmet para headers HTTP seguros
- CORS configurado
- Rate limiting (100 requests/15 min)
- Validación de tipos de archivo
- Tamaño máximo de archivo: 5MB

## 🌍 Variables de Entorno

```env
PORT=8080
NODE_ENV=development
DB_PATH=./data/fleet-fuel.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📝 Ejemplo de Uso

### Crear un gasto con imagen

```bash
curl -X POST http://localhost:8080/api/expenses \
  -F "amount=3500" \
  -F "date=2025-02-11" \
  -F "station_id=1" \
  -F "cycle_id=2025-02" \
  -F "notes=Tanque lleno" \
  -F "receipt=@/path/to/receipt.jpg"
```

### Actualizar configuración

```bash
curl -X PUT http://localhost:8080/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_limit": 12000,
    "cutoff_start_day": 29,
    "cutoff_end_day": 2,
    "recharge_day": 3
  }'
```

## 🚀 Despliegue

Para producción, considera:
- Usar PostgreSQL o MySQL en lugar de SQLite
- Implementar autenticación JWT
- Agregar logging con Winston
- Usar PM2 para gestión de procesos
- Configurar HTTPS con Let's Encrypt
- Implementar backup automático de base de datos

## 📄 Licencia

MIT
