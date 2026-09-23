"""Allowlisted Firebase client configuration for CommandGlows Windows."""

import argparse
import json
import os
import sys


def resolve(target, environ, environment="dev"):
    if target != "windows":
        raise ValueError("This recipe currently configures Windows only.")
    names = (
        "FIREBASE_PROJECT_ID", "FIREBASE_API_KEY", "FIREBASE_APP_ID",
        "FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_AUTH_DOMAIN",
        "FIREBASE_STORAGE_BUCKET",
    )
    values = {name: environ.get(name, "").strip() for name in names}
    missing = [name for name in names if not values[name] and name != "FIREBASE_STORAGE_BUCKET"]
    if missing:
        raise ValueError("Missing configuration: " + ", ".join(missing))
    expected = {
        "dev": ("commandglows-dev", "1:9805404731:web:e4500a345100d1a98a1a1e", "9805404731"),
        "prd": ("commandglows", "1:97562299584:web:979a75b79eef72fef17125", "97562299584"),
    }
    if environment not in expected:
        raise ValueError("Unknown environment.")
    project, app, sender = expected[environment]
    if (values["FIREBASE_PROJECT_ID"] != project
            or values["FIREBASE_APP_ID"] != app
            or values["FIREBASE_MESSAGING_SENDER_ID"] != sender
            or values["FIREBASE_AUTH_DOMAIN"] != project + ".firebaseapp.com"):
        raise ValueError("Firebase configuration does not match the selected environment.")
    return {
        "schemaVersion": "shipglows.flutter-configuration.v1",
        "dartDefines": values,
        "environment": {},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--configuration-json", action="store_true", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--environment", choices=("dev", "prd"), default="dev")
    args = parser.parse_args()
    try:
        print(json.dumps(resolve(args.target, os.environ, args.environment)))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
