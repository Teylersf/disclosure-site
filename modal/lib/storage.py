"""
Linode Object Storage S3 client wrapper. All writes are under the `satellite/`
prefix, and we never overwrite identical bytes (skip if same size, same etag).
"""
from __future__ import annotations
import hashlib
import os
from dataclasses import dataclass
from typing import Optional

import boto3
from botocore.client import Config


@dataclass
class Storage:
    endpoint: str
    region: str
    bucket: str
    access_key: str
    secret_key: str

    @classmethod
    def from_env(cls) -> "Storage":
        return cls(
            endpoint=os.environ["LINODE_ENDPOINT"],
            region=os.environ["LINODE_REGION"],
            bucket=os.environ["LINODE_BUCKET"],
            access_key=os.environ["LINODE_ACCESS_KEY"],
            secret_key=os.environ["LINODE_SECRET_KEY"],
        )

    def client(self):
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version="s3v4"),
        )

    def remote_size(self, key: str) -> Optional[int]:
        try:
            r = self.client().head_object(Bucket=self.bucket, Key=key)
            return r["ContentLength"]
        except Exception:
            return None

    def put(self, key: str, body: bytes, content_type: str = "application/octet-stream",
            cache_control: str = "public, max-age=86400") -> dict:
        """Upload bytes under `satellite/<key>` with public-read ACL."""
        full_key = f"satellite/{key.lstrip('/')}"
        existing = self.remote_size(full_key)
        if existing is not None and existing == len(body):
            return {"ok": True, "skipped": True, "key": full_key, "size": len(body)}
        self.client().put_object(
            Bucket=self.bucket,
            Key=full_key,
            Body=body,
            ContentType=content_type,
            ACL="public-read",
            CacheControl=cache_control,
        )
        return {"ok": True, "skipped": False, "key": full_key, "size": len(body)}

    def public_url(self, key: str) -> str:
        # Linode bucket: https://<bucket>.<region>.linodeobjects.com/<key>
        # Or path-style endpoint URL + key
        base = os.environ.get("NEXT_PUBLIC_ASSET_BASE_URL") or f"{self.endpoint}/{self.bucket}"
        return f"{base.rstrip('/')}/satellite/{key.lstrip('/')}"


def sha1(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()
