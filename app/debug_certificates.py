#!/usr/bin/env python3
"""
Debug script to test certificate regeneration step by step.
"""

import sys
import os

# Change to the code directory where utils is located
os.chdir('/code')

import utils.database as db
import utils.settings as settings

def debug_steps():
    print("=== Certificate Regeneration Debug ===")
    
    # Step 1: Test database connection
    print("\n1. Testing database connection...")
    try:
        db.connect()
        print("✓ Database connected successfully")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return
    
    # Step 2: Test settings
    print("\n2. Testing settings...")
    try:
        print(f"Log folder: {settings.service.logfolder}")
        print(f"S3 bucket: {settings.s3.bucket}")
        print("✓ Settings loaded successfully")
    except Exception as e:
        print(f"✗ Settings failed: {e}")
        return
    
    # Step 3: Test individual query
    print("\n3. Testing individual query...")
    try:
        individuals = (
            db.Individual
            .select()
            .where(db.Individual.digital_certificate.is_null(False))
            .order_by(db.Individual.number)
        )
        count = len(list(individuals))
        print(f"✓ Found {count} individuals with digital certificates")
        
        if count > 0:
            # Show first few individuals
            individuals = (
                db.Individual
                .select()
                .where(db.Individual.digital_certificate.is_null(False))
                .order_by(db.Individual.number)
                .limit(3)
            )
            for i, ind in enumerate(individuals, 1):
                print(f"  {i}. {ind.number} (cert: {ind.digital_certificate}) - Herd: {ind.origin_herd.herd}")
    except Exception as e:
        print(f"✗ Individual query failed: {e}")
        return
    
    # Step 4: Test user query
    print("\n4. Testing user query...")
    try:
        users = db.User.select()
        user_count = len(list(users))
        print(f"✓ Found {user_count} users")
        
        if user_count > 0:
            first_user = db.User.select().first()
            print(f"  First user: {first_user.fullname or first_user.username} ({first_user.email})")
    except Exception as e:
        print(f"✗ User query failed: {e}")
        return
    
    print("\n=== Debug completed ===")

if __name__ == "__main__":
    debug_steps()
