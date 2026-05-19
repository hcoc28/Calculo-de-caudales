CREATE TABLE IF NOT EXISTS datos_cora (
  id BIGSERIAL PRIMARY KEY,
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
  CONSTRAINT datos_cora_fecha_hora_unique UNIQUE (fecha, hora)
);

GRANT ALL PRIVILEGES ON TABLE datos_cora TO caudales_user;
GRANT USAGE, SELECT ON SEQUENCE datos_cora_id_seq TO caudales_user;

CREATE INDEX IF NOT EXISTS idx_datos_cora_fecha_hora
ON datos_cora (fecha DESC, hora DESC);
