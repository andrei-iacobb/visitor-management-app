#!/bin/bash

# Certificate Generation Script for Visitor Management App
# This creates self-signed certificates for internal network use with mTLS

set -e  # Exit on error

# Create certs directory
CERTS_DIR="../certs"
mkdir -p "$CERTS_DIR"
cd "$CERTS_DIR"

echo "📜 Generating self-signed certificates for mTLS..."
echo ""

# 1. Generate CA (Certificate Authority) private key
echo "1️⃣  Generating CA private key..."
openssl genrsa -out ca-key.pem 4096

# 2. Generate CA certificate (valid for 10 years)
echo "2️⃣  Generating CA certificate..."
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem \
  -subj "/C=US/ST=State/L=City/O=VisitorManagement/OU=IT/CN=VisitorManagement-CA"

echo "   ✅ CA certificate created (valid for 10 years)"
echo ""

# 3. Generate Server private key
echo "3️⃣  Generating server private key..."
openssl genrsa -out server-key.pem 4096

# 4. Generate Server Certificate Signing Request (CSR)
echo "4️⃣  Generating server CSR..."
openssl req -new -key server-key.pem -out server-csr.pem \
  -subj "/C=US/ST=State/L=City/O=VisitorManagement/OU=Backend/CN=visitor-management-server"

# 5. Sign Server certificate with CA (valid for 5 years)
echo "5️⃣  Signing server certificate with CA..."
openssl x509 -req -days 1825 -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem

echo "   ✅ Server certificate created (valid for 5 years)"
echo ""

# 6. Generate Client private key
echo "6️⃣  Generating client private key..."
openssl genrsa -out client-key.pem 4096

# 7. Generate Client Certificate Signing Request (CSR)
echo "7️⃣  Generating client CSR..."
openssl req -new -key client-key.pem -out client-csr.pem \
  -subj "/C=US/ST=State/L=City/O=VisitorManagement/OU=AndroidApp/CN=visitor-management-client"

# 8. Sign Client certificate with CA (valid for 5 years)
echo "8️⃣  Signing client certificate with CA..."
openssl x509 -req -days 1825 -in client-csr.pem -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out client-cert.pem

echo "   ✅ Client certificate created (valid for 5 years)"
echo ""

# 9. Create PKCS12 bundle for Android (includes client cert + key)
echo "9️⃣  Creating PKCS12 bundle for Android..."
openssl pkcs12 -export -out client.p12 -inkey client-key.pem -in client-cert.pem \
  -certfile ca-cert.pem -passout pass:visitor123

echo "   ✅ PKCS12 bundle created (password: visitor123)"
echo ""

# 10. Verify certificates
echo "🔍 Verifying certificates..."
openssl verify -CAfile ca-cert.pem server-cert.pem
openssl verify -CAfile ca-cert.pem client-cert.pem

# 11. Clean up CSR files (no longer needed)
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f server-csr.pem client-csr.pem ca-cert.srl

# 12. Set proper permissions
echo "🔒 Setting secure file permissions..."
chmod 600 *.pem *.p12
chmod 644 ca-cert.pem  # CA cert can be readable

echo ""
echo "✅ Certificate generation complete!"
echo ""
echo "📁 Generated files in $CERTS_DIR:"
echo "   - ca-cert.pem         (CA certificate - trust this on clients)"
echo "   - ca-key.pem          (CA private key - KEEP SECURE)"
echo "   - server-cert.pem     (Server certificate)"
echo "   - server-key.pem      (Server private key)"
echo "   - client-cert.pem     (Client certificate)"
echo "   - client-key.pem      (Client private key)"
echo "   - client.p12          (Android PKCS12 bundle, password: visitor123)"
echo ""
echo "⚠️  SECURITY NOTES:"
echo "   1. Keep ca-key.pem and *-key.pem files SECURE and NEVER commit to git"
echo "   2. The certs/ directory is in .gitignore"
echo "   3. For production, store these in a secure vault"
echo "   4. Copy client.p12 to android/app/src/main/res/raw/ for Android app"
echo "   5. Password for client.p12 is 'visitor123' (change in production)"
echo ""
