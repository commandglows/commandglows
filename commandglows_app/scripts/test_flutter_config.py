import unittest

from flutter_config import resolve


class WindowsConfigurationTest(unittest.TestCase):
    def setUp(self):
        self.env = {
            "FIREBASE_PROJECT_ID": "commandglows-dev",
            "FIREBASE_API_KEY": "public-test-key",
            "FIREBASE_APP_ID": "1:9805404731:web:e4500a345100d1a98a1a1e",
            "FIREBASE_MESSAGING_SENDER_ID": "9805404731",
            "FIREBASE_AUTH_DOMAIN": "commandglows-dev.firebaseapp.com",
            "FIREBASE_STORAGE_BUCKET": "",
            "REPLAYGLOWS_PRODUCT_JWT_PRIVATE_KEY_PEM": "must-not-be-forwarded",
        }

    def test_only_public_client_configuration_is_forwarded(self):
        result = resolve("windows", self.env)
        self.assertEqual(len(result["dartDefines"]), 6)
        self.assertNotIn("REPLAYGLOWS_PRODUCT_JWT_PRIVATE_KEY_PEM", result["dartDefines"])
        self.assertEqual(result["environment"], {})

    def test_missing_configuration_fails(self):
        del self.env["FIREBASE_API_KEY"]
        with self.assertRaises(ValueError):
            resolve("windows", self.env)

    def test_wrong_project_fails(self):
        self.env["FIREBASE_PROJECT_ID"] = "other-project"
        with self.assertRaises(ValueError):
            resolve("windows", self.env)

    def test_other_targets_require_their_own_configuration(self):
        for target in ("web", "android"):
            with self.assertRaises(ValueError):
                resolve(target, self.env)

    def test_production_cannot_use_development_configuration(self):
        with self.assertRaises(ValueError):
            resolve("windows", self.env, "prd")

    def test_production_configuration(self):
        self.env.update({
            "FIREBASE_PROJECT_ID": "commandglows",
            "FIREBASE_APP_ID": "1:97562299584:web:979a75b79eef72fef17125",
            "FIREBASE_MESSAGING_SENDER_ID": "97562299584",
            "FIREBASE_AUTH_DOMAIN": "commandglows.firebaseapp.com",
        })
        self.assertEqual(resolve("windows", self.env, "prd")["dartDefines"]["FIREBASE_PROJECT_ID"], "commandglows")
        with self.assertRaises(ValueError):
            resolve("windows", self.env)


if __name__ == "__main__":
    unittest.main()
