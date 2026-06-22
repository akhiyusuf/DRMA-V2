-- ============================================
-- Stock RPC Functions (atomic operations)
-- ============================================

-- Decrement stock atomically (only if enough stock available)
-- Returns: { success: boolean, new_quantity: integer }
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id TEXT, p_quantity INT)
RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_new_qty INT;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- If stock_quantity is -1, it means "not tracked / infinite"
  IF v_product.stock_quantity IS NULL OR v_product.stock_quantity = -1 THEN
    RETURN jsonb_build_object('success', true, 'new_quantity', -1, 'tracked', false);
  END IF;

  v_new_qty := v_product.stock_quantity - p_quantity;

  -- Prevent negative stock
  IF v_new_qty < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock', 'current_quantity', v_product.stock_quantity);
  END IF;

  -- Update the product
  UPDATE products
  SET stock_quantity = v_new_qty,
      in_stock = (v_new_qty > 0)
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'new_quantity', v_new_qty, 'tracked', true);
END;
$$ LANGUAGE plpgsql;

-- Increment stock atomically (used when orders are cancelled/refunded)
-- Returns: { success: boolean, new_quantity: integer }
CREATE OR REPLACE FUNCTION increment_stock(p_product_id TEXT, p_quantity INT)
RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_new_qty INT;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- If stock_quantity is -1 (not tracked), leave it
  IF v_product.stock_quantity IS NULL OR v_product.stock_quantity = -1 THEN
    RETURN jsonb_build_object('success', true, 'new_quantity', -1, 'tracked', false);
  END IF;

  v_new_qty := v_product.stock_quantity + p_quantity;

  UPDATE products
  SET stock_quantity = v_new_qty,
      in_stock = (v_new_qty > 0)
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'new_quantity', v_new_qty, 'tracked', true);
END;
$$ LANGUAGE plpgsql;

-- Check stock availability for multiple items at once
-- Returns: { available: boolean, items: [{ product_id, requested, available, sufficient }] }
CREATE OR REPLACE FUNCTION check_stock_availability(p_items JSONB)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_item JSONB;
  v_product RECORD;
  v_all_available BOOLEAN := true;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_item->>'product_id';

    IF NOT FOUND THEN
      v_result := v_result || jsonb_build_object(
        'product_id', v_item->>'product_id',
        'requested', (v_item->>'quantity')::INT,
        'available', 0,
        'sufficient', false,
        'error', 'Product not found'
      );
      v_all_available := false;
    ELSIF v_product.stock_quantity IS NULL OR v_product.stock_quantity = -1 THEN
      -- Not tracked = always available
      v_result := v_result || jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'requested', (v_item->>'quantity')::INT,
        'available', -1,
        'sufficient', true
      );
    ELSIF v_product.stock_quantity < (v_item->>'quantity')::INT THEN
      v_result := v_result || jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'requested', (v_item->>'quantity')::INT,
        'available', v_product.stock_quantity,
        'sufficient', false
      );
      v_all_available := false;
    ELSE
      v_result := v_result || jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'requested', (v_item->>'quantity')::INT,
        'available', v_product.stock_quantity,
        'sufficient', true
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('available', v_all_available, 'items', v_result);
END;
$$ LANGUAGE plpgsql;