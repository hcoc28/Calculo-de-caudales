CREATE DATABASE calculo_caudales;

CREATE USER caudales_user WITH PASSWORD 'tu_password_seguro';

GRANT ALL PRIVILEGES ON DATABASE calculo_caudales TO caudales_user;

-- Desde PostgreSQL 15, el privilegio CREATE sobre el esquema "public" ya no viene
-- incluido en ALL PRIVILEGES ON DATABASE. Sin esto, el backend no puede crear
-- ni alterar sus tablas (datos_cora, proyecciones) al arrancar.
\connect calculo_caudales
GRANT ALL ON SCHEMA public TO caudales_user;
