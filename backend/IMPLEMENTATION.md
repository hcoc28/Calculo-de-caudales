# Backend - Servidor API para Cálculo de Caudales

Este directorio está preparado para hospedar la API backend del proyecto.

## 📦 Estructura Propuesta

```
backend/
├── server.js              # Punto de entrada principal
├── package.json          # Dependencias
├── .env                  # Variables de entorno
├── routes/
│   ├── climate.js       # Rutas de clima
│   └── simulation.js    # Rutas de simulación
├── controllers/
│   ├── climateController.js
│   └── simulationController.js
├── services/
│   ├── climateService.js
│   └── calculationService.js
├── middleware/
│   ├── errorHandler.js
│   └── logger.js
├── config/
│   └── config.js
└── tests/
    ├── climate.test.js
    └── simulation.test.js
```

## 🚀 Endpoints Propuestos

### Climate
```
GET /api/climate
  Parámetros: lat, lon
  Respuesta: Datos climáticos actuales y pronóstico
```

### Simulation
```
POST /api/simulation
  Body: { initialLevel, baseFlow, climateData? }
  Respuesta: Resultados de simulación de 24h

GET /api/simulation/:id
  Respuesta: Simulación guardada

PUT /api/simulation/:id
  Body: { resultados actualizados }
  Respuesta: Simulación actualizada

DELETE /api/simulation/:id
  Respuesta: Confirmación de eliminación

GET /api/simulations
  Parámetros: limit, offset
  Respuesta: Lista de simulaciones
```

### Reports
```
GET /api/report/:simulationId
  Parámetros: format (pdf, excel, json)
  Respuesta: Reporte en formato solicitado
```

## 🛠️ Stack Recomendado

### Opción 1: Node.js + Express (Recomendado)
```bash
npm init -y
npm install express dotenv cors axios mongoose
npm install -D nodemon jest
```

**Archivo: server.js**
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/climate', require('./routes/climate'));
app.use('/api/simulation', require('./routes/simulation'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

### Opción 2: Python + Flask
```bash
pip install flask flask-cors python-dotenv requests
```

**Archivo: server.py**
```python
from flask import Flask, jsonify, request
from flask_cors import CORS
from climate_service import get_climate_data
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

@app.route('/api/climate', methods=['GET'])
def climate():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    data = get_climate_data(lat, lon)
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=int(os.getenv('PORT', 3000)))
```

## 🔐 Variables de Entorno (.env)

```
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=caudales
DB_USER=usuario
DB_PASSWORD=contraseña

# Third-party APIs
OPENMETEO_URL=https://api.open-meteo.com/v1/forecast
CACHE_TTL=600
```

## 📡 Migración del Código Frontend

### Paso 1: Crear climateService.js en Backend
```javascript
// backend/services/climateService.js
const axios = require('axios');

const OPENMETEO_URL = process.env.OPENMETEO_URL || 
  'https://api.open-meteo.com/v1/forecast';

async function getClimateData(latitude, longitude) {
  const params = {
    latitude,
    longitude,
    timezone: 'auto',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
    forecast_days: '1'
  };

  try {
    const response = await axios.get(OPENMETEO_URL, { params });
    return response.data;
  } catch (error) {
    throw new Error(`Climate API error: ${error.message}`);
  }
}

module.exports = { getClimateData };
```

### Paso 2: Crear climateController.js
```javascript
// backend/controllers/climateController.js
const { getClimateData } = require('../services/climateService');

async function getClimate(req, res, next) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const data = await getClimateData(lat, lon);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { getClimate };
```

### Paso 3: Crear ruta en climate.js
```javascript
// backend/routes/climate.js
const express = require('express');
const router = express.Router();
const { getClimate } = require('../controllers/climateController');

router.get('/', getClimate);

module.exports = router;
```

### Paso 4: Actualizar Frontend (api.js)
```javascript
// frontend/js/api.js
import { LOCATION, MANDATORY_HOURS } from './config.js';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

export async function fetchClimateData() {
  const { latitude, longitude } = LOCATION;
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/climate?lat=${latitude}&lon=${longitude}`
    );
    if (!response.ok) {
      throw new Error(`Climate API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching climate data:', error);
    throw error;
  }
}

// Resto de funciones sin cambios...
```

## 🧪 Testing

```bash
npm test
```

**Ejemplo: climate.test.js**
```javascript
const request = require('supertest');
const app = require('../server');

describe('Climate API', () => {
  it('should get climate data', async () => {
    const res = await request(app)
      .get('/api/climate')
      .query({ lat: 15.14, lon: -90.07 });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('current');
  });
});
```

## 📈 Escalabilidad

Para producción:
- [ ] Implementar caché Redis
- [ ] Rate limiting con express-rate-limit
- [ ] Compresión GZIP
- [ ] HTTP/2
- [ ] PM2 para gestionar procesos
- [ ] Nginx como reverse proxy
- [ ] SSL/TLS certificates
- [ ] Base de datos (PostgreSQL/MongoDB)
- [ ] Autenticación JWT

## 🚀 Deploy

### Heroku
```bash
heroku create nombre-app
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Recursos

- [Express.js](https://expressjs.com/)
- [Flask](https://flask.palletsprojects.com/)
- [Open-Meteo API](https://open-meteo.com/)
- [REST API Best Practices](https://restfulapi.net/)

---

**Estado**: Listo para implementación
**Prioridad**: Medio (funciona primero en frontend)
**Tiempo estimado**: 2-3 horas de desarrollo