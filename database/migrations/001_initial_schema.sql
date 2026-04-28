-- Ethiopian Marketplace - Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT UNIQUE,
  phone        TEXT UNIQUE,
  password_hash TEXT,
  role         TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
  business_name     TEXT,
  business_category TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  price_etb   NUMERIC(12,2) NOT NULL,
  category    TEXT NOT NULL,
  images      TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id       UUID NOT NULL REFERENCES users(id),
  seller_id      UUID NOT NULL REFERENCES users(id),
  total_etb      NUMERIC(12,2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending_payment'
                   CHECK (status IN ('pending_payment','paid','shipped','delivered','cancelled')),
  payment_method TEXT NOT NULL
                   CHECK (payment_method IN ('telebirr','cbe_birr','bank_transfer')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  unit_price_etb NUMERIC(12,2) NOT NULL
);

CREATE TABLE otp_records (
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
  user_id    UUID PRIMARY KEY REFERENCES users(id),
  items      JSONB NOT NULL DEFAULT '[]'
);
