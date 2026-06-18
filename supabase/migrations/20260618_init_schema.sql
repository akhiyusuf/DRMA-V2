-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[], -- Storing tags as an array for simplicity
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media/Images Table
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS Homepage Configuration
CREATE TABLE cms_homepage (
    id SERIAL PRIMARY KEY,
    hero_title TEXT,
    hero_description TEXT,
    hero_image_id UUID REFERENCES media(id),
    mission_title TEXT,
    mission_description TEXT,
    mission_image_id UUID REFERENCES media(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Featured Products Junction Table
CREATE TABLE cms_featured_products (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    PRIMARY KEY (product_id)
);

-- Differentiation Points (Normalized)
CREATE TABLE cms_differentiation_points (
    id SERIAL PRIMARY KEY,
    number TEXT,
    title TEXT,
    description TEXT,
    display_order INT DEFAULT 0
);
