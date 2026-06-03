CREATE TABLE IF NOT EXISTS datos_cora (
  id BIGSERIAL PRIMARY KEY,
  planta TEXT NOT NULL DEFAULT 'cafetal',
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  nivel NUMERIC(10, 2),
  qe NUMERIC(10, 2),
  qs NUMERIC(10, 2),
  qv NUMERIC(10, 2),
  potencia_activa NUMERIC(10, 2),
  clima TEXT,
  datos_originales JSONB,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT datos_cora_planta_fecha_hora_unique UNIQUE (planta, fecha, hora)
);

ALTER TABLE datos_cora
ADD COLUMN IF NOT EXISTS planta TEXT NOT NULL DEFAULT 'cafetal';

ALTER TABLE datos_cora
DROP CONSTRAINT IF EXISTS datos_cora_fecha_hora_unique;

GRANT ALL PRIVILEGES ON TABLE datos_cora TO caudales_user;
GRANT USAGE, SELECT ON SEQUENCE datos_cora_id_seq TO caudales_user;

CREATE INDEX IF NOT EXISTS idx_datos_cora_fecha_hora
ON datos_cora (planta, fecha DESC, hora DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_datos_cora_planta_fecha_hora_unique
ON datos_cora (planta, fecha, hora);
