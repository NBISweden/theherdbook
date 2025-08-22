# Certificate Regeneration After S3 Bucket Deletion

This guide explains how to regenerate all certificates after your S3 bucket was accidentally deleted.

## Problem

When your S3 vendor accidentally deleted your S3 bucket, all certificate PDF files were lost. However, the database still contains the digital certificate numbers for all individuals. This script will regenerate all certificates and upload them to the new S3 bucket.

## Solution

We've created a script that will:

1. Find all individuals with digital certificates in the database
2. Generate new certificates for each one using the existing certificate generation logic
3. Upload them to S3
4. Log the entire process

## How to Run

### Option 1: Run from within the Docker container (Recommended)

1. Make sure your Docker containers are running:

   ```bash
   docker-compose up -d
   ```

2. Execute the script inside the container:
   ```bash
   docker exec -it herdbook-main python3 /app/regenerate_certificates.py
   ```

### Option 2: Run the shell script

1. Make sure your Docker containers are running:

   ```bash
   docker-compose up -d
   ```

2. Run the shell script:
   ```bash
   ./scripts/regenerate_certificates.sh
   ```

### Option 3: Run directly from inside the container

1. Access the container shell:

   ```bash
   docker exec -it herdbook-main bash
   ```

2. Run the script:
   ```bash
   cd /app
   python3 regenerate_certificates.py
   ```

### Option 4: Test user selection first

If you want to test the user selection logic before running the full regeneration:

```bash
docker exec -it herdbook-main python3 /app/test_user_selection.py
```

This will show you which users will be selected for each herd without actually regenerating certificates.

### Option 5: Test with limited individuals

You can test the script with just a few individuals:

```bash
# Test with just 1 rabbit
docker exec -it herdbook-main python3 /app/regenerate_certificates.py --limit 1

# Test with 5 rabbits
docker exec -it herdbook-main python3 /app/regenerate_certificates.py --limit 5

# Test user selection with just 3 rabbits
docker exec -it herdbook-main python3 /app/test_user_selection.py --limit 3
```

### Option 6: Dry run mode

You can see what the script would do without actually doing it:

```bash
# Dry run with all rabbits
docker exec -it herdbook-main python3 /app/regenerate_certificates.py --dry-run

# Dry run with just 2 rabbits
docker exec -it herdbook-main python3 /app/regenerate_certificates.py --limit 2 --dry-run
```

## What the Script Does

1. **Database Connection**: Connects to the PostgreSQL database
2. **Find Individuals**: Queries for all individuals with `digital_certificate` numbers
3. **User Selection**: For each individual, finds the owner of the origin herd who originally issued the certificate
4. **Multiple Owners**: If a herd has multiple owners, prompts you to select which one to use
5. **Check S3**: For each individual, checks if a certificate already exists in S3
6. **Generate Certificates**: For missing certificates, generates new PDFs using the existing certificate generation logic
7. **Sign Certificates**: Signs the PDFs with the digital signature
8. **Upload to S3**: Uploads the signed certificates to S3
9. **Logging**: Logs all operations to both console and file

## Logging

The script creates a log file at `./logs/certificate_regeneration.log` (mounted to `/logs/certificate_regeneration.log` in the container). You can view it with:

```bash
# From the host
cat logs/certificate_regeneration.log

# Or from inside the container
docker exec -it herdbook-main cat /logs/certificate_regeneration.log
```

## Expected Output

The script will show progress like:

```
2025-08-22 14:30:00 - INFO - Starting certificate regeneration process
2025-08-22 14:30:01 - INFO - Database connection established
2025-08-22 14:30:01 - INFO - Found 150 individuals with digital certificates
2025-08-22 14:30:01 - INFO - Using single owner for herd 1: John Doe
2025-08-22 14:30:01 - INFO - Processing 1/150: G1274-2411
2025-08-22 14:30:02 - INFO - Successfully regenerated certificate for G1274-2411
...
2025-08-22 14:35:00 - INFO - Certificate regeneration completed:
2025-08-22 14:35:00 - INFO -   Total individuals: 150
2025-08-22 14:35:00 - INFO -   Successful: 150
2025-08-22 14:35:00 - INFO -   Failed: 0
2025-08-22 14:35:00 - INFO - All certificates regenerated successfully
```

### Multiple Owners Example

If a herd has multiple owners, you'll see:

```
Multiple owners found for herd 5 (Test Herd):
  1. John Doe (john@example.com)
  2. Jane Smith (jane@example.com)
Select owner (1-2): 1
2025-08-22 14:30:01 - INFO - Selected owner for herd 5: John Doe
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Make sure the database container is running
   - Check that environment variables are set correctly

2. **S3 Upload Failed**

   - Verify S3 credentials and bucket configuration
   - Check that the new S3 bucket exists and is accessible

3. **Certificate Generation Failed**
   - Check that certificate templates and keys are available
   - Verify that individual data is complete

### Error Messages

- `"Individual not found"`: The individual data is missing or corrupted
- `"Certificate already exists"`: The certificate was already regenerated
- `"S3 upload failed"`: Network or credential issues with S3

## Verification

After running the script, you can verify that certificates were regenerated by:

1. Checking the web interface for a few individuals
2. Verifying that certificate downloads work
3. Checking the S3 bucket for uploaded files

## Files Created

- `app/regenerate_certificates.py`: Main regeneration script
- `scripts/regenerate_certificates.sh`: Shell script wrapper
- `scripts/run_certificate_regeneration.sh`: Simple container script
- `test_user_selection.py`: Test script to verify user selection logic
- `logs/certificate_regeneration.log`: Log file (created during execution)

## Notes

- The script is idempotent - it can be run multiple times safely
- It will skip individuals whose certificates already exist in S3
- The process may take several minutes depending on the number of certificates
- All operations are logged for audit purposes
