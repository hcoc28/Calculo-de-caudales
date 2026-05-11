# Backend - Cálculo de Caudales

Esta carpeta está reservada para los servicios backend del proyecto.

## 📋 Planes Futuros

- [ ] API REST con Node.js / Express o Python / Flask
- [ ] Base de datos para almacenar simulaciones
- [ ] Autenticación de usuarios
- [ ] Sistema de reportes automáticos
- [ ] Integración con sistemas SCADA
- [ ] WebSockets para actualizaciones en tiempo real

## 🏗️ Estructura Propuesta

```
backend/
├── api/              # Endpoints de API
├── models/           # Modelos de datos
├── services/         # Lógica de negocio
├── config/           # Configuración
├── middleware/       # Middleware
└── tests/            # Pruebas
```

## 🔧 Stack Sugerido

### Opción 1: Node.js
```bash
npm init -y
npm install express dotenv cors
```

### Opción 2: Python
```bash
pip install flask flask-cors python-dotenv
```

## 📌 Endpoints Sugeridos

- `POST /api/simulations` - Crear nueva simulación
- `GET /api/simulations/:id` - Obtener simulación
- `PUT /api/simulations/:id` - Actualizar simulación
- `DELETE /api/simulations/:id` - Eliminar simulación
- `GET /api/simulations` - Listar simulaciones
- `GET /api/reports/:id` - Generar reporte

## 🔐 Seguridad

- Validación de entrada
- Rate limiting
- CORS configurado
- Variables de entorno para secretos
- Autenticación JWT

---

Espera instrucciones para comenzar el desarrollo del backend.