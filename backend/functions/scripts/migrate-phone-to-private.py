#!/usr/bin/env python3
"""
Move member telephone numbers from users/{uid}.phone to users/{uid}/private/contact.

Usage (dry run is the default; nothing is written):
  python3 migrate-phone-to-private.py --project christian-match-ghana
  python3 migrate-phone-to-private.py --project christian-match-ghana --apply

Auth: uses the active gcloud account (gcloud auth print-access-token). The account needs
Firestore read/write on the target project. Run a Firestore export before --apply on Production.

Idempotent: documents without a users.phone field are skipped, so re-running is safe.
"""
import argparse
import datetime
import json
import subprocess
import sys
import urllib.request

BATCH_SIZE = 200  # Each member uses up to 2 writes; Firestore commits are limited to 500 writes.


def access_token() -> str:
    return subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()


def api(method: str, url: str, token: str, project: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Content-Type", "application/json")
    request.add_header("x-goog-user-project", project)
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode() or "null")


def members_with_phone(project: str, token: str):
    """Yield (uid, phone) for every profile that still has a phone field, including blank ones."""
    url = f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents:runQuery"
    body = {"structuredQuery": {"from": [{"collectionId": "users"}],
                                "select": {"fields": [{"fieldPath": "phone"}]}}}
    for row in api("POST", url, token, project, body):
        document = row.get("document")
        if not document or "phone" not in document.get("fields", {}):
            continue
        phone = document["fields"]["phone"].get("stringValue", "").strip()
        yield document["name"].rsplit("/", 1)[-1], phone


def commit(project: str, token: str, writes: list) -> None:
    url = f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents:commit"
    api("POST", url, token, project, {"writes": writes})


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--apply", action="store_true", help="Write changes. Without this flag nothing is changed.")
    args = parser.parse_args()

    token = access_token()
    base = f"projects/{args.project}/databases/(default)/documents"
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    members = list(members_with_phone(args.project, token))
    print(f"Members with a telephone on the public profile: {len(members)}")
    if not args.apply:
        print("Dry run only. Re-run with --apply to move the numbers.")
        return 0

    moved = 0
    for start in range(0, len(members), BATCH_SIZE):
        writes = []
        for uid, phone in members[start:start + BATCH_SIZE]:
            if phone:
                writes.append({"update": {"name": f"{base}/users/{uid}/private/contact",
                                          "fields": {"phone": {"stringValue": phone},
                                                     "updatedAt": {"timestampValue": now}}}})
            # Always remove the public field, including blank values.
            writes.append({"update": {"name": f"{base}/users/{uid}", "fields": {}},
                           "updateMask": {"fieldPaths": ["phone"]}})
        commit(args.project, token, writes)
        moved += len(writes) // 2
        print(f"Processed {moved}/{len(members)}")

    print("Done. Verify a sample member: users/{uid}/private/contact exists and users/{uid} has no phone field.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
