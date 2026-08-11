#!/usr/bin/env python3
"""
D&A Engine Pipeline Script
Tích hợp hệ thống tính toán độ chính xác cao với cơ chế bảo mật và đánh giá.
"""

import os
import csv
import json
import hashlib
import hmac
from datetime import datetime, timezone
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import mpmath as mp

# Thiết lập precision cao
mp.mp.dps = 60  # Decimal places, buffer cho 50 digits output


class DAEngine:

    def __init__(self):
        self.setup_environment()
        self.load_security_keys()

    def setup_environment(self):
        """Thiết lập môi trường precision và security"""
        print("🚀 Thiết lập môi trường D&A Engine...")

        # Precision Context
        self.decimal_context = mp.mp

        # Security Injection
        self.alpha_prime_omega = os.getenv('ALPHA_PRIME_OMEGA', '4F8E9C...E9F2')  # Chain-Key
        self.dae_secret_key = os.getenv('DAE_SECRET_KEY', 'Your_Secret_HMAC_Key_Here')
        self.system_identity = os.getenv('SYSTEM_IDENTITY', 'DAE_CORE_V1')
        self.owner_id = os.getenv('OWNER_ID', 'ALPHA_PRIME_OMEGA_FATHER')
        self.private_key_path = os.getenv('VERIFIER_PRIVATE_KEY_PATH', 'private_key.pem')

        print("✅ Môi trường đã thiết lập.")
        print(f" Đã nạp định danh: {self.system_identity} thuộc về {self.owner_id}")

    def load_security_keys(self):
        """Tải khóa bảo mật"""
        try:
            with open(self.private_key_path, 'rb') as f:
                self.private_key = serialization.load_pem_private_key(
                    f.read(),
                    password=None
                )
            print("✅ Khóa bảo mật đã tải.")
        except FileNotFoundError:
            print("❌ Lỗi: Không tìm thấy file private key. Kích hoạt fail-safe.")
            raise SystemExit("Hệ thống ngắt để ngăn chặn dữ liệu không ký.")

    def compute_fx(self, x):
        """Tính F(x) = sin(x) với độ chính xác cao"""
        return mp.sin(x)

    def validate_results(self, results, gold_standard):
        """Kiểm thử với Gold Standard"""
        epsilon = mp.mpf('1e-30')
        passed = 0
        total = len(results)

        for i, (x, computed) in enumerate(results):
            target = gold_standard[i]
            delta = abs(computed - target)
            if delta <= epsilon:
                passed += 1
                status = "PASS"
            else:
                status = "FAIL"
            print(f"Test {i+1}: x={x}, Delta={delta}, Status={status}")

        impact_score = passed / total
        return impact_score, passed, total

    def generate_signature(self, data):
        """Tạo chữ ký cryptographic"""
        data_str = json.dumps(data, sort_keys=True)
        data_bytes = data_str.encode('utf-8')

        signature = self.private_key.sign(
            data_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        return signature.hex()

    def generate_hmac(self, data):
        """Tạo HMAC signature"""
        data_str = json.dumps(data, sort_keys=True)
        data_bytes = data_str.encode('utf-8')
        key_bytes = self.dae_secret_key.encode('utf-8')

        hmac_signature = hmac.new(key_bytes, data_bytes, hashlib.sha256).hexdigest()
        return hmac_signature

    def compare_signatures(self, rsa_sig, hmac_sig):
        """So sánh RSA và HMAC signatures"""
        print(f"RSA Signature: {rsa_sig[:32]}...")
        print(f"HMAC Signature: {hmac_sig[:32]}...")
        print("✅ Cả hai signatures đã được tạo thành công.")

    def run_pipeline(self):
        """Chạy pipeline hoàn chỉnh"""
        print("⚙️ Khởi động D&A Engine Pipeline...")

        # Điểm dữ liệu mẫu trong khoảng [π/6, 2π]
        test_points = [
            mp.pi / 6,
            mp.pi / 4,
            mp.pi / 2,
            mp.pi,
            3 * mp.pi / 2,
            2 * mp.pi
        ]

        # Gold Standard (giả lập)
        gold_standard = [
            mp.sin(p) for p in test_points
        ]

        # Thực thi tính toán
        results = [(x, self.compute_fx(x)) for x in test_points]

        # Kiểm thử
        impact_score, passed, total = self.validate_results(results, gold_standard)

        # Chuẩn bị dữ liệu cho ký
        timestamp = datetime.now(timezone.utc).isoformat() + 'Z'
        csv_checksum = hashlib.sha256(
            json.dumps([(str(x), str(y)) for x, y in results]).encode()
        ).hexdigest()

        data_to_sign = {
            'csv_checksum': csv_checksum,
            'timestamp': timestamp,
            'chain_key': self.alpha_prime_omega
        }

        # Tạo License_ID
        license_id = self.generate_signature(data_to_sign)

        # Tạo HMAC signature
        hmac_signature = self.generate_hmac(data_to_sign)

        # So sánh signatures
        self.compare_signatures(license_id, hmac_signature)

        # Xuất artifacts
        self.export_artifacts(results, license_id, impact_score, timestamp, hmac_signature)

        print(f"🎯 Pipeline hoàn thành. Impact Score: {impact_score:.2f}")

    def export_artifacts(self, results, license_id, impact_score, timestamp, hmac_signature):
    
        # data_output.csv
        with open('data_output.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['x', 'sin(x)'])
            for x, y in results:

        # license.txt
        with open('license.txt', 'w') as f:
            f.write(f"License_ID (RSA): {license_id}\n")
            f.write(f"HMAC_Signature: {hmac_signature}\n")
            f.write(f"Timestamp: {timestamp}\n")
            f.write(f"System_Identity: {self.system_identity}\n")
            f.write(f"Owner_ID: {self.owner_id}\n")

        # report.html (đơn giản)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>D&A Engine Report</title>
        </head>
        <body>
            <h1>Báo cáo D&A Engine</h1>
            <p>Impact Score: {impact_score:.2f}</p>
            <p>Timestamp: {timestamp}</p>
            <p>System Identity: {self.system_identity}</p>
            <p>Owner ID: {self.owner_id}</p>
            <p>RSA Signature (first 32 chars): {license_id[:32]}...</p>
            <p>HMAC Signature (first 32 chars): {hmac_signature[:32]}...</p>
        </body>
        </html>
        """
        with open('report.html', 'w') as f:
            f.write(html_content)

        print("📦 Artifacts đã xuất: data_output.csv, license.txt, report.html")


if __name__ == "__main__":
    engine = DAEngine()
    engine.run_pipeline()
