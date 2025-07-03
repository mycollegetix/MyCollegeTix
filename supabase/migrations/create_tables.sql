-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT UNIQUE NOT NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create tickets table
CREATE TABLE tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'sold', 'cancelled')) DEFAULT 'available',
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT,
    CONSTRAINT future_event_date CHECK (event_date > NOW()),
    CONSTRAINT title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 100)
);

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create tickets policies
CREATE POLICY "Tickets are viewable by everyone" ON tickets
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own tickets" ON tickets
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own available tickets" ON tickets
    FOR UPDATE USING (
        auth.uid() = seller_id 
        AND status = 'available'
    );

CREATE POLICY "Sellers can cancel their own available tickets" ON tickets
    FOR UPDATE USING (
        auth.uid() = seller_id 
        AND status = 'available'
    ) WITH CHECK (
        status = 'cancelled'
    );

-- Create function to handle ticket purchases
CREATE OR REPLACE FUNCTION purchase_ticket(ticket_id UUID)
RETURNS tickets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ticket_record tickets;
BEGIN
    -- Get ticket and lock it for update
    SELECT * INTO ticket_record
    FROM tickets
    WHERE id = ticket_id
    AND status = 'available'
    FOR UPDATE;

    -- Check if ticket exists and is available
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket not found or not available';
    END IF;

    -- Update ticket status and buyer
    UPDATE tickets
    SET 
        status = 'sold',
        buyer_id = auth.uid()
    WHERE id = ticket_id
    RETURNING * INTO ticket_record;

    RETURN ticket_record;
END;
$$;

-- Create indexes for better performance
CREATE INDEX tickets_status_idx ON tickets(status);
CREATE INDEX tickets_event_date_idx ON tickets(event_date);
CREATE INDEX tickets_seller_id_idx ON tickets(seller_id);
CREATE INDEX tickets_buyer_id_idx ON tickets(buyer_id);

-- Function to automatically create a profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, email)
    VALUES (
        new.id,
        LOWER(SPLIT_PART(new.email, '@', 1)), -- Use email prefix as username
        COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)), -- Use metadata or fallback
        new.email
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 