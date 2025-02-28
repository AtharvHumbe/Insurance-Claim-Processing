/*
  # Initial Schema Setup for MedClaim AI

  1. New Tables
    - profiles
      - id (uuid, references auth.users)
      - full_name (text)
      - updated_at (timestamp)
    - claims
      - id (uuid)
      - user_id (uuid, references auth.users)
      - patient_name (text)
      - diagnosis (text)
      - treatment (text)
      - cost (numeric)
      - status (text)
      - document_url (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    - insurance_policies
      - id (uuid)
      - user_id (uuid, references auth.users)
      - policy_number (text)
      - provider (text)
      - coverage_amount (numeric)
      - valid_until (date)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create claims table
CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  patient_name text NOT NULL,
  diagnosis text,
  treatment text,
  cost numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  document_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" 
  ON claims FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims" 
  ON claims FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claims" 
  ON claims FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create insurance_policies table
CREATE TABLE insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  policy_number text NOT NULL,
  provider text NOT NULL,
  coverage_amount numeric NOT NULL,
  valid_until date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insurance policies" 
  ON insurance_policies FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insurance policies" 
  ON insurance_policies FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();