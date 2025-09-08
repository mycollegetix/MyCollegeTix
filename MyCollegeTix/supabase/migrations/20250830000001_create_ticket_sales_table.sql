-- Create ticket_sales table to store information about completed sales
CREATE TABLE public.ticket_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Core references
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Sale information
  buyer_name text NOT NULL CHECK (char_length(buyer_name) >= 1 AND char_length(buyer_name) <= 100),
  sale_price numeric NOT NULL CHECK (sale_price >= 0),
  
  -- Optional additional information
  payment_method text CHECK (char_length(payment_method) <= 50),
  sale_platform text CHECK (char_length(sale_platform) <= 50),
  additional_notes text CHECK (char_length(additional_notes) <= 500),
  
  -- Metadata
  original_asking_price numeric, -- Store original price for comparison
  
  CONSTRAINT ticket_sales_pkey PRIMARY KEY (id)
);

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_sales TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS and add policies
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;

-- Policy: Sellers can insert their own sale records
CREATE POLICY "Sellers can insert their own sales" ON public.ticket_sales
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = seller_id);

-- Policy: Sellers can view their own sale records
CREATE POLICY "Sellers can view their own sales" ON public.ticket_sales
  FOR SELECT TO authenticated 
  USING (auth.uid() = seller_id);

-- Policy: Admins can view all sale records
CREATE POLICY "Admins can view all sales" ON public.ticket_sales
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create index for better performance
CREATE INDEX idx_ticket_sales_ticket_id ON public.ticket_sales(ticket_id);
CREATE INDEX idx_ticket_sales_seller_id ON public.ticket_sales(seller_id);
CREATE INDEX idx_ticket_sales_created_at ON public.ticket_sales(created_at);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_ticket_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_sales_updated_at
  BEFORE UPDATE ON public.ticket_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_sales_updated_at();